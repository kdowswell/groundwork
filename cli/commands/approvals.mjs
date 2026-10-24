/**
 * `groundwork approve` / `groundwork verify` — hash-pinned Checkpoint
 * approval receipts (ADR-007).
 *
 * A receipt records how a Checkpoint was resolved for one artifact and pins
 * the artifact's SHA-256 at that moment. `verify` reports receipts whose
 * artifact changed (stale) or disappeared (missing), so post-approval drift is
 * mechanically detectable. Receipts live in .groundwork/approvals/ and are
 * committed with the repository, each beside a snapshot of the text that was
 * decided on, so a stale receipt can show what changed (ADR-009).
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { diffStats, formatUnified, lineDiff } from "../render/diff.mjs";
import {
  ensureProjectDir,
  isInside,
  isRegularFile,
  resolvesInside,
  toProjectPath,
  writeFileSafe,
} from "./safe-fs.mjs";

export const APPROVALS_DIR = join(".groundwork", "approvals");
export const DECISIONS = ["approved", "changes-requested", "delegated"];
const CHECKPOINT_ID = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/;

/**
 * SHA-256 of an artifact. CRLF is normalized to LF so a git autocrlf checkout
 * does not invalidate every receipt; no other normalization (ADR-007).
 */
export function digestFile(absPath) {
  return digestText(readFileSync(absPath, "utf8"));
}

function normalize(text) {
  return text.replace(/\r\n/g, "\n");
}

function digestText(text) {
  return createHash("sha256").update(normalize(text), "utf8").digest("hex");
}

/** Repo-relative POSIX path, or throw when the artifact is outside the root. */
const toArtifactPath = (root, artifact) => toProjectPath(root, artifact);

/** One receipt per artifact: docs/specs/x.md → docs__specs__x.md.json */
export function receiptPath(root, artifactPath) {
  return join(root, APPROVALS_DIR, `${artifactPath.replaceAll("/", "__")}.json`);
}

/** The decided-on text, beside its receipt: docs__specs__x.md.snapshot */
export function snapshotPath(root, artifactPath) {
  return receiptPath(root, artifactPath).replace(/\.json$/, ".snapshot");
}

/**
 * Record a Checkpoint decision for an artifact.
 * @param {string} root project root
 * @param {string} artifact path to the artifact (relative to root, or absolute)
 * @param {object} opts
 * @param {string} opts.checkpoint "<skill>/<checkpoint>" or a single kebab-case id
 * @param {string} [opts.decision] approved | changes-requested | delegated
 * @param {string} [opts.notes]
 * @param {Date} [opts.now]
 * @returns {{receipt: object, path: string, replaced: boolean}}
 */
export function approve(root, artifact, opts) {
  const artifactPath = toArtifactPath(root, artifact);
  const abs = join(root, artifactPath);
  if (!existsSync(abs)) throw new Error(`artifact does not exist: ${artifactPath}`);

  const checkpoint = opts.checkpoint;
  if (typeof checkpoint !== "string" || !CHECKPOINT_ID.test(checkpoint)) {
    throw new Error(
      'approve needs --checkpoint=<id>, kebab-case, optionally "<skill>/<checkpoint>"',
    );
  }
  const decision = opts.decision ?? "approved";
  if (!DECISIONS.includes(decision)) {
    throw new Error(`--decision must be one of: ${DECISIONS.join(", ")}`);
  }

  // Digest and snapshot come from one read, so they always describe the same text.
  const text = normalize(readFileSync(abs, "utf8"));
  const receipt = {
    version: 1,
    artifact: artifactPath,
    sha256: digestText(text),
    checkpoint,
    decision,
    // A delegated choice is the agent's, and must never read as the user's.
    decidedBy: decision === "delegated" ? "agent-delegated" : "user",
    date: (opts.now ?? new Date()).toISOString().slice(0, 10),
  };
  if (opts.notes) receipt.notes = String(opts.notes);

  const dir = ensureProjectDir(root, APPROVALS_DIR);
  const path = receiptPath(root, artifactPath);
  const replaced = lstatSync(path, { throwIfNoEntry: false }) !== undefined;
  if (replaced) {
    if (!isRegularFile(path)) {
      throw new Error(`${relative(root, path)} is not a regular file (symlink?) — refusing to overwrite`);
    }
    const prior = readReceipt(path).receipt;
    if (prior && prior.artifact !== artifactPath) {
      throw new Error(
        `receipt file ${relative(root, path)} already belongs to ${prior.artifact} — rename one artifact`,
      );
    }
  }
  const snapshot = snapshotPath(root, artifactPath);
  if (lstatSync(snapshot, { throwIfNoEntry: false }) !== undefined && !isRegularFile(snapshot)) {
    throw new Error(`${relative(root, snapshot)} is not a regular file (symlink?) — refusing to overwrite`);
  }
  writeFileSafe(dir, snapshot, text);
  writeFileSafe(dir, path, `${JSON.stringify(receipt, null, 2)}\n`);
  return { receipt, path, replaced };
}

