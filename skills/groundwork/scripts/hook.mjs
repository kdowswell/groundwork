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
  writeFileSync,
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
// Plan nudge (ADR-013). Source files match the detector's code set (cli/engine/rules.mjs).
const SOURCE = /\.(jsx?|tsx?|mjs|cjs|py|rb|go|java|kt|cs|php|rs|swift|vue|svelte)$/;
const PLAN_GATE_DEFAULTS = { mode: "nudge", afterFiles: 3 };
const RECENT_PLANNING_MS = 14 * 86_400_000;

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
function ledgerPath(sessionId, ext = "log") {
  if (!sessionId) return null;
  const safe = String(sessionId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  return safe ? join(LEDGER_DIR, `${safe}.${ext}`) : null;
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

/** Parsed approval receipts; malformed ones are doctor's to report, not the hook's. */
function readReceipts(repoRoot) {
  const dir = join(repoRoot, ".groundwork", "approvals");
  if (!existsSync(dir)) return [];
  const receipts = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    try {
      receipts.push(JSON.parse(readFileSync(join(dir, name), "utf8")));
    } catch {
      // Skip it.
    }
  }
  return receipts;
}

/**
 * Approved change plans whose behavior delta hasn't been applied to a spec yet (ADR-012), so the
 * agent remembers, in whatever later session implements the plan, to update the spec in the same
 * change set. Plans changed since approval are skipped: they can't be implemented as approved.
 */
function pendingDeltas(repoRoot) {
  const receipts = readReceipts(repoRoot);
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

// --- Plan nudge (ADR-013) -----------------------------------------------------

/** `planGate` from .groundwork/config.json, defaulting to a nudge after 3 source files. */
function readPlanGate(repoRoot) {
  try {
    const gate = JSON.parse(readFileSync(join(repoRoot, ".groundwork", "config.json"), "utf8"))?.planGate ?? {};
    const mode = ["nudge", "strict", "off"].includes(gate.mode) ? gate.mode : PLAN_GATE_DEFAULTS.mode;
    const afterFiles = Number.isInteger(gate.afterFiles) && gate.afterFiles > 0 ? gate.afterFiles : PLAN_GATE_DEFAULTS.afterFiles;
    return { mode, afterFiles };
  } catch {
    return { ...PLAN_GATE_DEFAULTS };
  }
}

/** Planned work is visible: a plan still to apply, or any recent approval (greenfield included). */
function plannedWork(repoRoot, now = Date.now()) {
  if (pendingDeltas(repoRoot).length > 0) return true;
  return readReceipts(repoRoot).some(
    (r) =>
      ["approved", "delegated", "amended"].includes(r?.decision) &&
      now - Date.parse(r.date) <= RECENT_PLANNING_MS,
  );
}

function readGateState(sessionId) {
  const file = ledgerPath(sessionId, "gate.json");
  try {
    return { file, ...JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { file, files: [], nudged: false, blocked: false };
  }
}

function writeGateState({ file, ...state }) {
  if (!file) return;
  mkdirSync(LEDGER_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
}

/**
 * Track source files this session changed, and return the nudge note when the session has
 * crossed the threshold with no planned work in sight. Fires at most once per session.
 */
function planNudge(event, absPath) {
  if (!SOURCE.test(absPath)) return null;
  const contextPath = findContextFile(event.cwd ?? process.cwd());
  if (!contextPath) return null;
  const repoRoot = dirname(dirname(contextPath));
  if (!absPath.startsWith(repoRoot + sep)) return null;
  const gate = readPlanGate(repoRoot);
  if (gate.mode === "off") return null;

  const state = readGateState(event.session_id);
  const rel = relative(repoRoot, absPath);
  if (!state.files.includes(rel)) state.files.push(rel);
  let note = null;
  if (gate.mode === "nudge" && !state.nudged && state.files.length >= gate.afterFiles && !plannedWork(repoRoot)) {
    state.nudged = true;
    note =
      `groundwork: this session has changed ${state.files.length} source files and no change plan is approved or in progress. ` +
      "In your next reply, mention once that `/groundwork plan <change>` can capture what this changes (a behavior delta against the spec), " +
      "its risk, and its rollback, and that it's optional for small changes. Then carry on with the user's request; " +
      "don't stop or wait for an answer, and don't raise it again this session.";
  }
  writeGateState(state);
  return note;
}

/** Strict mode only: the reason to block this Stop, once per session (ADR-013). */
function planGateBlock(event, turnFiles) {
  const contextPath = findContextFile(event.cwd ?? process.cwd());
  if (!contextPath) return null;
  const repoRoot = dirname(dirname(contextPath));
  const gate = readPlanGate(repoRoot);
  if (gate.mode !== "strict") return null;
  if (!turnFiles.some((f) => SOURCE.test(f))) return null;
  const state = readGateState(event.session_id);
  if (state.blocked || state.files.length < gate.afterFiles || plannedWork(repoRoot)) return null;
  state.blocked = true;
  writeGateState(state);
  return (
    `groundwork plan gate (strict, set in .groundwork/config.json): this session changed ${state.files.length} source files ` +
    "with no approved change plan. Before finishing, write one with /groundwork plan and ask the user to accept it, " +
    "or tell the user this project requires a plan and ask whether to proceed without one. This check runs once per session."
  );
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

  const notes = [];
  const engine = await loadEngine();
  if (engine) {
    const material = scanFile(engine, absPath, cwd).filter((f) => f.severity !== "info");
    if (material.length > 0) {
      const lines = material.slice(0, MAX_LISTED).map((f) => formatFinding(f, cwd));
      notes.push(
        `groundwork detector found ${material.length} issue(s) in the file you just edited:\n` +
          `${lines.join("\n")}\n` +
          "Fix what is real; waive intentional cases with 'groundwork-disable <rule-id>: reason'.",
      );
    }
  }
  const nudge = planNudge(event, absPath);
  if (nudge) notes.push(nudge);
  if (notes.length > 0) additionalContext("PostToolUse", notes.join("\n\n"));
}

// --- Stop -------------------------------------------------------------------

async function onStop(event) {
  const ledger = ledgerPath(event.session_id);
  if (!ledger || !existsSync(ledger)) return;
  const files = [...new Set(readFileSync(ledger, "utf8").split("\n").filter(Boolean))];
  unlinkSync(ledger);
  // Already blocked once this turn: never loop.
  if (event.stop_hook_active) return;

  const cwd = event.cwd ?? process.cwd();
  const engine = await loadEngine();
  const findings = engine ? files.filter((f) => existsSync(f)).flatMap((f) => scanFile(engine, f, cwd)) : [];
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  const reasons = [];
  if (errors.length > 0) {
    reasons.push(
      `groundwork deep pass: ${errors.length} unresolved error finding(s) in files changed this turn:\n` +
        `${errors.slice(0, MAX_LISTED).map((f) => formatFinding(f, cwd)).join("\n")}\n` +
        "Fix them, or waive an intentional case with 'groundwork-disable <rule-id>: reason' and say why. " +
        "This check runs once per turn.",
    );
  }
  const gate = planGateBlock(event, files);
  if (gate) reasons.push(gate);

  const payload = {};
  if (reasons.length > 0) {
    payload.decision = "block";
    payload.reason = reasons.join("\n\n");
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
