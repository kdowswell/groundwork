/**
 * Detector orchestration: walk the target, apply file and posture rules,
 * filter waivers and config ignores, return sorted findings.
 */
import { statSync, existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { FILE_RULES, POSTURE_RULES, isTestPath } from "./rules.mjs";
import {
  collectFiles,
  readText,
  loadConfig,
  globToRegex,
  parseWaivers,
  isWaived,
} from "./scan.mjs";

const SEVERITY_ORDER = { error: 0, warn: 1, info: 2 };

/**
 * Run the detector.
 * @param {string} target file or directory to scan
 * @param {{configRoot?: string}} [opts] configRoot: where .groundwork/config.json
 *   is resolved from (defaults to the scanned directory)
 * @returns {{findings: Array, scannedFiles: number, root: string}}
 */
export function detect(target, opts = {}) {
  const abs = resolve(target);
  if (!existsSync(abs)) {
    throw new Error(`target does not exist: ${target}`);
  }
  const isFile = statSync(abs).isFile();
  const root = isFile ? dirname(abs) : abs;
  const files = isFile ? [basename(abs)] : collectFiles(abs);

  const config = loadConfig(opts.configRoot ?? root);
  const ignoreFileRes = config.ignoreFiles.map(globToRegex);
  const isIgnoredFile = (relPath) => ignoreFileRes.some((re) => re.test(relPath));
  const isIgnoredRule = (ruleId) => config.ignoreRules.includes(ruleId);

  const contentCache = new Map();
  const read = (relPath) => {
    if (!contentCache.has(relPath)) contentCache.set(relPath, readText(root, relPath));
    return contentCache.get(relPath);
  };

  const findings = [];

  // File rules
  for (const relPath of files) {
    if (isIgnoredFile(relPath)) continue;
    const applicable = FILE_RULES.filter(
      (rule) =>
        !isIgnoredRule(rule.id) &&
        rule.files.test(relPath) &&
        (rule.includeTests || !isTestPath(relPath)),
    );
    if (applicable.length === 0) continue;
    const content = read(relPath);
    if (content === null) continue;
    const waivers = parseWaivers(content);
    for (const rule of applicable) {
      // Rules may read another file relative to the scan root (e.g. a manifest's lockfile).
      for (const hit of rule.check(content, relPath, { read })) {
        if (isWaived(waivers, rule.id, hit.line)) continue;
        findings.push({
          rule: rule.id,
          title: rule.title,
          severity: rule.severity,
          principle: rule.principle,
          file: relPath,
          line: hit.line,
          message: hit.message,
          excerpt: hit.excerpt,
        });
      }
    }
  }

  // Posture rules (repository-level; only when scanning a directory)
  if (!isFile) {
    const repo = {
      root,
      files,
      has: (relPath) => files.includes(relPath),
      read,
      looksLikeProject: files.some((f) =>
        ["package.json", "pyproject.toml", "go.mod", "Cargo.toml", "requirements.txt", "pom.xml", "Gemfile"].includes(f),
      ),
    };
    for (const rule of POSTURE_RULES) {
      if (isIgnoredRule(rule.id)) continue;
      for (const hit of rule.check(repo)) {
        if (hit.path && isIgnoredFile(hit.path)) continue;
        findings.push({
          rule: rule.id,
          title: rule.title,
          severity: rule.severity,
          principle: rule.principle,
          file: hit.path ?? null,
          line: null,
          message: hit.message,
        });
      }
    }
  }

  findings.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      String(a.file).localeCompare(String(b.file)) ||
      (a.line ?? 0) - (b.line ?? 0),
  );

  return { findings, scannedFiles: files.length, root };
}

export function countBySeverity(findings) {
  const counts = { error: 0, warn: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return counts;
}