function readReceipt(file) {
  // Never follow a symlinked receipt: parse errors would echo the target's text.
  if (!isRegularFile(file)) return { error: "receipt is not a regular file (symlink?)" };
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return { error: `not valid JSON (${err.message})` };
  }
  for (const field of ["artifact", "sha256", "checkpoint", "decision", "decidedBy", "date"]) {
    if (typeof receipt?.[field] !== "string") return { error: `missing field "${field}"` };
  }
  if (!DECISIONS.includes(receipt.decision)) {
    return { error: `unknown decision "${receipt.decision}"` };
  }
  return { receipt };
}

/**
 * Status of one receipt:
 *   fresh    artifact unchanged since the decision
 *   stale    artifact changed after the decision — re-ask the Checkpoint
 *   missing  artifact no longer exists
 *   invalid  receipt is malformed
 */
function checkReceipt(root, file) {
  const { receipt, error } = readReceipt(file);
  const receiptFile = relative(root, file).split(sep).join("/");
  if (error) return { receiptFile, status: "invalid", message: error };

  const abs = resolve(root, receipt.artifact);
  if (!isInside(root, abs) || (existsSync(abs) && !resolvesInside(root, abs))) {
    return { receiptFile, status: "invalid", message: `artifact path escapes the project: ${receipt.artifact}` };
  }
  const base = {
    receiptFile,
    artifact: receipt.artifact,
    checkpoint: receipt.checkpoint,
    decision: receipt.decision,
    decidedBy: receipt.decidedBy,
    date: receipt.date,
  };
  if (!existsSync(abs)) return { ...base, status: "missing" };
  const current = normalize(readFileSync(abs, "utf8"));
  if (digestText(current) === receipt.sha256) return { ...base, status: "fresh" };
  const approved = readSnapshot(root, receipt);
  if (approved === null) return { ...base, status: "stale", changes: null };
  const ops = lineDiff(approved, current);
  return { ...base, status: "stale", changes: ops ? diffStats(ops) : { tooLarge: true } };
}

/**
 * The text a receipt was decided on, or null when there is no snapshot or it
 * doesn't hash to the receipt's digest (a mismatched snapshot is never trusted).
 */
function readSnapshot(root, receipt) {
  const file = snapshotPath(root, receipt.artifact);
  if (!isRegularFile(file)) return null;
  const text = normalize(readFileSync(file, "utf8"));
  return digestText(text) === receipt.sha256 ? text : null;
}

/**
 * Diff between the version an artifact's receipt was decided on and the file now.
 * @returns {{status: string, approved?: string, current?: string, ops?: Array<object>|null,
 *   reason?: string}}
 *   ops is null when the change is too large to diff; reason explains a missing diff
 */
export function approvedDiff(root, artifact) {
  const artifactPath = toArtifactPath(root, artifact);
  const file = receiptPath(root, artifactPath);
  if (!existsSync(file)) return { status: "unapproved", reason: "no receipt" };
  const { receipt, error } = readReceipt(file);
  if (error) return { status: "invalid", reason: error };
  if (receipt.artifact !== artifactPath) return { status: "invalid", reason: "receipt names another artifact" };
  const abs = join(root, artifactPath);
  if (!existsSync(abs) || !resolvesInside(root, abs)) return { status: "missing", reason: "artifact missing" };
  const current = normalize(readFileSync(abs, "utf8"));
  if (digestText(current) === receipt.sha256) return { status: "fresh", reason: "unchanged" };
  const approved = readSnapshot(root, receipt);
  if (approved === null) {
    return { status: "stale", reason: "no snapshot of the approved version (approved before snapshots, or the snapshot doesn't match)" };
  }
  return { status: "stale", approved, current, ops: lineDiff(approved, current) };
}

