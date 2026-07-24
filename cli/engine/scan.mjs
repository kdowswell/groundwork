/**
 * File collection, config, and inline-waiver handling for the detector.
 * Zero dependencies by policy (see ADR-005).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "vendor",
  "coverage",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "target",
  "venv",
  ".venv",
  "__pycache__",
  ".groundwork",
  ".idea",
  ".vscode",
]);

const MAX_FILE_BYTES = 1_000_000;
const NUL = String.fromCharCode(0);

/** Recursively collect relative file paths under root (posix separators). */
export function collectFiles(root) {
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(abs);
      } else if (entry.isFile()) {
        results.push(relative(root, abs).split("\\").join("/"));
      }
    }
  }
  walk(root);
  return results.sort();
}

/** Read a file as UTF-8, or null if unreadable/too large/binary-ish. */
export function readText(root, relPath) {
  const abs = join(root, relPath);
  try {
    if (statSync(abs).size > MAX_FILE_BYTES) return null;
    const content = readFileSync(abs, "utf8");
    return content.includes(NUL) ? null : content;
  } catch {
    return null;
  }
}

/** Load .groundwork/config.json detector settings ({ignoreRules, ignoreFiles}). */
export function loadConfig(root) {
  const path = join(root, ".groundwork", "config.json");
  const empty = { ignoreRules: [], ignoreFiles: [] };
  if (!existsSync(path)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const detector = parsed.detector ?? {};
    return {
      ignoreRules: Array.isArray(detector.ignoreRules) ? detector.ignoreRules : [],
      ignoreFiles: Array.isArray(detector.ignoreFiles) ? detector.ignoreFiles : [],
    };
  } catch (err) {
    throw new Error(`.groundwork/config.json is not valid JSON: ${err.message}`);
  }
}

/** Convert a simple glob (supports ** and *) to a RegExp over posix paths. */
export function globToRegex(glob) {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?"; // '**/' spans zero or more directories
          i += 3;
        } else {
          re += ".*";
          i += 2;
        }
      } else {
        re += "[^/]*";
        i += 1;
      }
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      re += `\\${c}`;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

const WAIVER_RE = /groundwork-disable(-line|-next-line)?[ \t]+([a-z0-9, \t-]+?)(?::|$|-->|\*\/)/;

/**
 * Parse inline waivers from file content.
 * Returns { fileWide: Set<ruleId>, byLine: Map<lineNumber, Set<ruleId>> }.
 */
export function parseWaivers(content) {
  const fileWide = new Set();
  const byLine = new Map();
  let lineNo = 0;
  for (const text of content.split("\n")) {
    lineNo++;
    const m = text.match(WAIVER_RE);
    if (!m) continue;
    const scope = m[1] ?? "";
    const rules = m[2]
      .split(/[,\s]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    for (const rule of rules) {
      if (scope === "") {
        fileWide.add(rule);
      } else {
        const target = scope === "-line" ? lineNo : lineNo + 1;
        if (!byLine.has(target)) byLine.set(target, new Set());
        byLine.get(target).add(rule);
      }
    }
  }
  return { fileWide, byLine };
}

/** True if a finding at (ruleId, line) is waived. */
export function isWaived(waivers, ruleId, line) {
  if (waivers.fileWide.has(ruleId) || waivers.fileWide.has("all")) return true;
  const atLine = waivers.byLine.get(line);
  return Boolean(atLine && (atLine.has(ruleId) || atLine.has("all")));
}
