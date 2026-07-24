/**
 * Behavior-test harness: runs a real (cheap) model against the installed
 * router skill inside a scratch workspace, with a minimal tool loop, and
 * records the tool-call trace so tests can assert on *behavior* — which
 * files the agent loaded and in what order — not output quality.
 *
 * Complements eval/harness.ts (which measures whether a skill improves
 * output quality); this measures whether the agent obeys the skill's rules
 * (the <!-- rule:... --> markers in SKILL.md).
 */
import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — dependency-free ESM CLI, no declarations (ADR-005)
import { install } from "../../cli/commands/install.mjs";

export const BEHAVIOR_MODEL = process.env.BEHAVIOR_MODEL ?? "claude-haiku-4-5-20251001";
const MAX_TURNS = 12;
const SKILL_REL = ".claude/skills/groundwork";

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
}

export interface ScenarioResult {
  trace: ToolCall[];
  finalText: string;
}

/** Load ANTHROPIC_API_KEY from the environment or a local .env file. */
export function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const env = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const match = env.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/** Create a scratch workspace with the router skill installed plus extra files. */
export function createWorkspace(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(path.join(tmpdir(), "groundwork-behavior-"));
  install({ projectRoot: dir, providers: ["claude"] });
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return dir;
}

export function destroyWorkspace(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_files",
    description: "List every file in the workspace (recursive, relative paths).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_file",
    description: "Read a file from the workspace by relative path.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "bash",
    description:
      "Run a shell command in the workspace. This sandbox only permits running the groundwork context loader (node .../context.mjs).",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
      additionalProperties: false,
    },
  },
];

function listFilesRec(root: string, dir = root): string[] {
  const out: string[] = [];
  for (const entry of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      out.push(...listFilesRec(root, abs));
    } else {
      out.push(path.relative(root, abs).split(path.sep).join("/"));
    }
  }
  return out.sort();
}

function executeTool(workspace: string, call: ToolCall): string {
  switch (call.tool) {
    case "list_files":
      return listFilesRec(workspace).join("\n");
    case "read_file": {
      const rel = String(call.input.path ?? "");
      const abs = path.resolve(workspace, rel);
      if (!abs.startsWith(workspace)) return "error: path escapes the workspace";
      if (!existsSync(abs)) return `error: no such file: ${rel}`;
      return readFileSync(abs, "utf8");
    }
    case "bash": {
      const command = String(call.input.command ?? "");
      if (!command.includes("context.mjs")) {
        return "error: this sandbox only permits running the groundwork context loader";
      }
      try {
        return execFileSync("sh", ["-c", command], {
          cwd: workspace,
          encoding: "utf8",
          timeout: 10_000,
        });
      } catch (err) {
        return `error: ${(err as Error).message}`;
      }
    }
    default:
      return `error: unknown tool ${call.tool}`;
  }
}

export async function runScenario(opts: {
  workspace: string;
  userMessage: string;
}): Promise<ScenarioResult> {
  const client = new Anthropic({ apiKey: resolveApiKey() });
  const skillContent = readFileSync(path.join(opts.workspace, SKILL_REL, "SKILL.md"), "utf8");

  const system = [
    "You are an AI coding agent operating inside a user's project workspace.",
    `The user invoked the "groundwork" skill. Its SKILL.md is loaded below; the skill's base directory is ${SKILL_REL}/ inside the workspace, so its reference files are at ${SKILL_REL}/reference/ and its scripts at ${SKILL_REL}/scripts/.`,
    "Follow the skill exactly. Use the tools to read files and run the permitted script. When you have finished, reply with plain text (no tool call).",
    "",
    "--- SKILL.md ---",
    skillContent,
  ].join("\n");

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.userMessage }];
  const trace: ToolCall[] = [];
  let finalText = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: BEHAVIOR_MODEL,
      max_tokens: 1500,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );

    if (toolUses.length === 0) {
      finalText = textBlocks.map((b) => b.text).join("\n");
      break;
    }

    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const call: ToolCall = { tool: use.name, input: use.input as Record<string, unknown> };
      trace.push(call);
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: executeTool(opts.workspace, call).slice(0, 20_000),
      });
    }
    messages.push({ role: "user", content: results });
  }

  return { trace, finalText };
}

/** Index of the first trace entry matching a predicate, or -1. */
export function firstIndex(trace: ToolCall[], predicate: (c: ToolCall) => boolean): number {
  return trace.findIndex(predicate);
}

export function isContextAccess(call: ToolCall): boolean {
  if (call.tool === "bash") return String(call.input.command ?? "").includes("context.mjs");
  if (call.tool === "read_file") return String(call.input.path ?? "").includes(".groundwork/context.md");
  return false;
}

/** Command playbooks read from reference/ (excludes reference/principles/). */
export function playbooksRead(trace: ToolCall[]): string[] {
  return trace
    .filter((c) => c.tool === "read_file")
    .map((c) => String(c.input.path ?? ""))
    .filter((p) => /reference\/[^/]+\.md$/.test(p))
    .map((p) => p.replace(/^.*reference\//, ""));
}
