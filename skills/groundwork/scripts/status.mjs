/**
 * Where the project stands: which groundwork artifacts exist, the state of each one's approval,
 * and the one command worth running next. Used by context.mjs (session start) and by the
 * /groundwork router's status-first menu.
 *
 * Self-contained (node: builtins only) because it ships inside installed skills, where the CLI's
 * approvals module isn't available. Its receipt checks mirror cli/commands/approvals.mjs
 * (ADR-007): SHA-256 over the text with CRLF normalized to LF.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/** Artifact kinds, keyed by H1 prefix and acceptance checkpoint, in the order they're built. */
export const KINDS = [
  { kind: "spec", prefix: "Spec:", checkpoint: "greenfield-spec-from-idea/accept", command: "spec" },
  { kind: "architecture", prefix: "Architecture:", checkpoint: "greenfield-architecture-sketch/accept", command: "architecture" },
  { kind: "data-model", prefix: "Data Model:", checkpoint: "greenfield-data-model-first/accept", command: "data-model" },
  { kind: "plan", prefix: "Safe Change Plan:", checkpoint: "brownfield-safe-change-plan/accept", command: "plan" },
];
/** The design artifacts `start` produces and `continue` completes. */
export const DESIGN_KINDS = ["spec", "architecture", "data-model"];

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "vendor", "coverage", "target", "fixtures", "_fixtures", "__fixtures__", "examples"]);
/** Generated or bookkeeping directories inside .groundwork/. */
const SKIP_GROUNDWORK = new Set(["approvals", "review"]);
const MAX_DEPTH = 4;
const MAX_FILES = 2000;

const normalize = (text) => text.replace(/\r\n/g, "\n");
const sha256 = (text) => createHash("sha256").update(normalize(text), "utf8").digest("hex");

function isFile(p) {
  try {
    return lstatSync(p).isFile();
  } catch {
    return false;
  }
}

/** The kind an artifact's first H1 names, or null. */
export function kindOf(text) {
  const h1 = normalize(text).split("\n").find((l) => /^#\s+/.test(l));
  if (!h1) return null;
  const title = h1.replace(/^#\s+/, "").trim();
  return KINDS.find((k) => title.startsWith(k.prefix))?.kind ?? null;
}

/** Markdown files under root (bounded), skipping dependency and build directories. */
function markdownFiles(root) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      if (e.isSymbolicLink()) continue;
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || (e.name.startsWith(".") && e.name !== ".groundwork")) continue;
        if (SKIP_GROUNDWORK.has(e.name) && dir.endsWith(`${sep}.groundwork`)) continue;
        walk(abs, depth + 1);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(abs);
      }
    }
  };
  walk(root, 0);
  return out;
}

function readReceipts(root) {
  const dir = join(root, ".groundwork", "approvals");
  const receipts = new Map();
  if (!existsSync(dir)) return receipts;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json") || !isFile(join(dir, name))) continue;
    try {
      const r = JSON.parse(readFileSync(join(dir, name), "utf8"));
      if (typeof r?.artifact === "string" && typeof r?.sha256 === "string") receipts.set(r.artifact, r);
    } catch {
      // Malformed receipts are doctor's to report.
    }
  }
  return receipts;
}

/**
 * State of one artifact:
 *   approved           a fresh approval, delegation, or amendment
 *   changes-requested  the user asked for changes
 *   stale              changed after its decision
 *   draft              exists, never decided on
 */
function stateOf(text, receipt) {
  if (!receipt) return "draft";
  if (sha256(text) !== receipt.sha256) return "stale";
  if (receipt.decision === "changes-requested") return "changes-requested";
  return "approved";
}

/**
 * Scan a project for groundwork artifacts.
 * @param {string} root project root
 * @returns {{artifacts: Array<{kind: string, path: string, state: string, date?: string}>,
 *   pendingPlans: string[]}}
 */
