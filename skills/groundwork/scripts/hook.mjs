#!/usr/bin/env node
/**
 * Claude Code lifecycle hook dispatcher (ADR-006). One script, three events,
 * branched on the event's hook_event_name:
 *
 *   SessionStart  digest of .groundwork/context.md (silent when absent)
 *   PostToolUse   detector scan of the edited file; path appended to a
 *                 per-session ledger in per-user state (0700) (missing event name means PostToolUse)
 *   Stop          deep pass over every file edited this turn; unresolved
 *                 error findings block the stop once, warnings go to the user
 *
 * Resolves the detector engine from the installed skill (scripts/engine/,
 * embedded by `groundwork install`) or from the repo/plugin layout
 * (cli/engine/). Always exits 0 — a broken hook must never block the agent.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analyzeContext, findContextFile } from "./context.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// Per-user state, never the shared temp dir: another local user must not be able
// to pre-create the directory or plant ledgers/symlinks in it.
const LEDGER_DIR =
  process.env.GROUNDWORK_HOOK_STATE_DIR ??
  join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "groundwork", "hooks");
const LEDGER_MAX_AGE_MS = 86_400_000;
const MAX_LISTED = 8;

async function loadEngine() {
  const candidates = [
    join(SCRIPT_DIR, "engine", "detect.mjs"), // installed layout (embedded engine)
    resolve(SCRIPT_DIR, "../../../cli/engine/detect.mjs"), // repo / plugin layout
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

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function additionalContext(hookEventName, context) {
  emit({ hookSpecificOutput: { hookEventName, additionalContext: context } });
}

function formatFinding(f, cwd) {
  const file = f.absPath && cwd ? relative(cwd, f.absPath) || f.file : f.file;
  return `- [${f.severity}] ${f.rule} at ${file}:${f.line ?? "?"} — ${f.message} (principle: ${f.principle})`;
}

/** Session ids come from the harness; keep them filename-safe regardless. */
function ledgerPath(sessionId) {
  if (!sessionId) return null;
  const safe = String(sessionId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  return safe ? join(LEDGER_DIR, `${safe}.log`) : null;
}

function scanFile(engine, absPath, configRoot) {
  const { findings } = engine.detect(absPath, { configRoot });
  return findings.map((f) => ({ ...f, absPath }));
}

// --- SessionStart -----------------------------------------------------------

function pruneLedgers() {
  if (!existsSync(LEDGER_DIR)) return;
  const now = Date.now();
  for (const name of readdirSync(LEDGER_DIR)) {
    const p = join(LEDGER_DIR, name);
    try {
      if (now - statSync(p).mtimeMs > LEDGER_MAX_AGE_MS) unlinkSync(p);
    } catch {
      // Another session may have removed it first.
    }
  }
}

function proposedAdrs(repoRoot) {
  const found = [];
  for (const rel of ["docs/decisions", "docs/adr", "docs/adrs"]) {
    const dir = join(repoRoot, rel);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
      const head = readFileSync(join(dir, name), "utf8").slice(0, 600);
      if (/Status:?\**:?\s*Proposed/i.test(head)) found.push(`${rel}/${name}`);
    }
  }
  return found;
}

/**
 * Approved change plans whose behavior delta hasn't been applied to a spec yet (ADR-012), so the
 * agent remembers, in whatever later session implements the plan, to update the spec in the same
 * change set. Plans changed since approval are skipped: they can't be implemented as approved.
 */
function pendingDeltas(repoRoot) {
  const dir = join(repoRoot, ".groundwork", "approvals");
  if (!existsSync(dir)) return [];
  const receipts = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    try {
      receipts.push(JSON.parse(readFileSync(join(dir, name), "utf8")));
    } catch {
      // A malformed receipt is doctor's to report, not the session digest's.
    }
  }
  const applied = new Set(receipts.filter((r) => r?.decision === "amended").map((r) => r.via?.artifact));
  const pending = [];
  for (const r of receipts) {
    if (r?.checkpoint !== "brownfield-safe-change-plan/accept") continue;
    if (!["approved", "delegated"].includes(r.decision) || applied.has(r.artifact)) continue;
    const abs = resolve(repoRoot, r.artifact);
    if (!abs.startsWith(repoRoot + sep) || !existsSync(abs)) continue;
    const text = readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
    if (createHash("sha256").update(text, "utf8").digest("hex") !== r.sha256) continue;
    pending.push(r.artifact);
  }
  return pending.sort();
}

