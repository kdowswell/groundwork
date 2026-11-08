/**
 * `groundwork doctor` — deterministic drift checks for .groundwork/context.md.
 * The /groundwork doctor playbook layers judgment on top of these findings;
 * this command only reports what is mechanically checkable.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verify } from "./approvals.mjs";
import { openSuggestions } from "./suggest.mjs";
import { resolveOverlays } from "../../skills/groundwork/scripts/overlays.mjs";

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
 * Approval receipts that no longer hold (ADR-007). Reported, never repaired:
 * only the user can re-approve.
 */
function approvalFindings(root) {
  const severity = { stale: "warn", missing: "warn", invalid: "error" };
  return verify(root)
    .receipts.filter((r) => r.status !== "fresh")
    .map((r) => ({
      check: `approval-${r.status}`,
      severity: severity[r.status],
      message:
        r.status === "invalid"
          ? `${r.receiptFile}: ${r.message}`
          : r.status === "stale"
            ? `${r.artifact} changed after its ${r.decision} decision at ${r.checkpoint}${r.tier ? ` (${r.tier} risk)` : ""} — re-ask the approval`
            : `${r.artifact} (${r.checkpoint}) no longer exists — remove ${r.receiptFile} or restore it`,
    }));
}

/**
 * Run doctor checks against a project root.
 * @returns {{findings: Array<{check: string, severity: string, message: string}>}}
 */
/**
 * Principle ids listed under `## Active Principles` in a context file. Reading stops at the
 * next heading or at a "Suppressed" / "Excluded" label, so excluded ids never count as active.
 */
export function activePrincipleIds(raw) {
  const after = raw.replace(/\r\n/g, "\n").split(/^## Active Principles\s*$/m)[1] ?? "";
  const ids = [];
  for (const line of after.split("\n")) {
    if (/^#{1,6}\s/.test(line) || /^\s*\**\s*(suppressed|excluded|not selected|left out)\b/i.test(line)) break;
    const m = line.match(/^\s*-\s*([a-z0-9-]+)\s*(?:—|--|-|$)/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

/** Bullet names under a "## Bounded Contexts" heading (the "(optional)" suffix is allowed). */
function boundedContexts(raw) {
  const section = raw.split(/^## Bounded Contexts\b.*$/m)[1]?.split(/^## /m)[0] ?? "";
  return section
    .split("\n")
    .map((l) => l.match(/^\s*-\s*([^—:{}\n]+?)\s*(?:—|:|-\s|$)/)?.[1]?.trim())
    .filter((name) => name && !/^\(.*\)$/.test(name));
}

/** Rows of the "## Glossary" table as {term, context}; placeholder rows are skipped. */
function glossaryRows(raw) {
  const section = raw.split(/^## Glossary\b.*$/m)[1]?.split(/^## /m)[0];
  if (section === undefined) return null;
  const rows = [];
  for (const line of section.split("\n")) {
    if (!/^\s*\|/.test(line) || /^\s*\|\s*-/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3 || /^term$/i.test(cells[0]) || /\{\{/.test(line)) continue;
    rows.push({ term: cells[0].replace(/[*`]/g, "").toLowerCase(), context: cells[2].replace(/[*`]/g, "") });
  }
  return rows;
}

/**
 * Glossary checks (#30). Advisory: info severity, and only when the context declares the
 * bounded contexts the check depends on.
 */
function glossaryFindings(raw) {
  const findings = [];
  const contexts = boundedContexts(raw);
  const rows = glossaryRows(raw);
  if ((rows === null || rows.length === 0) && contexts.length > 1) {
    findings.push({
      check: "glossary-missing",
      severity: "info",
      message: `context lists ${contexts.length} bounded contexts but no Glossary — /groundwork data-model can write one`,
    });
    return findings;
  }
  if (!rows) return findings;
  const known = new Set(contexts.map((c) => c.toLowerCase()));
  const seen = new Map();
  for (const { term, context } of rows) {
    if (known.size > 0 && context && !known.has(context.toLowerCase())) {
      findings.push({
        check: "glossary-drift",
        severity: "info",
        message: `glossary term "${term}" names context "${context}", which Bounded Contexts doesn't list`,
      });
    }
    const contextsForTerm = seen.get(term) ?? [];
    if (contextsForTerm.includes(context.toLowerCase())) {
      findings.push({
        check: "glossary-drift",
        severity: "info",
        message: `glossary term "${term}" appears twice in the same context — merge the rows or qualify one`,
      });
    }
    seen.set(term, [...contextsForTerm, context.toLowerCase()]);
  }
  return findings;
}

export function doctor(root) {
  const findings = approvalFindings(root);
  const contextPath = join(root, ".groundwork", "context.md");

  if (!existsSync(contextPath)) {
    findings.push({
      check: "context-missing",
      severity: "error",
      message: "no .groundwork/context.md — run /groundwork init to create it",
    });
    return { findings, suggestions: openSuggestions(root).length };
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

  // Overlays (ADR-023): the project's and org's own principles count as known ids.
  const builtIn = loadPrincipleIds();
  const overlay = resolveOverlays(root, builtIn ?? new Set());
  for (const p of overlay.problems) {
    findings.push({ check: "overlay-invalid", severity: "error", message: `${p.path}: ${p.message}` });
  }
  const activeIds = activePrincipleIds(raw);
  if (activeIds.length === 0) {
    findings.push({
      check: "no-active-principles",
      severity: "warn",
      message: "Active Principles section is empty — run /groundwork principles to select them",
    });
  } else {
    const known = builtIn ? new Set([...builtIn, ...overlay.principles.map((p) => p.id)]) : null;
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

  findings.push(...glossaryFindings(raw));

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

  return { findings, suggestions: openSuggestions(root).length, overlays: overlay.principles };
}

export function formatDoctorHuman(result) {
  // Open suggestions are a count, not a finding: they don't fail doctor (ADR-021).
  let note = result.suggestions
    ? `\n· ${result.suggestions} open suggestion(s) in .groundwork/suggestions.jsonl — /groundwork learn reviews them.`
    : "";
  if (result.overlays?.length) {
    note += `\n· Overlay principles (ADR-023): ${result.overlays
      .map((p) => `${p.id}${p.overrides ? " (overrides built-in)" : ""} from ${p.source}`)
      .join(", ")}`;
  }
  if (result.findings.length === 0) {
    return `✓ context is present, fresh, and consistent with what doctor can verify.${note}`;
  }
  const lines = [`${result.findings.length} finding(s):`, ""];
  for (const f of result.findings) {
    lines.push(`  [${f.severity}] ${f.check}: ${f.message}`);
  }
  lines.push("", "Judgment-level checks (team drift, stage drift) live in /groundwork doctor.");
  return lines.join("\n") + note;
}
