#!/usr/bin/env node
/**
 * groundwork CLI — deterministic architecture checks and skill installation.
 *
 *   npx @kdowswell/groundwork detect [path] [--json] [--strict]
 *   npx @kdowswell/groundwork doctor [path] [--json]
 *   npx @kdowswell/groundwork install [--providers=claude,github,cursor,agents] [--all-skills] [--global] [--hooks]
 *   npx @kdowswell/groundwork update  (same as install; idempotent)
 *   npx @kdowswell/groundwork approve <artifact> --checkpoint=<id> [--decision=...] [--notes=...]
 *   npx @kdowswell/groundwork verify [artifact] [--json] [--diff]
 *   npx @kdowswell/groundwork render <artifact> [--serve] [--checkpoint=<id>] [--port=<n>]
 */
import { readFileSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detect, countBySeverity } from "../engine/detect.mjs";
import { formatHuman, formatJson } from "../engine/report.mjs";
import { doctor, formatDoctorHuman } from "../commands/doctor.mjs";
import { install, formatInstallHuman, PROVIDERS } from "../commands/install.mjs";
import {
  approve,
  verify,
  formatApproveHuman,
  formatVerifyHuman,
  formatVerifyDiff,
  DECISIONS,
} from "../commands/approvals.mjs";
import { render, serve } from "../commands/render.mjs";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (const token of argv) {
    if (token.startsWith("--")) {
      // Split on the first "=" only, so values such as --notes may contain "=".
      const eq = token.indexOf("=");
      if (eq === -1) args.flags[token.slice(2)] = true;
      else args.flags[token.slice(2, eq)] = token.slice(eq + 1);
    } else {
      args._.push(token);
    }
  }
  return args;
}

const HELP = `groundwork — architecture skills, principles, and deterministic checks for AI coding agents

Run as \`npx @kdowswell/groundwork <command>\`, or \`groundwork <command>\` once installed in the
project. (The unscoped \`groundwork\` package on npm is unrelated.)

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
  groundwork approve <file>    record a Checkpoint decision, pinned to the file's SHA-256
      --checkpoint=<id>        required: "<skill>/<checkpoint>" or a kebab-case id
      --decision=<d>           ${DECISIONS.join(" | ")} (default: approved)
      --notes=<text>           optional context for the decision
  groundwork verify [file]     report approval receipts that are stale or missing their file;
                               with a file, exit 0 only if it has a fresh, non-rejected receipt
      --diff                   also print what changed since each stale decision
      --json                   JSON output
  groundwork render <file>     write a review page for a spec, sketch, or data model
                               to .groundwork/review/ (self-contained HTML)
      --serve                  serve it on 127.0.0.1 with Approve / Request changes;
                               the decision is recorded as an approval receipt
      --checkpoint=<id>        checkpoint to record (default: from the artifact's title)
      --port=<n>               port for --serve (default: any free port)
  groundwork help              this message
  groundwork version           print version

Every detector finding names the principle it enforces. Waive one with a comment:
  groundwork-disable <rule-id>: reason
or per line with groundwork-disable-line / groundwork-disable-next-line, or via
.groundwork/config.json: {"detector": {"ignoreRules": [], "ignoreFiles": []}}
`;

async function main() {
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
    case "approve": {
      const artifact = args._[1];
      if (!artifact) throw new Error("approve needs an artifact path");
      const result = approve(process.cwd(), artifact, {
        checkpoint: args.flags.checkpoint,
        decision: args.flags.decision,
        notes: typeof args.flags.notes === "string" ? args.flags.notes : undefined,
      });
      console.log(formatApproveHuman(result));
      break;
    }
    case "verify": {
      const result = verify(process.cwd(), args._[1]);
      console.log(
        args.flags.json ? JSON.stringify({ version: 1, ...result }, null, 2) : formatVerifyHuman(result),
      );
      if (args.flags.diff && !args.flags.json) {
        const diff = formatVerifyDiff(process.cwd(), result);
        if (diff) console.log(`\n${diff}`);
      }
      process.exit(result.ok ? 0 : 1);
      break;
    }
    case "render": {
      const artifact = args._[1];
      if (!artifact) throw new Error("render needs an artifact path");
      const checkpoint = typeof args.flags.checkpoint === "string" ? args.flags.checkpoint : undefined;
      if (!args.flags.serve) {
        const result = render(process.cwd(), artifact, { checkpoint });
        console.log(`✓ Review page for ${result.artifactPath}: ${relative(process.cwd(), result.path)}`);
        console.log("  Open it in a browser. Re-run with --serve to approve or request changes from the page.");
        break;
      }
      const port = typeof args.flags.port === "string" ? Number(args.flags.port) : undefined;
      const { url, done, rendered } = await serve(process.cwd(), artifact, { checkpoint, port });
      console.log(`Reviewing ${rendered.artifactPath} at ${url}`);
      console.log("Open it in a browser and decide there. Ctrl+C to stop without deciding.");
      const outcome = await done;
      console.log(
        outcome.decision
          ? `✓ Recorded ${outcome.decision} for ${rendered.artifactPath} at ${rendered.checkpoint}`
          : "· No decision recorded (server idled out).",
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
  await main();
} catch (err) {
  console.error(`groundwork: ${err.message}`);
  process.exit(2);
}
