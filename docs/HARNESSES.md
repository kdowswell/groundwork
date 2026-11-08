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
- `--all-skills` additionally installs the standalone phase skills for harnesses/users
  that prefer direct invocation (e.g. `/brownfield-safe-change-plan`) over the router. Each
  sets `disable-model-invocation: true` (ADR-011), so it runs when typed by name but isn't
  listed to the model; the router is the model's only entry point. Harnesses that ignore the
  field still auto-invoke them.
- Official skills docs: [Claude Code](https://code.claude.com/docs/en/skills),
  [Cursor](https://cursor.com/docs/context/skills),
  [Codex CLI](https://developers.openai.com/codex/skills),
  [GitHub Copilot](https://code.visualstudio.com/docs/copilot/customization/agent-skills).

## Installing and pinning a version

groundwork ships hooks and a CLI that run in CI, so pin a version rather than tracking `main`.
Last verified 2026-11-08 (APM 0.35.0, skills CLI latest, Claude Code plugin marketplaces).

| Channel | Install | Pin |
|---|---|---|
| npm CLI + installer | `npx @kdowswell/groundwork install` | `npm i -D @kdowswell/groundwork@<version>`, then `npx @kdowswell/groundwork install`; the lockfile pins it |
| Claude Code plugin | `/plugin marketplace add kdowswell/groundwork` | The public marketplace tracks the repository. To pin, list groundwork in your own marketplace with a ref: `{ "name": "groundwork", "source": { "source": "github", "repo": "kdowswell/groundwork", "ref": "v<version>" } }` (a `sha` field pins a commit) |
| [APM](https://microsoft.github.io/apm/) | `apm install kdowswell/groundwork` | `apm install kdowswell/groundwork#v<version>` (or a commit SHA); `apm.lock.yaml` records the resolved commit |
| skills.sh | `npx skills add kdowswell/groundwork --skill groundwork` | `npx skills add https://github.com/kdowswell/groundwork/tree/v<version>/skills/groundwork`; `skills-lock.json` records the ref |

Notes:

- **APM needs no manifest.** It reads the Agent Skills layout and the plugin files directly:
  `apm install kdowswell/groundwork` installs the router, the phase skills, the
  `groundwork-builder` agent, and the three lifecycle hooks into `.claude/`. APM copies the hook
  script and the modules it imports, but not the detector engine, so the hooks find the engine in
  the project's own `node_modules`. Add `npm i -D @kdowswell/groundwork` for the after-edit and
  stop scans. Without it, the hooks still give the session-start digest and stay silent otherwise.
- **skills.sh** installs skills only: no hooks and no CLI. Pair it with the npm CLI for `approve`,
  `verify`, `render`, and `detect`.
- Whatever the channel, the CLI version the agent runs (`npx @kdowswell/groundwork`) should match the
  skills version, because playbooks name CLI flags. A project-local dev dependency guarantees that.

## Composing with other packs

groundwork stops at the plan by design. It covers the decisions that are expensive to reverse and
the approvals that gate them, then hands off to whatever pack you use for building. It doesn't grow
its own TDD, debugging, or shipping skills.

| Stage | Who | What carries over |
|---|---|---|
| Decide | groundwork: `start` / `continue`, or `plan` for a running system | Approved spec, architecture, data model, or change plan, each pinned by a receipt |
| Build | A build-phase pack (Superpowers, Addy Osmani's agent-skills `/build`, Spec Kit `/implement`, a long-running harness) | The approved documents, plus a task list when you ask for one |
| Check | groundwork: `check` in the pull request | The diff against the approved plan's delta |

Installed side by side, the packs don't collide: groundwork's model-visible surface is one router
skill whose description names its commands and says it's not for writing feature code (ADR-011),
so implementation requests go to the build pack.

### Task list contract

Ask for a task list with `/groundwork plan --tasks <change>` (or `spec --tasks`), or by naming the
tool you're handing off to. groundwork writes `.groundwork/tasks/<slug>.json`:

```json
[
  {
    "id": "T1",
    "title": "Per-team business-hours calendars",
    "acceptance": "Idle time for a team with a 9-5 calendar excludes 17:00-09:00; tests/idle.test.ts passes",
    "delta_ref": "Added: Team calendars",
    "passes": false
  }
]
```

| Field | Meaning |
|---|---|
| `id` | Stable task id (`T1`, `T2`, …) |
| `title` | One line: the outcome, not the activity |
| `acceptance` | The check that proves it done, runnable without the conversation that produced it |
| `delta_ref` (plan) or `criterion_ref` (spec) | The plan delta line or spec criterion this task implements |
| `passes` | `false` until its acceptance check has run and passed |

The rule for whoever implements (`rule:router-tasks-flip-only`): work one task at a time and flip
`passes` to `true` only after its acceptance check runs and passes. Never delete, reorder, reword,
or add tasks, and never weaken an acceptance check. A task that can't pass as written goes back to
the user or the plan. JSON makes rewriting obvious in review, the same reason long-running
harnesses keep their feature list as JSON. The receipt pins the plan, not the task list:
regenerate the list when the plan changes.
