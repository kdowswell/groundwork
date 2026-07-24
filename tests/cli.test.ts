import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { doctor } from "../cli/commands/doctor.mjs";
import { install } from "../cli/commands/install.mjs";

const ROOT = resolve(__dirname, "..");
const BIN = join(ROOT, "cli/bin/groundwork.mjs");
const BEFORE = join(ROOT, "examples/case-study/before");
const AFTER = join(ROOT, "examples/case-study/after");

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-cli-"));
  tempDirs.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function runCli(args: string[], opts: { cwd?: string } = {}) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      cwd: opts.cwd ?? ROOT,
      encoding: "utf8",
    });
    return { status: 0, stdout };
  } catch (err: any) {
    return { status: err.status as number, stdout: String(err.stdout ?? "") };
  }
}

describe("groundwork detect (CLI)", () => {
  it("exits 1 with JSON findings on the slop fixture", () => {
    const { status, stdout } = runCli(["detect", "--json", BEFORE]);
    expect(status).toBe(1);
    const report = JSON.parse(stdout);
    expect(report.version).toBe(1);
    expect(report.counts.error).toBeGreaterThan(0);
    expect(report.findings.length).toBeGreaterThan(10);
  });

  it("exits 0 on the corrected fixture", () => {
    const { status, stdout } = runCli(["detect", "--json", AFTER]);
    expect(status).toBe(0);
    expect(JSON.parse(stdout).findings).toEqual([]);
  });

  it("prints human output with principle attribution", () => {
    const { stdout } = runCli(["detect", BEFORE]);
    expect(stdout).toContain("principle: secrets-management");
    expect(stdout).toContain("groundwork-disable");
  });

  it("fails on unknown commands with help", () => {
    const { status } = runCli(["bogus"]);
    expect(status).toBe(2);
  });
});

describe("groundwork doctor", () => {
  it("errors when context is missing", () => {
    const dir = tempDir();
    const result = doctor(dir);
    expect(result.findings.map((f: any) => f.check)).toContain("context-missing");
  });

  it("flags stale dates, empty principles, unknown ids, and stack drift", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".groundwork"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork", "context.md"),
      [
        "# Project Context — test",
        "## Stack",
        "- Languages: COBOL",
        "## Stage",
        "- Current stage: build",
        "- Last reviewed: 2020-01-01",
        "## Active Principles",
        "- not-a-real-principle — because",
      ].join("\n"),
    );
    writeFileSync(join(dir, "package.json"), "{}");
    const checks = doctor(dir).findings.map((f: any) => f.check);
    expect(checks).toContain("context-stale");
    expect(checks).toContain("unknown-principle");
    expect(checks).toContain("stack-drift");
  });

  it("passes a fresh, consistent context", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".groundwork"), { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(
      join(dir, ".groundwork", "context.md"),
      [
        "# Project Context — test",
        "## Stack",
        "- Languages: TypeScript (Node)",
        "## Stage",
        `- Last reviewed: ${today}`,
        "## Active Principles",
        "- testing-strategy — we ship a library",
      ].join("\n"),
    );
    writeFileSync(join(dir, "package.json"), "{}");
    expect(doctor(dir).findings).toEqual([]);
  });

  it("exits 1 via the CLI when findings exist", () => {
    const dir = tempDir();
    const { status, stdout } = runCli(["doctor", "--json", dir]);
    expect(status).toBe(1);
    expect(JSON.parse(stdout).findings.length).toBeGreaterThan(0);
  });
});

describe("groundwork install", () => {
  it("installs the router skill with an embedded engine", () => {
    const dir = tempDir();
    const result = install({ projectRoot: dir, providers: ["claude"] });
    expect(result.summary[0].count).toBe(1);
    const skillDir = join(dir, ".claude/skills/groundwork");
    expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillDir, "reference/plan.md"))).toBe(true);
    expect(existsSync(join(skillDir, "reference/init.md"))).toBe(true);
    expect(existsSync(join(skillDir, "scripts/context.mjs"))).toBe(true);
    expect(existsSync(join(skillDir, "scripts/engine/detect.mjs"))).toBe(true);
    expect(existsSync(join(skillDir, "scripts/data/principles.json"))).toBe(true);
  });

  it("installs standalone skills with --all-skills across providers", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".github"));
    const result = install({ projectRoot: dir, allSkills: true });
    expect(result.providers).toEqual(["github"]);
    expect(result.summary[0].count).toBe(16);
    expect(existsSync(join(dir, ".github/skills/brownfield-safe-change-plan/SKILL.md"))).toBe(true);
  });

  it("auto-detects providers and rejects unknown ones", () => {
    const dir = tempDir();
    expect(install({ projectRoot: dir }).providers).toEqual(["claude"]);
    expect(() => install({ projectRoot: dir, providers: ["vim"] })).toThrow(/unknown provider/);
  });

  it("installs the Claude hook idempotently and preserves existing settings", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      join(dir, ".claude/settings.local.json"),
      JSON.stringify({ permissions: { allow: ["Bash(ls)"] } }),
    );
    install({ projectRoot: dir, providers: ["claude"], hooks: true });
    install({ projectRoot: dir, providers: ["claude"], hooks: true });
    const settings = JSON.parse(readFileSync(join(dir, ".claude/settings.local.json"), "utf8"));
    expect(settings.permissions.allow).toEqual(["Bash(ls)"]);
    expect(settings.hooks.PostToolUse).toHaveLength(1);
    expect(JSON.stringify(settings.hooks.PostToolUse[0])).toContain("hook.mjs");
  });
});

describe("context loader (skill script)", () => {
  const LOADER = join(ROOT, "skills/groundwork/scripts/context.mjs");

  it("reports CONTEXT_MISSING outside a project", () => {
    const dir = tempDir();
    const stdout = execFileSync(process.execPath, [LOADER], { cwd: dir, encoding: "utf8" });
    expect(stdout).toContain("CONTEXT_MISSING");
  });

  it("prints the context with directives when present", () => {
    const stdout = execFileSync(process.execPath, [LOADER], { cwd: ROOT, encoding: "utf8" });
    expect(stdout).toContain("CONTEXT_OK");
    expect(stdout).toContain("---BEGIN PROJECT CONTEXT---");
    expect(stdout).toContain("Project Context — groundwork");
  });
});

describe("hook script", () => {
  const HOOK = join(ROOT, "skills/groundwork/scripts/hook.mjs");

  it("emits additionalContext for a file with findings and exits 0", () => {
    const event = JSON.stringify({
      tool_input: { file_path: join(BEFORE, "server.js") },
      cwd: BEFORE,
    });
    const stdout = execFileSync(process.execPath, [HOOK], {
      input: event,
      encoding: "utf8",
    });
    const parsed = JSON.parse(stdout);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("hardcoded-secret");
  });

  it("stays silent on clean files and malformed input", () => {
    const clean = execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_input: { file_path: join(AFTER, "orders.js") } }),
      encoding: "utf8",
    });
    expect(clean).toBe("");
    const garbage = execFileSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" });
    expect(garbage).toBe("");
  });
});
