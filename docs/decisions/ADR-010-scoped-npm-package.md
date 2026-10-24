# ADR-010: Publish as the scoped npm package @kdowswell/groundwork

**Date:** 2026-10-24
**Status:** Accepted

## Context

The package was named `groundwork`, but that name on npm belongs to an unrelated project ("Scaffold
out any project quickly"). Every documented command was `npx groundwork …`. In a project without
groundwork installed locally, npx resolves that name from the registry, so a user, or an agent
following a playbook, would download and run a stranger's code. Playbooks tell agents to run the
CLI at Checkpoints (`approve`, `verify`, `render`), so the exposure is automated, not just a typo
risk for humans.

## Decision

- Publish as **`@kdowswell/groundwork`** (`publishConfig.access: public`). A scope only its owner
  can publish to rules out lookalikes, and it matches the GitHub repository.
- Keep the **bin name `groundwork`**. Installed as a dev dependency, the command stays
  `groundwork <command>` (and `npx groundwork` resolves to the local bin).
- Every documented and agent-facing invocation uses the full name:
  `npx @kdowswell/groundwork <command>`. This works with or without a local install and can never
  resolve to the other package.
- The router carries `rule:router-cli-package`: run the CLI by its scoped name and never as bare
  `npx groundwork`. The behavior harness accepts both spellings so a test can assert the bare one
  never appears.
- Accepted ADRs keep their original command examples. Read `npx groundwork` in ADR-004 through
  ADR-009 as `npx @kdowswell/groundwork`.

## Consequences

**Positive:** no documented path runs code from an unrelated package. The scope is owned, so the
name can't be squatted later.
**Negative:** commands are longer to type. Publishing needs an npm account (or organization) named
`kdowswell`. Existing local installs keyed as `groundwork` (for example `"groundwork": "file:…"`)
should be reinstalled under the new name.
**Neutral:** the plugin marketplace entry (`kdowswell/groundwork`) is a GitHub path and is unaffected.

## Alternatives Considered

- **An unscoped free name (`groundwork-skills`, `groundworkai`):** rejected. Shorter, but nothing
  prevents a lookalike, and agents would still need to be kept away from bare `groundwork`.
- **Rename the bin as well:** rejected. Installed users and the hooks' messages keep the familiar
  command, and the bin name is only reachable through a local install, which is already the right
  package.
- **`npx --no-install groundwork` in playbooks:** rejected. It fails rather than falling back when
  groundwork isn't installed, and the flag's behavior has varied across npm versions.
