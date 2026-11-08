# ADR-024: Client-side architecture: cover the expensive-to-reverse decisions, not frontend technique

**Date:** 2026-11-08
**Status:** Proposed

This is a scope decision for the maintainer. It records a recommendation and the candidates it
would admit. It becomes Accepted, with follow-up issues opened for each accepted candidate, only
when the maintainer accepts it. The session-start hook lists it as undecided until then.

## Context

The library has no client-side principle. "Accessibility" appears in six files and "frontend" in
four, always in passing. Build-phase packs ship frontend technique (Addy Osmani's
`frontend-ui-engineering` and `/webperf`), and agents increasingly build the client as well as the
server. Two client-side choices are expensive to reverse and are made early, often by an agent
without anyone deciding them:

- **Rendering strategy** (server, client, static, streaming or islands) shapes routing, data
  fetching, caching, hosting, and SEO. Changing it later is close to a rewrite.
- **Accessibility** retrofitted after launch costs far more than designing for it. Many products
  also carry a legal accessibility requirement.

The risk is scope creep into framework-specific technique, which the library's technology-neutral
rule forbids.

## Recommendation: yes, narrowly

Apply ADR-015's test to each candidate: (1) an architectural decision that is expensive to reverse
and that an agent makes while building, (2) distilled from established, vendor-neutral sources,
(3) one concept, independent of any tool.

| Candidate | Passes the test? | Recommendation |
|---|---|---|
| **Rendering strategy**: choose where and when each route renders by its data freshness, interactivity, and SEO needs, and record the choice | Yes: hard to reverse, made at the first route, and the source ([web.dev, "Rendering on the Web"](https://web.dev/articles/rendering-on-the-web)) describes the patterns without tying them to a framework | **Accept** as a `design/` principle; cite it from `architecture` |
| **Accessibility by design**: semantic structure, keyboard operability, and a WCAG conformance target chosen up front and checked in CI | Yes: retrofits are costly, the target is a product decision, and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) is the vendor-neutral standard | **Accept** as a `delivery/` principle; cite it from `spec` (the conformance target as a success criterion) and `review`; candidate detector rules (images without alt text, form fields without labels) |
| **Performance budgets** (Core Web Vitals) | Partly: a budget is a cheap, reversible decision, and the metrics ([web.dev Core Web Vitals](https://web.dev/articles/vitals)) are measurements, not architecture | **Fold in** as an example under rendering strategy (the budget that justifies the choice), not its own principle |
| **Offline and sync** | Already covered by `field-first` and `consistency-models` (the `offline_first` signal) | **No new principle**; add a client-side example to `consistency-models` if needed |
| Component architecture, state-management libraries, CSS approaches | No: technique and tool choice | **Reject**; leave to build-phase packs |

A new signal, `user_facing_web_client` ("the product ships a browser or mobile UI to end users"),
would select the two accepted principles only for projects that have a client.

## Consequences if accepted

- Two follow-up issues: `rendering-strategy` and `accessibility-by-design`, each with its sources,
  `applies_when`, selection signal, and the skills that cite it.
- The library stays technology-neutral. Framework idioms appear only as examples of a pattern,
  never as the rule.
- Frontend implementation stays with build-phase packs, consistent with groundwork's
  judgment-then-handoff position (see docs/HARNESSES.md, "Composing with other packs").

## Consequences if rejected

- Record why here and supersede this ADR. Client-side decisions stay outside the library, and the
  README should say so in its scope.
