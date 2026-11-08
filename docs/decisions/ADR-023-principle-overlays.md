# ADR-023: Principle overlays: project and organization principles layered on the library

**Date:** 2026-11-08
**Status:** Accepted

## Context

Teams adopting groundwork at a consultancy or an enterprise need house rules (approved stacks,
compliance controls, platform standards) without forking the library. The Thoughtworks Radar
(Vol. 35) assesses an *enterprise harness*: an organization-wide layer of shared skills, decision
records, and policies that coding agents consume, kept thin and federated and shared through open
standards.

## Decision

### Resolution order

1. **Project overlay:** `.groundwork/principles/<category>/<id>.md` in the project.
2. **Org packages:** directories listed in `.groundwork/config.json` as
   `{"principles": {"overlays": ["node_modules/@acme/groundwork-principles"]}}`, in the listed
   order, each laid out like `principles/`. They must resolve inside the project (a package
   installed into it), so a config entry can't make groundwork read arbitrary paths.
3. **Built-in library.**

The first layer that defines an id wins.

### Collisions

An overlay id that matches a built-in, or one defined in another overlay layer, is an error unless
the winning file declares `overrides: <id>` (its own id). Then it replaces that principle on
purpose. Two files with the same id in the same layer are always an error. Silent shadowing would
let a house rule quietly replace library guidance, so it is never allowed.

### Same format, same checks

Overlays use the library's schema (`principles/_schema`, which gains the optional `overrides`
field) and required sections. `npm run validate` checks the example overlay and accepts extra
directories as arguments for org package authors. Consumers get the same checks without
dependencies: `doctor` validates every overlay file (frontmatter fields, category, sources,
`applies_when`, section order) and reports `overlay-invalid` errors. The resolver
(`skills/groundwork/scripts/overlays.mjs`) is dependency-free because it ships inside installed
skills; the CLI's doctor imports the same module.

### Where overlays take effect

- The context loader prints an `OVERLAY <id> <path> <source>` line for each one, and the router
  reads it from that path and honors it like a built-in (`rule:router-honor-principles`).
- `/groundwork principles` scores overlay `applies_when` like library principles.
- `doctor` accepts overlay ids as active principles and lists the active overlays.
- Detector rules stay built-in. An overlay adds guidance, not deterministic checks; a team that
  wants a check proposes a detector rule.

### Sourcing expectations

The library's rule (distill and attribute, never invent) applies to overlays too: each needs at
least one source. For a house rule, that source is the organization's own standard, which may be
internal. The example overlay (`examples/overlay/`) shows the shape.

## Consequences

- An organization can ship its standards as a package and have every project's agents apply them,
  without forking groundwork.
- Overrides are explicit and visible in `doctor`, so replacing library guidance is a reviewable
  choice.
- Overlay content isn't checked against primary sources the way library principles are; that's
  the overlay owner's responsibility.
