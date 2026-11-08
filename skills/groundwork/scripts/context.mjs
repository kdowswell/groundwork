#!/usr/bin/env node
/**
 * groundwork session context loader.
 *
 * Locates .groundwork/context.md by walking up from the current working
 * directory, prints it between directive markers, and reports staleness
 * signals. Zero dependencies; informational only (always exits 0).
 *
 * Directives emitted (one per line, machine-readable prefix):
 *   CONTEXT_OK <path>          context found and fresh
 *   CONTEXT_MISSING            no context file — offer /groundwork init
 *   CONTEXT_STALE <reason>     context found but needs attention (report, don't repair)
 *   CONTEXT_NO_PRINCIPLES      Active Principles section is empty — offer /groundwork principles
 *   STATUS <kind> <path> <state>   one per groundwork artifact found (status.mjs)
 *   STATUS <kind> — missing        a design artifact (spec, architecture, data-model) not found
 *   NEXT <command> — <reason>      the one command worth running next
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatStatus, projectStatus } from "./status.mjs";

const STALE_AFTER_DAYS = 90;

export function findContextFile(startDir) {
  let dir = resolve(startDir);
  const { root } = parse(dir);
  while (true) {
    const candidate = join(dir, ".groundwork", "context.md");
    if (existsSync(candidate)) return candidate;
    if (dir === root || existsSync(join(dir, ".git"))) {
      // Stop at the repository boundary so a parent project's context never leaks in.
      const inRepo = join(dir, ".groundwork", "context.md");
      return existsSync(inRepo) ? inRepo : null;
    }
    dir = dirname(dir);
  }
}

function daysSince(dateStr) {
  const then = Date.parse(dateStr);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/**
 * Parse a context file's freshness and Active Principles.
 * @param {string} raw context.md contents
 * @returns {{staleReasons: string[], principleLines: string[], principleIds: string[]}}
 */
export function analyzeContext(raw) {
  const staleReasons = [];

  const reviewedMatch = raw.match(/Last reviewed:\s*(\d{4}-\d{2}-\d{2})/);
  if (!reviewedMatch) {
    staleReasons.push("no parseable 'Last reviewed: YYYY-MM-DD' line");
  } else {
    const age = daysSince(reviewedMatch[1]);
    if (age !== null && age > STALE_AFTER_DAYS) {
      staleReasons.push(`last reviewed ${age} days ago (threshold ${STALE_AFTER_DAYS})`);
    }
  }

  // Only the Active Principles section, up to the next heading.
  const principlesSection = (raw.split(/^## Active Principles\s*$/m)[1] ?? "").split(/^#{1,2} /m)[0];
  const principleLines = principlesSection
    .split("\n")
    .filter((l) => /^\s*-\s*\S/.test(l) && !/run \/groundwork principles/i.test(l));
  const principleIds = principleLines.map((l) => l.replace(/^\s*-\s*/, "").split(/[\s—:]/)[0]);

  return { staleReasons, principleLines, principleIds };
}

/** The project root: the context file's repository, else the nearest .git, else cwd. */
function projectRoot(cwd, contextPath) {
  if (contextPath) return dirname(dirname(contextPath));
  let dir = resolve(cwd);
  const { root } = parse(dir);
  while (dir !== root) {
    if (existsSync(join(dir, ".git"))) return dir;
    dir = dirname(dir);
  }
  return resolve(cwd);
}

function printStatus(root) {
  let lines;
  try {
    lines = formatStatus(projectStatus(root));
  } catch {
    return; // Status is a convenience; never fail the loader over it.
  }
  console.log("---BEGIN STATUS---");
  for (const line of lines) console.log(line);
  console.log("---END STATUS---");
}

function main() {
  const contextPath = findContextFile(process.cwd());

  if (!contextPath) {
    console.log("CONTEXT_MISSING");
    console.log(
      "No .groundwork/context.md found. For commands that design something new or change a running system, offer /groundwork init " +
        "first (never block on it). If the user declines, proceed and state the defaults you assume.",
    );
    printStatus(projectRoot(process.cwd(), null));
    return;
  }

  const raw = readFileSync(contextPath, "utf8");
  const { staleReasons, principleLines } = analyzeContext(raw);
  const noPrinciples = principleLines.length === 0;

  console.log(`CONTEXT_OK ${contextPath}`);
  for (const reason of staleReasons) console.log(`CONTEXT_STALE ${reason}`);
  if (noPrinciples) console.log("CONTEXT_NO_PRINCIPLES");
  console.log("---BEGIN PROJECT CONTEXT---");
  console.log(raw.trimEnd());
  console.log("---END PROJECT CONTEXT---");
  printStatus(projectRoot(process.cwd(), contextPath));
  console.log(
    "Directives: honor this context in every command. Report staleness to the user once; " +
      "repair only via /groundwork doctor when asked. Use STATUS and NEXT for a bare /groundwork " +
      "and for each command's next step. Do not rerun this script this session.",
  );
}

// Run as a script; stay importable for the hook dispatcher.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
