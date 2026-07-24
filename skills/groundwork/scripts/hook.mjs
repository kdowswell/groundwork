#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook: run the groundwork detector on the file that
 * was just edited and surface findings back into the agent's context.
 *
 * Reads the hook event JSON from stdin, resolves the detector engine from the
 * installed skill (scripts/engine/, embedded by `groundwork install`) or from
 * the repo layout (cli/engine/), scans only the edited file, and emits
 * additionalContext when there are findings. Always exits 0 — a broken hook
 * must never block the agent.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

async function loadEngine() {
  const candidates = [
    join(SCRIPT_DIR, "engine", "detect.mjs"), // installed layout (embedded engine)
    resolve(SCRIPT_DIR, "../../../cli/engine/detect.mjs"), // repo layout
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return import(pathToFileURL(candidate).href);
  }
  return null;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function output(context) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: context,
      },
    }),
  );
}

try {
  const engine = await loadEngine();
  if (engine) {
    const event = JSON.parse(await readStdin());
    const filePath = event?.tool_input?.file_path;
    if (filePath && existsSync(filePath)) {
      const { findings } = engine.detect(filePath, {
        configRoot: event?.cwd ?? process.cwd(),
      });
      const material = findings.filter((f) => f.severity !== "info");
      if (material.length > 0) {
        const lines = material
          .slice(0, 8)
          .map(
            (f) =>
              `- [${f.severity}] ${f.rule} at ${f.file}:${f.line ?? "?"} — ${f.message} (principle: ${f.principle})`,
          );
        output(
          `groundwork detector found ${material.length} issue(s) in the file you just edited:\n` +
            `${lines.join("\n")}\n` +
            "Fix what is real; waive intentional cases with 'groundwork-disable <rule-id>: reason'.",
        );
      }
    }
  }
} catch {
  // Never surface hook failures into the agent flow.
}
process.exit(0);
