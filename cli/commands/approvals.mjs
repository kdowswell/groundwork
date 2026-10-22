/**
 * `groundwork approve` / `groundwork verify` — hash-pinned Checkpoint
 * approval receipts (ADR-007).
 *
 * A receipt records how a Checkpoint was resolved for one artifact and pins
 * the artifact's SHA-256 at that moment. `verify` reports receipts whose
 * artifact changed (stale) or disappeared (missing), so post-approval drift is
 * mechanically detectable. Receipts live in .groundwork/approvals/ and are
 * committed with the repository.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const APPROVALS_DIR = join(".groundwork", "approvals");
export const DECISIONS = ["approved", "changes-requested", "delegated"];
const CHECKPOINT_ID = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/;

/**
 * SHA-256 of an artifact. CRLF is normalized to LF so a git autocrlf checkout
 * does not invalidate every receipt; no other normalization (ADR-007).
 */
export function digestFile(absPath) {
  const text = readFileSync(absPath, "utf8").replace(/\r\n/g, "\n");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * True when `abs` stays inside `root` after resolving symlinks. Receipts and
 * artifacts come from the repository, which may be untrusted (a fresh clone):
 * a symlinked path must not reach files outside it.
 */
function resolvesInside(root, abs) {
  return isInside(root, abs) && isInside(realpathSync(root), realpathSync(abs));
}

/** Repo-relative POSIX path, or throw when the artifact is outside the root. */
function toArtifactPath(root, artifact) {
  const abs = resolve(root, artifact);
  if (!isInside(root, abs) || (existsSync(abs) && !resolvesInside(root, abs))) {
    throw new Error(`artifact must be a file inside ${root}: ${artifact}`);
  }
  return relative(root, abs).split(sep).join("/");
}

/** Approvals directory, created if needed; refused if it resolves outside the root. */
function approvalsDir(root) {
  const dir = join(root, APPROVALS_DIR);
  mkdirSync(dir, { recursive: true });
  if (!isInside(realpathSync(root), realpathSync(dir))) {
    throw new Error(`${APPROVALS_DIR} resolves outside ${root} (symlink?) — refusing to write`);
  }
  return dir;
}

/** A receipt path must be a regular file, never a symlink. */
function isRegularFile(path) {
  const st = lstatSync(path, { throwIfNoEntry: false });
  return st !== undefined && st.isFile() && !st.isSymbolicLink();
}

/** One receipt per artifact: docs/specs/x.md → docs__specs__x.md.json */
export function receiptPath(root, artifactPath) {
  return join(root, APPROVALS_DIR, `${artifactPath.replaceAll("/", "__")}.json`);
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

  const receipt = {
    version: 1,
    artifact: artifactPath,
    sha256: digestFile(abs),
    checkpoint,
    decision,
    // A delegated choice is the agent's, and must never read as the user's.
    decidedBy: decision === "delegated" ? "agent-delegated" : "user",
    date: (opts.now ?? new Date()).toISOString().slice(0, 10),
  };
  if (opts.notes) receipt.notes = String(opts.notes);

  const dir = approvalsDir(root);
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
  // Exclusive-create a temp file, then rename over the target: rename replaces
  // the directory entry itself, so it can never write through a symlink.
  const tmp = join(dir, `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
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
  return { ...base, status: digestFile(abs) === receipt.sha256 ? "fresh" : "stale" };
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
    if (STATUS_NOTE[r.status]) lines.push(`               ${STATUS_NOTE[r.status]}`);
    else if (r.decision === "changes-requested") {
      lines.push("               changes requested — revise, then re-ask the Checkpoint");
    }
  }
  return lines.join("\n");
}
