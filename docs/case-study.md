# Case Study: SlopMart — from AI slop to a production floor

A worked example of the groundwork toolkit on a deliberately AI-slop service. The full
fixture lives at [`examples/case-study/`](../examples/case-study/) — `before/` is the
service as an unguided agent might generate it; `after/` is the same service brought up to
the floor. Both are scanned by the detector's test suite on every CI run, so this case study
can never silently drift from reality.

## The starting point

`before/` is a small order API: a Node server, a Python reconciliation job, a Dockerfile.
It works in a demo. It has every tell of unguided AI generation:

```
$ npx @kdowswell/groundwork detect examples/case-study/before

25 findings: 6 error, 16 warn, 3 info
```

| Severity | What the detector found | Principle violated |
|---|---|---|
| error | API key and payment-provider secret committed in source | secrets-management |
| error | `.env` with credentials, no `.gitignore` | secrets-management |
| error | Default password `"changeme"` | secrets-management |
| error | Empty `catch {}` and `except: pass` — errors vanish | structured-logging |
| warn | `express: "latest"`, `axios: "*"`, no lockfile | supply-chain-security |
| warn | No CI, no tests | ci-cd-pipeline, testing-strategy |
| warn | `FROM node` (unpinned), container runs as root | supply-chain-security, least-privilege |
| warn | Mock data on the real code path; "in a real application you would…" comments; stubbed `processRefund` | testing-strategy, tech-debt-management |
| warn | Wildcard CORS; `DEBUG = True` | zero-trust, least-privilege |
| info | 6+ `console.log` debug prints; 8 TODO/FIXME/HACK markers; HTTP call with no timeout | structured-logging, tech-debt-management, fault-isolation |

Every finding names the principle it violates — the detector is the enforcement arm of the
[principles library](../principles/), not a style linter.

## The workflow

1. **`npx @kdowswell/groundwork detect`** — the deterministic scan above. No LLM, no API key; run it in
   CI with `--json`.
2. **`/groundwork review`** — the agent assesses the system against active principles and
   writes a findings report; the detector output seeds the mechanical layer so the agent
   spends judgment only where judgment is needed.
3. **`/groundwork triage`** — findings become a prioritized debt register (the mock-data
   path and swallowed exceptions rank above the TODO count).
4. **`/groundwork plan`** — the remediation ships as a safe change plan: blast radius,
   rollback path, and test coverage before any code moves.

## The result

```
$ npx @kdowswell/groundwork detect examples/case-study/after

✓ 9 file(s) scanned, no findings.
```

What changed, mapped back to principles:

- Secrets moved to environment configuration with a committed `.env.example`
  (secrets-management); the process refuses to boot without its key.
- Errors are logged structurally and surfaced; a `/healthz` endpoint exists
  (structured-logging, health-checks).
- Dependencies pinned with a lockfile; base image pinned; container drops root
  (supply-chain-security, least-privilege).
- CI runs tests and the detector on every push (ci-cd-pipeline, testing-strategy).
- The outbound HTTP call has a timeout (fault-isolation); CORS is scoped (zero-trust);
  mock data and demo disclaimers are gone (tech-debt-management).

## Reproduce it

```bash
npx @kdowswell/groundwork detect examples/case-study/before   # 25 findings, exit 1
npx @kdowswell/groundwork detect examples/case-study/after    # clean, exit 0
```