export function projectStatus(root) {
  const receipts = readReceipts(root);
  const seen = new Set();
  const artifacts = [];
  const consider = (abs) => {
    const rel = relative(root, abs).split(sep).join("/");
    if (seen.has(rel) || rel.startsWith("..")) return;
    seen.add(rel);
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      return;
    }
    const receipt = receipts.get(rel);
    const kind = kindOf(text) ?? KINDS.find((k) => k.checkpoint === receipt?.checkpoint)?.kind;
    if (!kind) return;
    const entry = { kind, path: rel, state: stateOf(text, receipt) };
    if (receipt?.date) entry.date = receipt.date;
    artifacts.push(entry);
  };
  for (const artifact of receipts.keys()) {
    const abs = resolve(root, artifact);
    if (abs.startsWith(root + sep) && isFile(abs)) consider(abs);
  }
  for (const abs of markdownFiles(root)) consider(abs);

  const order = (k) => KINDS.findIndex((x) => x.kind === k);
  artifacts.sort((a, b) => order(a.kind) - order(b.kind) || a.path.localeCompare(b.path));

  // Approved plans whose delta hasn't been applied to a spec yet (ADR-012).
  const amendedVia = new Set([...receipts.values()].filter((r) => r.decision === "amended").map((r) => r.via?.artifact));
  const pendingPlans = artifacts
    .filter((a) => a.kind === "plan" && a.state === "approved" && !amendedVia.has(a.path))
    .filter((a) => ["approved", "delegated"].includes(receipts.get(a.path)?.decision))
    .map((a) => a.path);
  return { artifacts, pendingPlans };
}

const STATE_REASON = {
  draft: "is a draft nobody has approved yet",
  "changes-requested": "has changes requested",
  stale: "changed after it was approved",
};

/**
 * The one command worth running next, worked out from artifact state (the router's next-step
 * table). Never a list.
 * @returns {{command: string, reason: string}}
 */
export function nextStep(status) {
  const { artifacts, pendingPlans } = status;
  const byKind = (k) => artifacts.filter((a) => a.kind === k);

  if (pendingPlans.length > 0) {
    return {
      command: "build",
      reason: `${pendingPlans[0]} is approved: implement it, and apply what it changes to the spec in the same change set`,
    };
  }
  const plans = byKind("plan").filter((a) => a.state !== "approved");
  if (plans.length > 0) {
    return { command: "plan", reason: `${plans[0].path} ${STATE_REASON[plans[0].state]}` };
  }

  const design = DESIGN_KINDS.map((k) => ({ kind: k, items: byKind(k) }));
  if (design.every((d) => d.items.length === 0)) {
    return { command: "start", reason: "no design documents exist yet; `start` drafts the spec, architecture, and data model in one pass with one approval" };
  }
  const unsettled = design.flatMap((d) => d.items).filter((a) => a.state !== "approved");
  const missing = design.filter((d) => d.items.length === 0).map((d) => d.kind);
  if (unsettled.length + missing.length > 1) {
    const parts = [
      ...unsettled.map((a) => `${a.path} ${STATE_REASON[a.state]}`),
      ...(missing.length ? [`no ${missing.join(" or ")} yet`] : []),
    ];
    return { command: "continue", reason: `${parts.join("; ")}. \`continue\` finishes them with one approval` };
  }
  if (unsettled.length === 1) {
    const a = unsettled[0];
    return { command: KINDS.find((k) => k.kind === a.kind).command, reason: `${a.path} ${STATE_REASON[a.state]}` };
  }
  if (missing.length === 1) {
    const prior = DESIGN_KINDS[DESIGN_KINDS.indexOf(missing[0]) - 1];
    const basis = prior ? `the ${prior} is approved` : "the architecture and data model exist";
    return { command: missing[0], reason: `${basis} and there is no ${missing[0]} yet` };
  }
  return {
    command: "build",
    reason: "the spec, architecture, and data model are approved: start building, and run `plan` before changing anything in production",
  };
}

const STATE_LABEL = {
  approved: "approved",
  draft: "draft (not approved)",
  "changes-requested": "changes requested",
  stale: "changed since approval",
};

/** Directive lines for the context loader: STATUS per artifact, MISSING per design kind, NEXT. */
export function formatStatus(status) {
  const lines = [];
  for (const a of status.artifacts) {
    lines.push(`STATUS ${a.kind} ${a.path} ${STATE_LABEL[a.state]}${a.date && a.state === "approved" ? ` (${a.date})` : ""}`);
  }
  for (const k of DESIGN_KINDS) {
    if (!status.artifacts.some((a) => a.kind === k)) lines.push(`STATUS ${k} — missing`);
  }
  const next = nextStep(status);
  lines.push(
    next.command === "build"
      ? `NEXT build — ${next.reason}`
      : `NEXT /groundwork ${next.command} — ${next.reason}`,
  );
  return lines;
}
