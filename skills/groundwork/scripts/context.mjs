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
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

const STALE_AFTER_DAYS = 90;

function findContextFile(startDir) {
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

function main() {
  const contextPath = findContextFile(process.cwd());

  if (!contextPath) {
    console.log("CONTEXT_MISSING");
    console.log(
      "No .groundwork/context.md found. For Define or Evolve commands, offer /groundwork init " +
        "first (never block on it). If the user declines, proceed and state the defaults you assume.",
    );
    return;
  }

  const raw = readFileSync(contextPath, "utf8");
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

  const principlesSection = raw.split(/^## Active Principles\s*$/m)[1] ?? "";
  const principleLines = principlesSection
    .split("\n")
    .filter((l) => /^\s*-\s*\S/.test(l) && !/run \/groundwork principles/i.test(l));
  const noPrinciples = principleLines.length === 0;

  console.log(`CONTEXT_OK ${contextPath}`);
  for (const reason of staleReasons) console.log(`CONTEXT_STALE ${reason}`);
  if (noPrinciples) console.log("CONTEXT_NO_PRINCIPLES");
  console.log("---BEGIN PROJECT CONTEXT---");
  console.log(raw.trimEnd());
  console.log("---END PROJECT CONTEXT---");
  console.log(
    "Directives: honor this context in every command. Report staleness to the user once; " +
      "repair only via /groundwork doctor when asked. Do not rerun this script this session.",
  );
}

main();
