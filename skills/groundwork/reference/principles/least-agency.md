<!-- source: principles/security/least-agency.md -->

# Least Agency

## Principle
Give an agent only the autonomy its task needs. Least privilege limits what an agent can access; least agency limits what it may decide and do on its own: which tools it has, how many steps it can take without a check, and which actions it can take without a person. Use a fixed workflow where one will do, and add autonomy only where it earns its place. Widen it step by step, starting from low-risk tasks, as evaluation and experience show it is safe. Put human approval at consequential or irreversible actions, never at every step, and decide where approval is required in the system's design, not by asking the agent. Make consequential actions reversible, interruptible, and recorded, so a wrong decision can be found and undone.

Least agency also has a containment half: assume the agent will sometimes do the wrong thing, and bound what that can cost. Run every agent, whether a coding agent on a developer's machine or a product agent acting in business systems, in a sandbox: an isolated filesystem, network egress limited to named destinations, bounded CPU, memory, run time, and spend, and no ambient credentials, only short-lived ones scoped to the task. Then a wrong decision stays inside the sandbox instead of reaching everything the host can.

## When This Matters
- An agent can take actions with real effects: sending messages, changing records, moving money, deploying code, deleting data, granting access
- An agent plans multi-step work on its own and can call tools in sequences nobody reviewed in advance
- Several agents delegate to each other, so one agent's decision becomes another's instruction
- People approve agent actions often enough that approvals risk becoming automatic

## When This Doesn't Matter
- The model produces drafts, suggestions, or analysis that a person reads and acts on manually
- A fixed workflow already defines every step, and the model only fills in content within a step whose effect is reviewed
- Sandboxed experiments with no access to real systems or data

## Questions the Agent Should Ask
- Does this task need an agent that chooses its own steps, or would a fixed workflow with model calls at defined points do the job?
- Which tools does the agent actually need for this task, and with what limits (read-only, rate, size, destinations)? Which could be removed?
- Which actions are consequential or irreversible? For each, what makes it reversible, or who approves it before it happens?
- Who decides when approval is required — the system's design, or the agent itself?
- How often will a person be asked to approve, and is that rare enough that they will actually read what they approve?
- How can a running agent be stopped, and how are its decisions recorded so a bad one can be traced and undone?
- What evidence would justify giving the agent more autonomy later, and who decides?
- Where does the agent run, and what can it reach from there: which files, which network destinations, which credentials? If an injected instruction took over the agent, could it read secrets or send data out?
- What ends a runaway agent: is there a hard limit on CPU, memory, run time, and spend for each task, and what happens when one is hit?

## What Good Looks Like
- Agentic behavior is used only where a fixed workflow can't do the job; the rest of the system is ordinary deterministic code
- Each agent has a declared tool set with per-tool limits (scopes, rates, destinations), and tools it doesn't need are not available to it
- Autonomy expands in phases: low-risk, non-sensitive tasks first, with access and independence increased as evaluation results and operating experience support it
- The design names which actions need human approval; the agent cannot opt out, and approvals are rare enough to be read, showing the action, its target, and why it is risky
- Consequential actions are reversible where possible (soft deletes, staged changes, compensating actions), interruptible while running, and logged with the decision chain that led to them
- A kill switch stops an agent or a class of action without a deploy
- Every agent, coding or product, runs in a sandbox by default: a filesystem limited to the workspace it needs, outbound network denied except to an allow list, and ceilings on CPU, memory, run time, and spend that end the run when crossed
- The agent holds no ambient credentials: nothing inherited from a developer's shell, home directory, or host role; it gets credentials just in time, scoped to the task, that expire when the task ends
- Isolation separates agents from each other and from their own audit logs, so a compromised agent can't move sideways into its neighbors or erase its trail

## What Goes Wrong When You Skip This
- An agent with a general-purpose tool set "helpfully" resolves a support ticket by issuing a refund, which nobody designed it to do and nobody can easily reverse
- Every tool call needs a click, so approvers click without reading; the one harmful request is approved along with the hundred routine ones
- The agent is asked "should a human check this?" and answers no, because the injected instruction it just read told it to
- A delegation chain lets a low-trust agent ask a high-privilege agent to act, and the high-privilege agent treats the request as an order
- A misbehaving agent keeps running for hours because there is no way to stop it short of a redeploy, and its actions can't be listed afterwards
- A coding agent runs with the developer's full shell; an instruction hidden in a dependency's README has it read cloud credentials from the home directory and post them to an outside endpoint, because nothing restricted what it could read or where it could connect
- A product agent stuck in a replanning loop keeps calling paid tools overnight; no run-time or spend limit stops it, and the first sign is the bill