function onSessionStart(event) {
  pruneLedgers();
  const contextPath = findContextFile(event.cwd ?? process.cwd());
  if (!contextPath) return; // Not a groundwork project: say nothing.

  const repoRoot = dirname(dirname(contextPath));
  const { staleReasons, principleIds } = analyzeContext(readFileSync(contextPath, "utf8"));
  const lines = [`groundwork project context: ${relative(repoRoot, contextPath)}`];
  lines.push(
    principleIds.length > 0
      ? `Active principles: ${principleIds.join(", ")}. Weigh architectural choices against them.`
      : "No Active Principles recorded — /groundwork principles can select them.",
  );
  if (staleReasons.length > 0) {
    lines.push(`Context is stale (${staleReasons.join("; ")}); mention once, repair only via /groundwork doctor.`);
  }
  const proposed = proposedAdrs(repoRoot);
  if (proposed.length > 0) {
    lines.push(`Proposed (undecided) ADRs: ${proposed.join(", ")}.`);
  }
  for (const plan of pendingDeltas(repoRoot)) {
    lines.push(
      `Approved change plan ${plan}: when you implement it, apply its Behavior Delta to its baseline spec in the same change set, then record it with \`npx @kdowswell/groundwork approve <spec> --decision=amended --via=${plan}\`. Don't ask the user to approve the spec again.`,
    );
  }
  lines.push("Load the full context through the /groundwork router when doing architecture work.");
  additionalContext("SessionStart", lines.join("\n"));
}

// --- PostToolUse ------------------------------------------------------------

async function onPostToolUse(event) {
  const cwd = event.cwd ?? process.cwd();
  const filePath = event?.tool_input?.file_path;
  if (!filePath) return;
  const absPath = resolve(cwd, filePath);
  if (!existsSync(absPath)) return;

  const ledger = ledgerPath(event.session_id);
  if (ledger) {
    mkdirSync(LEDGER_DIR, { recursive: true, mode: 0o700 });
    appendFileSync(ledger, `${absPath}\n`, "utf8");
  }

  const engine = await loadEngine();
  if (!engine) return;
  const material = scanFile(engine, absPath, cwd).filter((f) => f.severity !== "info");
  if (material.length === 0) return;
  const lines = material.slice(0, MAX_LISTED).map((f) => formatFinding(f, cwd));
  additionalContext(
    "PostToolUse",
    `groundwork detector found ${material.length} issue(s) in the file you just edited:\n` +
      `${lines.join("\n")}\n` +
      "Fix what is real; waive intentional cases with 'groundwork-disable <rule-id>: reason'.",
  );
}

// --- Stop -------------------------------------------------------------------

async function onStop(event) {
  const ledger = ledgerPath(event.session_id);
  if (!ledger || !existsSync(ledger)) return;
  const files = [...new Set(readFileSync(ledger, "utf8").split("\n").filter(Boolean))];
  unlinkSync(ledger);
  // Already blocked once this turn: never loop.
  if (event.stop_hook_active) return;

  const engine = await loadEngine();
  if (!engine) return;
  const cwd = event.cwd ?? process.cwd();
  const findings = files.filter((f) => existsSync(f)).flatMap((f) => scanFile(engine, f, cwd));
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  const payload = {};
  if (errors.length > 0) {
    payload.decision = "block";
    payload.reason =
      `groundwork deep pass: ${errors.length} unresolved error finding(s) in files changed this turn:\n` +
      `${errors.slice(0, MAX_LISTED).map((f) => formatFinding(f, cwd)).join("\n")}\n` +
      "Fix them, or waive an intentional case with 'groundwork-disable <rule-id>: reason' and say why. " +
      "This check runs once per turn.";
  }
  if (warns.length > 0) {
    payload.systemMessage = `groundwork: ${warns.length} warning(s) remain in files changed this turn — run \`npx @kdowswell/groundwork detect\` for details.`;
  }
  if (Object.keys(payload).length > 0) emit(payload);
}

// --- Dispatch ---------------------------------------------------------------

try {
  const event = JSON.parse(await readStdin());
  switch (event?.hook_event_name ?? "PostToolUse") {
    case "SessionStart":
      onSessionStart(event);
      break;
    case "PostToolUse":
      await onPostToolUse(event);
      break;
    case "Stop":
      await onStop(event);
      break;
    default:
      break;
  }
} catch {
  // Never surface hook failures into the agent flow.
}
process.exit(0);
