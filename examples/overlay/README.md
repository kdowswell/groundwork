# Example: an organization overlay

`.groundwork/principles/security/approved-data-stores.md` is a house rule written in the principle
library's format ([ADR-023](../../docs/decisions/ADR-023-principle-overlays.md)). Copy the
`.groundwork/principles/` directory into a project, or publish it as a package and list it in the
project's `.groundwork/config.json`:

```json
{ "principles": { "overlays": ["node_modules/@example/groundwork-principles"] } }
```

Then `npx @kdowswell/groundwork doctor` lists the overlay, `/groundwork principles` can select it,
and the router loads it like a built-in principle. To replace a built-in principle instead of adding
one, give the overlay the same id and add `overrides: <id>` to its frontmatter.
