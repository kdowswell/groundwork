# Start (`/groundwork start`)

**Activity:** Design something new · **Time box:** scales with the idea: a small tool in one sitting, a
new service in an afternoon

Turn an idea into the design documents in one pass: a spec, an architecture, a data model, and an
ADR for each decision that was really made. It ends with **one** fresh-eyes review across all of
them and **one** approval. The individual commands stay available for depth and rework; this is
the default path when someone has an idea and wants to know what to build (ADR-017).

## Steps

1. **Take stock.** Use the context loader's STATUS lines. If a spec, architecture, or data model
   already exists, this is `continue`'s job: say so in one line and follow
   [continue.md](continue.md) instead. If `.groundwork/context.md` is missing, don't run the
   full `init` interview: infer the stack, team, and stage from the repository and the request,
   record them as labeled defaults ("(default — confirm)"), and fold any question about them into
   the single round at the end.

2. **Size the work.** Decide how much each document needs before writing any of them. A small
   internal tool gets a short spec, a one-section architecture, a data model of a few entities,
   and no ADRs unless a decision was really made. A system with several components, owners, or
   external dependencies gets the full templates. The playbooks' time boxes and output caps
   still apply. State the size you chose in one line.

3. **Draft each document in order, one playbook at a time.** Don't read the next playbook until
   the current document is written to its file. For each of spec → architecture → data model:
   - Load that command's playbook ([spec.md](spec.md), [architecture.md](architecture.md),
     [data-model.md](data-model.md)) and follow its Steps.
   - **Defer its approval and fresh-eyes review.** Note the questions its Checkpoints would ask,
     and continue. Never stop mid-chain to ask the user anything.
   - **Missing inputs become labeled assumptions** ("Agent call: …"), never a stop.
   - **Write the document to its own file before loading the next playbook** (defaults:
     `docs/spec.md`, `docs/architecture.md`, `docs/data-model.md`, unless the project keeps
     design documents elsewhere). The files on disk are the handoff: each later playbook reads
     the earlier file, not the conversation. Where the runtime offers subagents, you may draft
     each document in its own, passing it only the files written so far.
   - Do not run `verify` on documents this run wrote: they have no approval yet by design, and
     the single approval in step 6 covers them.

4. **Record decisions that were really made.** For each choice that was close, expensive to
   reverse, or would surprise a new contributor, write a Proposed ADR using
   [adr.md](adr.md)'s template. Skip this step when there are none, and say so.

5. **Run one fresh-eyes review across the bundle.** Give a fresh reviewer every document this run
   wrote, and nothing else: "You will build exactly this system from these documents. List every
   question you would need answered before you could start, every place two competent builders
   would build different things, and every contradiction between documents (an entity the
   architecture never stores, a flow the spec never asked for, an owner that differs between
   files). Quote the lines. Do not suggest improvements." Use an isolated subagent if the runtime
   offers one; otherwise do a deliberate cold read. Sort what comes back as each playbook's
   review step says: fix misreadings in place, make and label calls that don't change what gets
   built (recording them in each document's Builder Check section), and keep only the questions
   that do.

6. **Ask once.** In the same reply that delivers the bundle:
   - List the files written, each with one sentence on what it decides.
   - List the agent calls you made, so the user can overturn any of them.
   - Ask every remaining question, merged across documents and the deferred Checkpoints, in one
     round. Never hold one back for a later turn.
   - Ask for **one** approval of the whole bundle. When the bundle is long, offer one review page
     per document (`npx @kdowswell/groundwork render <file> --serve`) alongside the question,
     once.

7. **Record the decision for every file at once.** When the user answers, record it with one
   command that writes a receipt per file:
   `npx @kdowswell/groundwork approve docs/spec.md docs/architecture.md docs/data-model.md`
   (add `--decision=changes-requested` or `--decision=delegated` as the router's Approvals
   section says). If the user approves some documents and asks for changes on others, record
   each group with its own decision. Never record an approval the user did not give.

## Checkpoints

**Accept the bundle (one approval).**
The single approval covers the spec's scope, the architecture's boundaries and dependencies, and
the data model's ownership and consistency choices, each with the questions its own Checkpoints
would have asked. Approved → the router's Next steps table says what follows (usually: start
building). Changes requested → revise those documents and ask again for those documents only.
Delegated → record it as delegated and disclose your calls in the next reply.

## Output Format

Three files (or as many as the sizing in step 2 called for), each in its playbook's Output Format,
plus any Proposed ADRs. The reply lists the files, the agent calls, the questions, and the one
approval request.

**Next step:** End your reply with one recommended next command and why. Before approval, the next
step is the user's answer. After approval, usually: start building, and run `plan` before changing
anything in production.
