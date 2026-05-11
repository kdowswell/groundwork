# Discovery Questions

Use these questions to gather project context before running any phase-based skill. They are consumed by the `signal-driven-principles` skill and by any skill that references the project context.

**Operating constraints:**

- Cap at **6 questions** per session.
- Provide a **sensible default** for every question.
- **Skip any dimension already pinned by existing project artifacts** (PRD, README, existing CLAUDE.md). Do not re-ask what's already known.
- Each question must be answerable in under 60 seconds.

---

## Question Bank

### 1. Stack

> What's the team's technology stack?

| Option | Answer | Implications |
|---|---|---|
| A | TypeScript end-to-end | One language across stack; largest hiring pool |
| B | Python backend, separate frontend | Strong for AI/ML-leaning teams |
| C | Go backend, separate frontend | High-reliability sync services |
| D | Mixed / no preference yet | Let the architecture decision drive it |
| Custom | Provide your own | e.g., "Rust + React, team has Rust expertise" |

**Default:** D for greenfield with no signals; A for small teams with a short runway.

---

### 2. Scale target

> What's the target scale for v1?

| Option | Answer | Implications |
|---|---|---|
| A | Solo / prototype (< 100 users) | Suppress enterprise-only principles; simplify reliability |
| B | Pilot (10s–hundreds of users, one customer) | Standard greenfield; reliability matters, no premature scale work |
| C | Team scale (1K–10K users, < 100 RPS) | Add scalability + observability principles |
| D | Enterprise (100K+ users or > 100 RPS sustained) | All scalability + observability + capacity principles apply |
| Custom | Specify | e.g., "50 users in pilot, ramping to 5K by Q3" |

**Default:** B for greenfield.

---

### 3. Compliance

> What compliance posture does this project need?

| Option | Answer | Implications |
|---|---|---|
| A | None — internal tool, no regulated data | Skip compliance-driven principles |
| B | SOC 2-aware (audit-friendly defaults, no formal cert yet) | Pull secrets-management, data-classification, audit logging |
| C | Full SOC 2 / ISO 27001 | Above + formal audit logging + retention policy |
| D | HIPAA / PCI / FedRAMP / GDPR | Above + region-pinning + vendor compliance + data flow review |
| Custom | Specify | e.g., "SOC 2 in progress; FedRAMP-curious later" |

**Default:** A for internal tools; B for B2B SaaS; D-specific if a regime is named in the PRD.

---

### 4. Team shape

> Who is building this?

| Option | Answer | Implications |
|---|---|---|
| A | Solo developer | Lean on tests + documentation; suppress heavy process |
| B | Small team (2–5 engineers, no SRE) | Auto-pull structured-logging and alerting-strategy; cap process overhead |
| C | Medium team (6–15, possibly part-time SRE) | Standard process expectations |
| D | Large team (15+, dedicated SRE / platform / security) | Full process expectations; multi-team coordination principles apply |
| Custom | Specify | e.g., "Founder + 1 contractor, hiring 2 more in 60 days" |

**Default:** B for greenfield.

---

### 5. Stage

> What stage is the project in right now?

| Option | Answer | Implications |
|---|---|---|
| A | Ideation — concept, no users yet | Surface design + data-ownership first; defer delivery and operations |
| B | Discovery — exploring with one design partner | Add flexibility; defer multi-tenant principles |
| C | Refinement — pre-pilot, design partner identified | Standard greenfield envelope |
| D | Build — actively building toward GA | All build-stage principles apply |
| E | GA / mature — operating in production | All operations-stage principles apply |
| Custom | Specify | e.g., "Pre-pilot, 4 months to first design partner" |

**Default:** C if the project has a PRD; A if only a one-pager or conversation.

---

### 6. Operating context (CONDITIONAL)

> **Ask only if the product has field workers, mobile-primary users, or non-desk end-users.** Skip for office-based or developer tools.

> Where and how will end-users interact with the product?

| Option | Answer | Implications |
|---|---|---|
| A | Office / desk (browser or desktop app) | Standard UX assumptions; no field-first constraints |
| B | Mobile in casual contexts (transit, home) | Mobile-first but no hostile-conditions constraints |
| C | Field / industrial (gloves, sunlight, intermittent connectivity) | Pull field-first principle; offline-first is mandatory |
| D | Mixed (some desk, some field) | Apply field-first to all capture flows; desk flows can be richer |
| Custom | Specify | e.g., "Field technicians on tablets in basements with no signal" |

**Default:** A unless the PRD or domain signals otherwise.

---

## Question Selection Logic

For each session, score questions for:

1. **Relevance** (1–3): Does the project context already answer this? Score 1 if already known, 3 if completely unknown.
2. **Load-bearingness** (1–3): Does the answer materially change which principles apply or how strongly? Score 3 if yes, 1 if the answer won't change anything.

Ask only questions where `relevance × load-bearingness > 2`. If fewer than 6 qualify, ask only what qualifies — do not pad.

The interview is a means, not an end. If the project already has full context, skip it entirely.
