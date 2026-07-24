/**
 * `groundwork install` / `groundwork update` — copy the router skill (and
 * optionally the standalone phase skills) into AI-harness skill directories.
 *
 * Non-interactive by design: providers are auto-detected from existing harness
 * directories and overridable with --providers. `update` is the same idempotent
 * copy. With --hooks, installs a Claude Code PostToolUse hook that runs the
 * detector on edited files.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const PROVIDERS = {
  claude: { dir: ".claude", label: "Claude Code" },
  github: { dir: ".github", label: "GitHub Copilot" },
  cursor: { dir: ".cursor", label: "Cursor" },
  agents: { dir: ".agents", label: "Codex CLI / agents standard" },
};

export function detectProviders(projectRoot) {
  const found = Object.entries(PROVIDERS)
    .filter(([, { dir }]) => existsSync(join(projectRoot, dir)))
    .map(([name]) => name);
  return found.length > 0 ? found : ["claude"];
}

function copySkill(sourceDir, targetSkillsDir, skillName) {
  const target = join(targetSkillsDir, skillName);
  mkdirSync(targetSkillsDir, { recursive: true });
  cpSync(sourceDir, target, { recursive: true });
  return target;
}

/** Copy the detector engine into the installed skill so the hook is self-contained. */
function embedEngine(installedSkillDir) {
  const scriptsDir = join(installedSkillDir, "scripts");
  cpSync(join(PACKAGE_ROOT, "cli", "engine"), join(scriptsDir, "engine"), { recursive: true });
  cpSync(join(PACKAGE_ROOT, "cli", "data"), join(scriptsDir, "data"), { recursive: true });
}

const HOOK_COMMAND =
  'node "$CLAUDE_PROJECT_DIR/.claude/skills/groundwork/scripts/hook.mjs"';

function installClaudeHook(projectRoot) {
  const settingsPath = join(projectRoot, ".claude", "settings.local.json");
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch (err) {
      throw new Error(
        `.claude/settings.local.json is not valid JSON (${err.message}) — fix it and rerun with --hooks`,
      );
    }
  }
  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];
  const already = settings.hooks.PostToolUse.some((entry) =>
    JSON.stringify(entry).includes("groundwork/scripts/hook.mjs"),
  );
  if (!already) {
    settings.hooks.PostToolUse.push({
      matcher: "Edit|Write|MultiEdit",
      hooks: [{ type: "command", command: HOOK_COMMAND }],
    });
  }
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return !already;
}

/**
 * @param {object} opts
 * @param {string} opts.projectRoot
 * @param {string[]} [opts.providers]
 * @param {boolean} [opts.allSkills] also install the 15 standalone phase skills
 * @param {boolean} [opts.global] install to the user-level directory (claude only)
 * @param {boolean} [opts.hooks] install the Claude Code detector hook
 */
export function install(opts) {
  const projectRoot = resolve(opts.projectRoot ?? process.cwd());
  const providers = opts.providers?.length ? opts.providers : detectProviders(projectRoot);
  const summary = [];

  for (const provider of providers) {
    const meta = PROVIDERS[provider];
    if (!meta) {
      throw new Error(
        `unknown provider "${provider}" — expected one of: ${Object.keys(PROVIDERS).join(", ")}`,
      );
    }
    const base =
      opts.global && provider === "claude"
        ? join(homedir(), ".claude")
        : join(projectRoot, meta.dir);
    const skillsDir = join(base, "skills");

    const routerTarget = copySkill(
      join(PACKAGE_ROOT, "skills", "groundwork"),
      skillsDir,
      "groundwork",
    );
    embedEngine(routerTarget);
    let count = 1;

    if (opts.allSkills) {
      const skillDirs = readdirSync(join(PACKAGE_ROOT, "skills"), { withFileTypes: true })
        .filter(
          (e) => e.isDirectory() && e.name !== "groundwork" && !e.name.startsWith("_"),
        )
        .map((e) => e.name);
      for (const name of skillDirs) {
        copySkill(join(PACKAGE_ROOT, "skills", name), skillsDir, name);
        count++;
      }
    }
    summary.push({ provider, label: meta.label, skillsDir, count });
  }

  let hookInstalled = false;
  if (opts.hooks && providers.includes("claude") && !opts.global) {
    hookInstalled = installClaudeHook(projectRoot);
  }

  return { providers, summary, hookInstalled };
}

export function formatInstallHuman(result, { update = false, hooks = false } = {}) {
  const verb = update ? "Updated" : "Installed";
  const lines = [];
  for (const s of result.summary) {
    lines.push(`✓ ${verb} ${s.count} skill(s) for ${s.label} at ${s.skillsDir}`);
  }
  if (hooks) {
    lines.push(
      result.hookInstalled
        ? "✓ Claude Code PostToolUse hook installed (.claude/settings.local.json)"
        : "· Claude Code hook already present — left as-is",
    );
  }
  lines.push("");
  lines.push("Reload your AI coding tool, then run: /groundwork init");
  return lines.join("\n");
}
