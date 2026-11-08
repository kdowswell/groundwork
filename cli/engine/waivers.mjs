/**
 * Waiver audit for `/groundwork learn` (ADR-021): find waivers that no longer suppress anything.
 * A waiver that suppresses nothing is a rule exception nobody needs any more; `learn` proposes
 * removing it. Prefers silence: only waivers whose rule demonstrably never fires where they point
 * are reported.
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { FILE_RULES, POSTURE_RULES, isTestPath } from "./rules.mjs";
import { WAIVER_RE, collectFiles, globToRegex, loadConfig, readText } from "./scan.mjs";

const KNOWN_RULES = new Set([...FILE_RULES, ...POSTURE_RULES].map((r) => r.id));

/**
 * @param {string} target project directory
 * @returns {{inline: Array<{file: string, line: number, rule: string, scope: string}>,
 *   ignoreRules: string[], ignoreFiles: string[]}}
 */
export function auditWaivers(target) {
  const root = resolve(target);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`not a directory: ${target}`);
  const files = collectFiles(root);
  const config = loadConfig(root);
  const read = (rel) => readText(root, rel);

  // Every hit of every file rule, with no waivers or ignores applied.
  const hits = new Map(); // file -> [{rule, line}]
  const firing = new Set();
  for (const rel of files) {
    const rules = FILE_RULES.filter((r) => r.files.test(rel) && (r.includeTests || !isTestPath(rel)));
    if (rules.length === 0) continue;
    const content = read(rel);
    if (content === null) continue;
    const list = [];
    for (const rule of rules) {
      for (const hit of rule.check(content, rel, { read })) {
        list.push({ rule: rule.id, line: hit.line });
        firing.add(rule.id);
      }
    }
    hits.set(rel, list);
  }

  const inline = [];
  for (const rel of files) {
    const content = read(rel);
    // Test files often hold waiver text as fixtures; prefer silence there.
    if (isTestPath(rel) || content === null || !content.includes("groundwork-disable")) continue;
    const fileHits = hits.get(rel) ?? [];
    content.split("\n").forEach((text, i) => {
      const m = text.match(WAIVER_RE);
      if (!m) return;
      const lineNo = i + 1;
      const scope = m[1] ?? "";
      const target = scope === "-line" ? lineNo : scope === "-next-line" ? lineNo + 1 : null;
      for (const rule of m[2].split(/[,\s]+/).map((r) => r.trim()).filter(Boolean)) {
        if (rule !== "all" && !KNOWN_RULES.has(rule)) continue; // unknown ids are doctor's business
        const used = fileHits.some((h) => (rule === "all" || h.rule === rule) && (target === null || h.line === target));
        if (!used) inline.push({ file: rel, line: lineNo, rule, scope: scope || "file" });
      }
    });
  }

  // Posture rules can't be checked per file; only report an ignored posture rule that wouldn't fire.
  const postureFires = (id) => {
    const rule = POSTURE_RULES.find((r) => r.id === id);
    const repo = { root, files, has: (p) => files.includes(p), read, looksLikeProject: true };
    try {
      return rule.check(repo).length > 0;
    } catch {
      return true;
    }
  };
  const isPosture = (id) => POSTURE_RULES.some((r) => r.id === id);
  const ignoreRules = config.ignoreRules.filter(
    (id) => KNOWN_RULES.has(id) && (isPosture(id) ? !postureFires(id) : !firing.has(id)),
  );
  const ignoreFiles = config.ignoreFiles.filter((glob) => {
    const re = globToRegex(glob);
    const matched = files.filter((f) => re.test(f));
    return matched.every((f) => (hits.get(f) ?? []).length === 0);
  });
  return { inline, ignoreRules, ignoreFiles };
}
