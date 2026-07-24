# Initialize Project Context (`/groundwork init`)

**Phase:** Setup · **Time box:** 10-20 minutes

Write `.groundwork/context.md` — the durable project context that every other groundwork
command reads. Later commands use it to pick applicable principles, calibrate rigor to team
size and stage, and skip questions that are already answered. Run once per project; use
`/groundwork doctor` afterward to keep it honest.

## Steps

1. **Check for an existing context file.** If `.groundwork/context.md` exists, this is a
   refresh, not an init: show the current values, ask only about what changed, and preserve the
   rest. Never silently overwrite an existing file.

2. **Mine existing artifacts before asking anything.** Read the repository's README, manifest
   files, CI configuration, and any PRD or docs the user points at. Every dimension already
   pinned by an artifact is a question you do not ask.

3. **Interview with the question bank below.** Cap at 6 questions. For each, score
   relevance (1-3: already known → 3: unknown) × load-bearingness (1-3: changes which principles
   apply?) and ask only where the product exceeds 2. Present options as an enumerated choice
   list with the default marked. Each question must be answerable in under a minute.

   - **Stack** — languages, frameworks, datastores, hosting. Default: infer from the repo.
   - **Scale target** — solo/prototype (<100 users) · pilot (100s) · team scale (1K-10K) ·
     enterprise (100K+ or >100 RPS). Default: pilot.
   - **Compliance** — none · SOC 2-aware · certified SOC 2/ISO · HIPAA/PCI/FedRAMP/GDPR.
     Default: none for internal tools, SOC 2-aware for B2B.
   - **Team shape** — solo · small (2-5, no SRE) · medium (6-15) · large (15+, dedicated
     SRE/platform). Default: small.
   - **Stage** — ideation · discovery · refinement · build · maintain. Default: refinement if a
     PRD exists, ideation if only a conversation.
   - **Operating context** (only if end-users are not at a desk) — office · casual mobile ·
     field/industrial (gloves, sunlight, intermittent connectivity) · mixed. Field answers pull
     the field-first principle and make offline-first mandatory.

4. **Write `.groundwork/context.md`.** Create the `.groundwork/` directory if needed and write
   this structure, filling every section (use "unknown — revisit" rather than omitting a line):

   ```markdown
   # Project Context — {{PROJECT_NAME}}

   ## Stack
   - Languages: ...
   - Frameworks: ...
   - Datastores: ...
   - Cloud / hosting: ...

   ## Team
   - Size: ...
   - Composition: ...
   - Architectural ownership: ...

   ## Scale Targets
   - Users: ...
   - Throughput: ...
   - Availability: ...

   ## Compliance & Domain
   - Industry: ...
   - Regulatory: ...
   - Data residency: ...

   ## Delivery Process
   - Release cadence: ...
   - Branching strategy: ...
   - Feature flags: ...
   - CI / CD: ...

   ## Quality Bar
   - Test coverage: ...
   - Code review: ...
   - Documentation: ...

   ## Stage
   - Current stage: ideation | discovery | refinement | build | maintain
   - Last reviewed: YYYY-MM-DD (today)

   ## Active Principles
   - (run /groundwork principles to select these)
   ```

5. **Offer principle selection.** The Active Principles section is the highest-value part of the
   file and `principles` owns it. Offer to continue into `/groundwork principles` now; if the
   user declines, leave the placeholder line so `doctor` flags it later.

6. **Recommend next steps.** Based on stage: ideation/discovery → `spec` or `spike`;
   refinement/build → `sketch`, `model`, `adr`; maintain → `review` or `triage`. One sentence
   each, only for the two or three commands that fit.

## Checkpoints

**Is anything you wrote an assumption rather than an answer?**
Every value in the file must come from an artifact, an explicit user answer, or a stated
default. Mark defaults the user did not confirm with "(default — confirm)" so doctor and later
commands treat them as soft.

**Does the file contradict the repository?**
If the user says "solo developer" but the git history shows eight active committers, or "no
CI" but workflows exist, surface the contradiction now — do not record an answer you can see
is false.

## Output Format

The artifact is `.groundwork/context.md` exactly as structured in Step 4, plus a one-paragraph
summary to the user: what was recorded, which values are unconfirmed defaults, and the
recommended next command.