/**
 * Verify approval receipts.
 * @param {string} root project root
 * @param {string} [artifact] check only this artifact; with no receipt it is "unapproved"
 * @returns {{receipts: Array<object>, ok: boolean}}
 *   ok — every receipt is fresh; for a single artifact, also that its decision
 *   lets work proceed (approved or delegated)
 */
export function verify(root, artifact) {
  if (artifact !== undefined) {
    const artifactPath = toArtifactPath(root, artifact);
    const file = receiptPath(root, artifactPath);
    if (!existsSync(file)) {
      return { receipts: [{ artifact: artifactPath, status: "unapproved" }], ok: false };
    }
    const r = checkReceipt(root, file);
    return { receipts: [r], ok: r.status === "fresh" && r.decision !== "changes-requested" };
  }

  const dir = join(root, APPROVALS_DIR);
  if (!existsSync(dir)) return { receipts: [], ok: true };
  if (!isInside(realpathSync(root), realpathSync(dir))) {
    return {
      receipts: [{ receiptFile: APPROVALS_DIR, status: "invalid", message: "approvals directory resolves outside the project (symlink?)" }],
      ok: false,
    };
  }
  const receipts = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => checkReceipt(root, join(dir, name)));
  return { receipts, ok: receipts.every((r) => r.status === "fresh") };
}

const STATUS_NOTE = {
  stale: "artifact changed since the decision — re-ask the Checkpoint",
  missing: "artifact no longer exists — remove the receipt or restore the artifact",
  unapproved: "no receipt — the Checkpoint has not been resolved",
};

export function formatApproveHuman(result) {
  const { receipt } = result;
  const who = receipt.decidedBy === "user" ? "by the user" : "delegated to the agent";
  return (
    `✓ ${result.replaced ? "Replaced" : "Recorded"} ${receipt.decision} ` +
    `for ${receipt.artifact} at ${receipt.checkpoint} (${who})\n` +
    `  sha256 ${receipt.sha256.slice(0, 12)}… → ${relative(process.cwd(), result.path) || result.path}`
  );
}

function changeNote(changes) {
  if (!changes) return "no snapshot of the approved version — re-approve to enable diffs";
  if (changes.tooLarge) return "changed too much to diff";
  return `+${changes.added} −${changes.removed} lines since the decision (verify --diff shows them)`;
}

/** Unified diffs for each stale receipt that has a usable snapshot. */
export function formatVerifyDiff(root, result) {
  const out = [];
  for (const r of result.receipts) {
    if (r.status !== "stale") continue;
    const d = approvedDiff(root, r.artifact);
    if (!d.ops) {
      out.push(`${r.artifact}: ${d.ops === null ? "changed too much to diff" : d.reason}`);
      continue;
    }
    out.push(formatUnified(d.ops, `${r.artifact} (${r.decision} ${r.date})`, `${r.artifact} (now)`));
  }
  return out.join("\n\n");
}

export function formatVerifyHuman(result) {
  if (result.receipts.length === 0) return "No approval receipts in .groundwork/approvals/.";
  const lines = [];
  for (const r of result.receipts) {
    if (r.status === "invalid") {
      lines.push(`  ✗ invalid  ${r.receiptFile}: ${r.message}`);
      continue;
    }
    const mark = r.status === "fresh" ? "✓" : "✗";
    const decision = r.decision ? ` ${r.decision} @ ${r.checkpoint} (${r.date})` : "";
    lines.push(`  ${mark} ${r.status.padEnd(10)} ${r.artifact}${decision}`);
    if (r.status === "stale") lines.push(`               ${changeNote(r.changes)}`);
    if (STATUS_NOTE[r.status]) lines.push(`               ${STATUS_NOTE[r.status]}`);
    else if (r.decision === "changes-requested") {
      lines.push("               changes requested — revise, then re-ask the Checkpoint");
    }
  }
  return lines.join("\n");
}
