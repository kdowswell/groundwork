# Plugin evals (`claude plugin eval`)

End-to-end cases that run real Claude Code with the groundwork plugin loaded, and again
without it, so each case reports a with/without delta. They cover what the other two harnesses
can't: the real Skill tool, the lifecycle hooks, and the `groundwork-builder` subagent.

| Case | What it checks |
|---|---|
| `handoff-stale-spec` | `rule:router-verify-handoff`, `rule:router-approval-is-the-users`, `rule:router-cli-package`: a spec edited after approval is verified, its diff shown, and acceptance re-asked |
| `spec-builder-check` | ADR-007 builder check: the `groundwork-builder` subagent runs, the spec gets a Builder Check section, and every user question comes in one message |
| `render-offer` | `rule:router-offer-render`: a long spec gets a review-page offer at acceptance; no server and no decision without the user |
| `delta-rides-with-code` | ADR-012, `rule:router-delta-rides-with-code`: a later session implements an approved change plan, applies its delta to the spec, and records the amendment without a second approval |
| `plan-nudge` | ADR-013: several source files changed with no plan in sight get one advisory mention of `/groundwork plan`; the work still finishes |
| `stop-hook-secret` | ADR-006 hooks: an edit to a file holding a credential ends with the key moved out of source |

```bash
npm run eval:plugin                                   # all cases, 2 runs each, with and without the plugin
npm run eval:plugin -- --case render-offer --runs 1   # one case, one run per arm
```

- **Credentials.** Runs use your Claude Code login. An exported `ANTHROPIC_API_KEY` takes
  precedence, so if it is stale every run fails with "Invalid API key"; unset it for the run
  (`env -u ANTHROPIC_API_KEY npm run eval:plugin`).
- **Cost.** Each run is a full Claude Code session: about $0.15–$0.60 per run at the default
  model, so the full suite (6 cases × 2 runs × 2 arms) is roughly $7. Add `--max-cost-usd` for a
  hard ceiling, and `--model` / `--judge-model` to pin models in CI.
- **Scaffolds.** Each run starts in an empty directory. A case's `scaffold.sh` seeds it
  (`_lib/workspace.sh`: project context, fixtures from `_fixtures/`, and a local link to this
  checkout so `npx @kdowswell/groundwork` resolves; the sandbox blocks the npm registry).
  `--scaffold` runs these scripts as you, which is why `eval:plugin` passes it: only use it on
  cases from this repo.
- **Graders** are declarative (`tool_used`, `regex`, `file_exists`, `llm`); there are no
  code graders. A "never" check is `tool_used` with `min: 0` and `max: 0`. `arm: with-only`
  marks a plugin-fired indicator that the no-plugin arm can't satisfy (the builder subagent).
- Results land in `eval/plugin/results/` (git-ignored), with a self-contained `report.html`.

## Cost and usage checks

- `claude --plugin-dir . plugin details groundwork` projects each skill's always-on cost (its
  name and description, paid in every session) and on-invoke cost (its body).
- `/skill-doctor` in a session shows each installed skill's listing cost and how often it has
  actually been used, from your local history. It is a periodic review, not a CI gate.
