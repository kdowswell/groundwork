/**
 * `groundwork doctor` — deterministic drift checks for .groundwork/context.md.
 * The /groundwork doctor playbook layers judgment on top of these findings;
 * this command only reports what is mechanically checkable.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STALE_AFTER_DAYS = 90;

const MANIFEST_LANGUAGE_HINTS = [
  { file: "package.json", hint: /typescript|javascript|node/i, label: "JavaScript/TypeScript (package.json present)" },
  { file: "pyproject.toml", hint: /python/i, label: "Python (pyproject.toml present)" },
  { file: "requirements.txt", hint: /python/i, label: "Python (requirements.txt present)" },
  { file: "go.mod", hint: /\bgo\b/i, label: "Go (go.mod present)" },
  { file: "Cargo.toml", hint: /rust/i, label: "Rust (Cargo.toml present)" },
  { file: "Gemfile", hint: /ruby/i, label: "Ruby (Gemfile present)" },
];

function loadPrincipleIds() {
  try {
    const raw = readFileSync(join(CLI_ROOT, "data", "principles.json"), "utf8");
    return new Set(JSON.parse(raw).map((p) => p.id));
  } catch {
    return null;
  }
}

/**
 * Run doctor checks against a project root.
 * @returns {{findings: Array<{check: string, severity: string, message: string}>}}
 */
export function doctor(root) {
  const findings = [];
  const contextPath = join(root, ".groundwork", "context.md");

  if (!existsSync(contextPath)) {
    findings.push({
      check: "context-missing",
      severity: "error",
      message: "no .groundwork/context.md — run /groundwork init to create it",
    });
    return { findings };
  }

  const raw = readFileSync(contextPath, "utf8");

  const reviewedMatch = raw.match(/Last reviewed:\s*(\d{4}-\d{2}-\d{2})/);
  if (!reviewedMatch) {
    findings.push({
      check: "context-unreviewed",
      severity: "warn",
      message: "no parseable 'Last reviewed: YYYY-MM-DD' line — staleness cannot be tracked",
    });
  } else {
    const age = Math.floor((Date.now() - Date.parse(reviewedMatch[1])) / 86_400_000);
    if (age > STALE_AFTER_DAYS) {
      findings.push({
        check: "context-stale",
        severity: "warn",
        message: `context last reviewed ${age} days ago (threshold ${STALE_AFTER_DAYS}) — run /groundwork doctor to refresh`,
      });
    }
  }

  const principlesSection = raw.split(/^## Active Principles\s*$/m)[1] ?? "";
  const activeIds = [...principlesSection.matchAll(/^\s*-\s*([a-z0-9-]+)\s*(?:—|--|-|$)/gm)].map(
    (m) => m[1],
  );
  if (activeIds.length === 0) {
    findings.push({
      check: "no-active-principles",
      severity: "warn",
      message: "Active Principles section is empty — run /groundwork principles to select them",
    });
  } else {
    const known = loadPrincipleIds();
    if (known) {
      for (const id of activeIds) {
        if (!known.has(id)) {
          findings.push({
            check: "unknown-principle",
            severity: "error",
            message: `active principle "${id}" does not exist in the principle library`,
          });
        }
      }
    }
  }

  const stackSection = raw.split(/^## Stack\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  for (const { file, hint, label } of MANIFEST_LANGUAGE_HINTS) {
    if (existsSync(join(root, file)) && !hint.test(stackSection)) {
      findings.push({
        check: "stack-drift",
        severity: "info",
        message: `context Stack section does not mention ${label}`,
      });
    }
  }

  return { findings };
}

export function formatDoctorHuman(result) {
  if (result.findings.length === 0) {
    return "✓ context is present, fresh, and consistent with what doctor can verify.";
  }
  const lines = [`${result.findings.length} finding(s):`, ""];
  for (const f of result.findings) {
    lines.push(`  [${f.severity}] ${f.check}: ${f.message}`);
  }
  lines.push("", "Judgment-level checks (team drift, stage drift) live in /groundwork doctor.");
  return lines.join("\n");
}
