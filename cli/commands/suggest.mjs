/**
 * `groundwork suggest` — the agent suggestion box (ADR-021).
 *
 * Agents (and people) append one JSON line to .groundwork/suggestions.jsonl when a groundwork
 * rule gets in the way: a detector finding they waived, a playbook step that didn't fit, a rule
 * that was unclear. `/groundwork learn` reads the file and proposes changes; nothing here changes
 * a rule. The file is committed with the repository so the signal reaches whoever curates the
 * rules, and it is append-only: lines are never rewritten.
 *
 * Line format: {"date":"YYYY-MM-DD","rule":"<rule id, detector rule, or skill/step>","file":"<path>","why":"<text>","by":"agent"|"user"}
 */
import { appendFileSync, existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureProjectDir, isRegularFile, toProjectPath } from "./safe-fs.mjs";

export const SUGGESTIONS_FILE = join(".groundwork", "suggestions.jsonl");
const MAX_WHY = 1000;
const RULE_ID = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,119}$/;

/**
 * Append one suggestion.
 * @param {string} root project root
 * @param {{why: string, rule?: string, file?: string, by?: string, now?: Date}} opts
 * @returns {{entry: object, path: string}}
 */
export function suggest(root, opts) {
  const why = String(opts.why ?? "").replace(/\s+/g, " ").trim();
  if (!why) throw new Error('suggest needs the friction in words: groundwork suggest "<what got in the way>"');
  if (opts.rule !== undefined && !RULE_ID.test(opts.rule)) {
    throw new Error("--rule must be a rule id, detector rule, or skill/step (letters, digits, : . _ / -)");
  }
  const by = opts.by ?? "agent";
  if (!["agent", "user"].includes(by)) throw new Error("--by must be agent or user");
  const entry = { date: (opts.now ?? new Date()).toISOString().slice(0, 10) };
  if (opts.rule) entry.rule = opts.rule;
  if (opts.file) entry.file = toProjectPath(root, opts.file, "--file");
  entry.why = why.slice(0, MAX_WHY);
  entry.by = by;

  ensureProjectDir(root, ".groundwork");
  const path = join(root, SUGGESTIONS_FILE);
  // lstat, not exists: a dangling symlink must be refused too, or the append would follow it.
  if (lstatSync(path, { throwIfNoEntry: false }) !== undefined && !isRegularFile(path)) {
    throw new Error(`${SUGGESTIONS_FILE} is not a regular file (symlink?) — refusing to append`);
  }
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  return { entry, path };
}

/** Parsed suggestion lines; malformed lines are skipped and counted. */
export function readSuggestions(root) {
  const path = join(root, SUGGESTIONS_FILE);
  if (!existsSync(path) || !isRegularFile(path)) return { entries: [], malformed: 0 };
  const entries = [];
  let malformed = 0;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (typeof e?.date === "string" && typeof e?.why === "string") entries.push(e);
      else malformed++;
    } catch {
      malformed++;
    }
  }
  return { entries, malformed };
}

/** Date of the most recent `/groundwork learn` report (.groundwork/learn/YYYY-MM-DD.md), or null. */
export function lastLearnDate(root) {
  const dir = join(root, ".groundwork", "learn");
  if (!existsSync(dir)) return null;
  const dates = readdirSync(dir)
    .map((n) => n.match(/^(\d{4}-\d{2}-\d{2})\.md$/)?.[1])
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? null;
}

/** Suggestions logged after the last learn report: the ones nobody has reviewed yet. */
export function openSuggestions(root) {
  const since = lastLearnDate(root);
  const { entries } = readSuggestions(root);
  return since ? entries.filter((e) => e.date > since) : entries;
}
