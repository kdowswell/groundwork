#!/usr/bin/env node
/**
 * groundwork CLI — deterministic architecture checks and skill installation.
 *
 *   npx groundwork detect [path] [--json] [--strict]
 *   npx groundwork doctor [path] [--json]
 *   npx groundwork install [--providers=claude,github,cursor,agents] [--all-skills] [--global] [--hooks]
 *   npx groundwork update  (same as install; idempotent)
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detect, countBySeverity } from "../engine/detect.mjs";
import { formatHuman, formatJson } from "../engine/report.mjs";
import { doctor, formatDoctorHuman } from "../commands/doctor.mjs";
import { install, formatInstallHuman, PROVIDERS } from "../commands/install.mjs";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (const token of argv) {
    if (token.startsWith("--")) {
      const [key, value] = token.slice(2).split("=");
      args.flags[key] = value ?? true;
    } else {
      args._.push(token);
    }
  }
  return args;
}

const HELP = `groundwork — architecture skills, principles, and deterministic checks for AI coding agents

Usage:
  groundwork detect [path]     scan for production-readiness gaps and AI-slop tells
      --json                   CI-friendly JSON output
      --strict                 exit 1 on warnings, not just errors
  groundwork doctor [path]     check .groundwork/context.md for drift
      --json                   JSON output
  groundwork install           install the /groundwork router skill into detected harnesses
      --providers=a,b          ${Object.keys(PROVIDERS).join(", ")} (default: auto-detect)
      --all-skills             also install the 15 standalone phase skills
      --global                 user-level install (claude only)
      --hooks                  install Claude Code lifecycle hooks (not needed with the plugin)
  groundwork update            refresh an existing install (same as install)
  groundwork help              this message
  groundwork version           print version

Every detector finding names the principle it enforces. Waive one with a comment:
  groundwork-disable <rule-id>: reason
or per line with groundwork-disable-line / groundwork-disable-next-line, or via
.groundwork/config.json: {"detector": {"ignoreRules": [], "ignoreFiles": []}}
`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "help";

  switch (command) {
    case "detect": {
      const target = args._[1] ?? ".";
      const result = detect(target);
      console.log(args.flags.json ? formatJson(result) : formatHuman(result));
      const counts = countBySeverity(result.findings);
      const failing = counts.error + (args.flags.strict ? counts.warn : 0);
      process.exit(failing > 0 ? 1 : 0);
      break;
    }
    case "doctor": {
      const result = doctor(resolve(args._[1] ?? "."));
      console.log(
        args.flags.json ? JSON.stringify({ version: 1, ...result }, null, 2) : formatDoctorHuman(result),
      );
      process.exit(result.findings.length > 0 ? 1 : 0);
      break;
    }
    case "install":
    case "update": {
      const providers =
        typeof args.flags.providers === "string"
          ? args.flags.providers.split(",").map((p) => p.trim()).filter(Boolean)
          : undefined;
      const result = install({
        projectRoot: process.cwd(),
        providers,
        allSkills: Boolean(args.flags["all-skills"]),
        global: Boolean(args.flags.global),
        hooks: Boolean(args.flags.hooks),
      });
      console.log(
        formatInstallHuman(result, {
          update: command === "update",
          hooks: Boolean(args.flags.hooks),
        }),
      );
      break;
    }
    case "version": {
      const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
      console.log(pkg.version);
      break;
    }
    case "help":
    case "--help":
      console.log(HELP);
      break;
    default:
      console.error(`unknown command "${command}"\n`);
      console.log(HELP);
      process.exit(2);
  }
}

try {
  main();
} catch (err) {
  console.error(`groundwork: ${err.message}`);
  process.exit(2);
}
