<!-- source: principles/design/deterministic-core-probabilistic-edge.md -->

# Deterministic Core, Probabilistic Edge

## Principle
Draw a hard line between what a model may decide and what code must decide. Business invariants, authorization, input validation, money movement, and any side effect that cannot be undone live in deterministic code that behaves the same way every time. The model works at the edge: it interprets language, proposes a plan, and chooses among a fixed set of typed actions that the core exposes. Treat every model output as untrusted input: check it against a schema and against the domain's rules before acting on it, exactly as you would a form submitted by a stranger. Decide in advance what happens when the check fails (retry with the error, fall back to a safe default, or hand the case to a person), so a malformed or wrong output becomes a handled outcome instead of an incident.

## When This Matters
- A model's output triggers an action: a database write, a payment, an email, a ticket update, a deployment, a call to another system
- An agent is given tools, and those tools reach systems with real data or real money
- Rules that must always hold (a refund never exceeds the order total, a user only sees their own records) are currently stated in a prompt
- Output from the model is parsed and fed into code that assumes a particular shape or range
- The design is still on the whiteboard, so moving the line costs a diagram change instead of a rewrite

## When This Doesn't Matter
- The model's output is only shown to a person, who reads it and decides what to do; there is no action to protect
- Exploratory prototypes testing whether a model can do the task at all, where nothing it produces touches real data
- Purely creative or advisory text where "wrong" means "less useful", not "unsafe" or "incorrect in a way the system acts on"

## Questions the Agent Should Ask
- Which decisions in this feature must come out the same way every time, given the same facts? Are any of them currently left to the model?
- What actions can the model trigger, and is each one a typed operation with validated parameters, or can the model compose free-form commands, queries, or requests?
- Where is authorization checked: in code, against the real user's permissions, before the action runs, or does the system rely on the model declining to do something it shouldn't?
- Is every model output validated against a schema and the domain rules (ranges, ownership, state transitions) before anything acts on it? What happens when validation fails?
- Which actions are irreversible or expensive, and do they require a deterministic confirmation step, a limit, or a person's approval regardless of how confident the model seems?
- Who decides that a task is "done": the model's own report, or a check in code (tests pass, the record exists, the totals match)?
- Is state the system relies on kept in a structured store that code controls, or only in the model's context or in free text the model rewrites?

## What Good Looks Like
- The model calls a small set of narrow, typed operations (`issue_refund(order_id, amount, reason_code)`), never a general-purpose query or command interface; each operation validates its own inputs
- Domain rules live in the operation, not the prompt: the refund operation rejects an amount above the order total and an order the user does not own, whatever the model asked for
- Every structured model output is parsed against a schema; a failure returns a specific, actionable error the model can correct on retry, and after a bounded number of retries the request falls back or escalates
- Irreversible or high-value actions pass through a deterministic gate (a limit, a two-step confirm, or a human approval) chosen by the consequence of the action, not applied to every step
- Completion is decided by code: an agent's claim that the feature works counts only once the end-to-end check passes
- Progress and state the system depends on are held in structured records that code writes and validates, so a model rewriting its notes cannot silently change what the system believes is true
- The failure path is designed and tested: there is an eval or test case for invalid output, out-of-range values, and a refusal, and each produces a defined result

## What Goes Wrong When You Skip This
- A support agent is told in its prompt "never refund more than the order total"; a customer argues persuasively, the model issues a refund for three times the purchase, and nothing in code stopped it
- A model returns JSON that is valid nine hundred and ninety-nine times in a thousand; the thousandth has a missing field, the parser throws, and the request fails with a generic error instead of a retry or a fallback
- An agent given a raw database query tool writes an update without a filter; the tool runs whatever it is given
- Authorization lives in the model's judgement ("only show users their own records"); a cleverly worded request retrieves another customer's data, and the audit log shows the system working as designed
- An agent reports a migration "complete and verified"; no code checked, and half the records were never moved
- Business rules are scattered across prompts, so a prompt edit meant to improve tone also changes which customers qualify for a discount
