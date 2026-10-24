# Harness support

Where `groundwork install` puts skills, per provider. Point-in-time (last verified
2026-07-24) — harness capabilities move fast; verify against official docs before relying on
a "only X supports Y" claim.

| Provider flag | Harness | Skills directory | Hook support |
|---|---|---|---|
| `claude` | Claude Code | `.claude/skills/` (project) or `~/.claude/skills/` (`--global`) | Yes — SessionStart, PostToolUse and Stop hooks: shipped by the plugin (`hooks/hooks.json`), or `--hooks` adds them to `.claude/settings.local.json` |
| `github` | GitHub Copilot | `.github/skills/` | Not installed by groundwork today |
| `cursor` | Cursor | `.cursor/skills/` (requires Agent Skills enabled in settings) | Not installed by groundwork today |
| `agents` | Codex CLI and other `.agents/`-standard tools | `.agents/skills/` | Not installed by groundwork today |

Notes:

- All targets follow the [Agent Skills specification](https://agentskills.io/specification):
  a `groundwork/SKILL.md` router with `reference/`, `scripts/`, and synced
  `reference/principles/` subdirectories. Frontmatter beyond `name`/`description`
  (`argument-hint`, `user-invocable`, groundwork's `phase`/`entry_criteria`/…) is silently
  ignored by harnesses that don't support it.
- The installed router is self-contained: `groundwork install` embeds the detector engine at
  `skills/groundwork/scripts/engine/` so the Claude Code hook works without an npm install
  in the consumer repo.
- `--all-skills` additionally installs the 15 standalone phase skills for harnesses/users
  that prefer direct invocation (e.g. `/brownfield-safe-change-plan`) over the router. Each
  sets `disable-model-invocation: true` (ADR-011), so it runs when typed by name but isn't
  listed to the model; the router is the model's only entry point. Harnesses that ignore the
  field still auto-invoke them.
- Official skills docs: [Claude Code](https://code.claude.com/docs/en/skills),
  [Cursor](https://cursor.com/docs/context/skills),
  [Codex CLI](https://developers.openai.com/codex/skills),
  [GitHub Copilot](https://code.visualstudio.com/docs/copilot/customization/agent-skills).
