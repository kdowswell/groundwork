<!-- source: principles/design/agent-legible-codebase.md -->

# Agent-Legible Codebase

## Principle
Make a system's intent, boundaries, and conventions discoverable from the repository itself, so that a coding agent (or a new engineer) can find what it needs without being told. Prefer a short entry point that states only what cannot be inferred from the code (non-standard conventions, commands, hard rules) and points to versioned, focused documents: decision records, module maps, contracts. Keep those documents honest by validating them mechanically, so a broken link or a stale rule fails a check instead of misleading the next reader. Do not treat a large standing instruction file as free help. Measured evidence on repository context files is mixed: they cost tokens on every task, and whether they help depends on how small and relevant they are.

## When This Matters
- Coding agents make a meaningful share of changes and start each task without memory of earlier ones
- The codebase has conventions that differ from the defaults of its language or framework, and agents keep "correcting" them back to the defaults
- Architectural boundaries or decisions exist mostly in people's heads or in chat history
- A standing instruction file has grown by accretion: every incident added a paragraph and nothing was ever removed
- Several teams or agents work in the same repository and need the same answer to "where does this go and what must I not break?"

## When This Doesn't Matter
- Small codebases that follow their ecosystem's conventions closely; the code already says what a context file would
- Throwaway prototypes where nobody, human or agent, will return to the code
- Content that a deterministic check already enforces; a rule stated in prose and also enforced by a check only needs the check and a pointer to its reason

## Questions the Agent Should Ask
- What does an agent get wrong here that the code alone does not explain? Is that the content of the entry point, and is everything else in it earning its cost?
- Does the standing context include repository overviews or general advice the agent could infer by reading the code? If so, can it be removed?
- Where are decisions recorded, and can an agent find the reason behind a boundary from the code it is changing?
- Which documented rules can be checked mechanically (dependency direction, required files, link validity), and which are prose that will silently drift?
- When was the instruction file last pruned, and has anyone compared agent results with and without it on real tasks?
- Do directory and module names match the domain concepts, so an agent can predict where a change belongs?

## What Good Looks Like
- A short root entry point lists commands, non-obvious conventions, and hard rules, then links to deeper documents rather than containing them
- Decisions live in versioned records next to the code; module-level notes explain intent and boundaries where they apply, so agents load them only when working there
- Documentation links, required sections, and rule-to-check mappings are validated in the pipeline, so docs fail fast when they drift from the code
- Rules that can be stated precisely are enforced by checks, and the prose only says why; the entry point does not duplicate what a failing check will say
- Standing context is pruned on a schedule, and changes to it are evaluated against real tasks rather than kept because they seem helpful
- Structure carries meaning: names, layering, and module boundaries make the right location for a change predictable

## What Goes Wrong When You Skip This
- An agent asked to add an endpoint reinvents an error format because the house convention exists only in a reviewer's head; review catches it, but the next agent does the same
- A thousand-line instruction file, half of it out of date, is loaded on every task; the agent follows a superseded rule, and every run pays for context that mostly does not apply
- A generated repository overview restates what the code already shows, adds cost to every call, and changes nothing about the agent's results
- A design document says one thing and the code another; nothing checks the link between them, and an agent trusts the document
- Boundaries are implicit, so each agent change crosses one "just this once", and the structure decays at the speed of generation
