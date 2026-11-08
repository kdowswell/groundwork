# Continue (`/groundwork continue`)

**Activity:** Design something new · **Time box:** proportional to what's missing

Finish the design documents from wherever the project is. Read what exists, produce only what's
missing, build on what's approved, and bring everything that needs a decision to **one** approval
(ADR-017).

## Steps

1. **Read the state of each design document.** Use the context loader's STATUS lines, or run
   `npx @kdowswell/groundwork verify <file>` on each spec, architecture, and data model in the
   project. Each one is in exactly one state, and the state decides what you do with it:

   | State | What you do |
   |---|---|
   | **Missing** | Draft it with its playbook, in step 2 |
   | **Draft** (no approval yet) | Finish it: fill empty template sections, resolve what you can, keep the user's wording |
   | **Changes requested** | Revise it for the requested changes; that revision is the draft to finish |
   | **Approved** | Build on it as written. Don't re-ask it and don't edit it |
   | **Changed since approval** | Run `npx @kdowswell/groundwork verify <file> --diff`, keep the diff for step 4, and include this document in the single approval round |

   If nothing exists at all, this is `start`'s job: say so in one line and follow
   [start.md](start.md).

2. **Work through the documents in order (spec → architecture → data model), one playbook at a
   time.** Skip approved documents entirely: don't load their playbooks. For each document that
   needs work, load its playbook ([spec.md](spec.md),
   [architecture.md](architecture.md), [data-model.md](data-model.md)), follow its Steps against
   the files that exist, defer its approval and fresh-eyes review, and write the result to its
   file before loading the next playbook. Missing inputs become labeled assumptions, never a stop.
   Where an approved document conflicts with what you're drafting, the approved document wins:
   note the conflict as a question rather than editing the approved file.

3. **Run one fresh-eyes review** over the documents this run wrote or changed, with the approved
   ones as read-only context, exactly as [start.md](start.md) step 5 describes. Contradictions
   between a new document and an approved one are questions for the user.

4. **Ask once.** In one reply: the files written or finished, the agent calls you made, each
   changed-since-approval document's diff in one line ("the idle threshold went from 4 hours to
   2"), every remaining question, and one approval request covering every document that needs
   one. Approved documents aren't asked about again.

5. **Record the decision** with one command over the documents the user decided on:
   `npx @kdowswell/groundwork approve <file> <file> …`, as [start.md](start.md) step 7 describes.

## Checkpoints

**Accept the documents that changed (one approval).**
Covers every document that was missing, a draft, had changes requested, or changed since approval,
each with the questions its own Checkpoints would ask. Approved → the router's Next steps table
says what follows. Changes requested on some → revise and re-ask for those only. A document the
user approved earlier and didn't touch is never part of this round.

## Output Format

The documents that were missing or unfinished, written to their files in their playbooks' Output
Formats. The reply lists what changed per file, the agent calls, the questions, and the approval
request.

**Next step:** End your reply with one recommended next command and why: the user's answer before
approval; after approval, the router's Next steps table (usually: start building).
