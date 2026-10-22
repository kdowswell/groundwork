/**
 * Path-safety helpers for commands that read or write inside a project that
 * may be untrusted (a fresh clone). Symlinks committed to the repository must
 * never let a groundwork command read or write outside the project root.
 */
import { randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** True when `abs` stays inside `root` after resolving symlinks. */
export function resolvesInside(root, abs) {
  return isInside(root, abs) && isInside(realpathSync(root), realpathSync(abs));
}

/** Repo-relative POSIX path, or throw when the file is outside the root. */
export function toProjectPath(root, file, label = "artifact") {
  const abs = resolve(root, file);
  if (!isInside(root, abs) || (existsSync(abs) && !resolvesInside(root, abs))) {
    throw new Error(`${label} must be a file inside ${root}: ${file}`);
  }
  return relative(root, abs).split(sep).join("/");
}

/** Create `relDir` under root; refuse it if it resolves outside the root. */
export function ensureProjectDir(root, relDir) {
  const dir = join(root, relDir);
  mkdirSync(dir, { recursive: true });
  if (!isInside(realpathSync(root), realpathSync(dir))) {
    throw new Error(`${relDir} resolves outside ${root} (symlink?) — refusing to write`);
  }
  return dir;
}

/** A path that must be a regular file, never a symlink. */
export function isRegularFile(path) {
  const st = lstatSync(path, { throwIfNoEntry: false });
  return st !== undefined && st.isFile() && !st.isSymbolicLink();
}

/**
 * Write `content` to `path` inside `dir` without ever following a symlink:
 * exclusive-create a temp file, then rename over the target (rename replaces
 * the directory entry itself). Refuses an existing non-regular target.
 */
export function writeFileSafe(dir, path, content) {
  if (lstatSync(path, { throwIfNoEntry: false }) !== undefined && !isRegularFile(path)) {
    throw new Error(`${path} is not a regular file (symlink?) — refusing to overwrite`);
  }
  const tmp = join(dir, `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(tmp, content, { encoding: "utf8", flag: "wx" });
  try {
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

