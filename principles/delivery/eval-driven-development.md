---
id: eval-driven-development
title: Eval-Driven Development
category: delivery
sources:
  - name: "Anthropic — Demystifying evals for AI agents (Jan 2026)"
    url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
  - name: "Husain & Shankar — AI Evals: Everything You Need to Know (FAQ, Sep 2026)"
    url: "https://hamel.dev/blog/posts/evals-faq/"
  - name: "Google Cloud Well-Architected Framework — AI and ML perspective: Reliability (reviewed Aug 2025)"
    url: "https://docs.cloud.google.com/architecture/framework/perspectives/ai-ml/reliability"
  - name: "Microsoft Azure Well-Architected Framework — Design principles for AI workloads (updated Apr 2026)"
    url: "https://learn.microsoft.com/en-us/azure/well-architected/ai/design-principles"
applies_when:
  scope: [new_build, epic, feature, story]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [ai_systems]
tags: [delivery, evals, testing, llm, agents, quality-gates, regression]
---

# Eval-Driven Development

## Principle
Gate every change to a model, prompt, tool definition, retrieval step, or agent harness on an evaluation suite, the same way code changes are gated on tests. Keep two sets with different jobs: a capability set of tasks the system still struggles with, which shows whether a change helps, and a regression set that should pass almost every time, which shows whether a change broke something that worked. Grade with deterministic checks wherever the expected outcome can be stated precisely, and use a model as grader only for judgements that cannot, after checking its verdicts against human labels. Because the same input can produce different outputs, run each task several times and measure how consistently it passes, not just whether it passed once. Write down the quality, safety, and cost thresholds a change must meet before anyone runs it, and start the suite from real failures rather than invented ones.

## When This Matters
- A product feature depends on model output: generation, extraction, classification, summarization, or an agent that takes actions
- Someone is about to change a prompt, swap or upgrade a model, add or edit a tool, change retrieval, or restructure the agent loop
- The team judges changes by trying a handful of examples by hand and deciding it "seems better"
- Users or support staff report bad answers, and nobody can say whether last week's fix made the problem rarer or just moved it
- The model provider will retire the current model, and the replacement has to be shown to be at least as good on your tasks

## When This Doesn't Matter
- A throwaway prototype exploring whether a model can do the task at all; read outputs by hand until the task is worth keeping
- Features where the model's output is shown to a human who edits it before anything happens, and a bad output costs only a few seconds of their time
- Calls to a model that are fully constrained (a fixed classification with a deterministic validator and a safe fallback) where ordinary unit and contract tests already cover every outcome

## Questions the Agent Should Ask
- Which failures have users, testers, or logs already shown? Have they been turned into eval tasks with a reference answer or a clear pass condition?
- Which tasks belong in the capability set (expected to fail today) and which in the regression set (expected to pass every time)? When a capability task passes reliably, who moves it to the regression set?
- For each quality dimension, can a deterministic check decide pass or fail (schema, exact value, test passes, required field present)? Where a model judges instead, how was it checked against human labels, and how often does it disagree?
- How many trials per task, and does this feature need "succeeds at least once in k tries" (a tool a user can retry) or "succeeds every time in k tries" (a customer-facing action)?
- What are the pass thresholds for quality, safety, and cost per task, and who decided them? What happens to a change that improves quality but doubles cost?
- Does each trial start from a clean environment, so one run's leftover state cannot make the next one pass or fail?
- Where do new eval tasks come from after launch? Is there a route from sampled production traces and user reports into the suite?
- When the score moves, does anyone read the transcripts behind it before trusting the number?

## What Good Looks Like
- Every change to a prompt, model id, tool schema, or harness runs the regression set in the pipeline and is blocked if it drops below the agreed pass rate, exactly as a failing test blocks a merge
- The first suite has a few dozen tasks taken from real failures and manual checks, each with a reference solution, and includes cases where the right behavior is to refuse or do nothing
- Graders are layered: code checks for format, schema, and verifiable facts; a model grader for tone or helpfulness, scoring one dimension at a time with an explicit "can't tell" option; periodic human labels to confirm the model grader still agrees with people
- The suite grades outcomes (the refund was issued for the right amount, the tests pass) rather than the exact sequence of steps, so a valid alternative path is not marked wrong
- Results report pass rate across repeated trials per task, plus cost and latency per task, against thresholds written down before the run
- A sudden 0% or 100% on a task is treated as a likely broken task or grader and investigated before anyone acts on it
- Sampled production traces are reviewed on a schedule; new failure patterns become eval tasks, so the suite tracks how the product is actually used

## What Goes Wrong When You Skip This
- A prompt tweak fixes the complaint that prompted it and quietly breaks three other cases; nobody notices because the only check was the example in the bug report
- A model upgrade "looks great" on five hand-picked prompts and ships; a week later, a structured-output path that parsed reliably on the old model fails one time in twenty on the new one
- A model grader rates every output as excellent because nobody compared its verdicts with a human's; the dashboard is green while customers complain
- The suite contains only tasks the system already passes, so it reports 100% for months and gives no signal about whether any change made the product better
- An agent passes a task once in development and is shipped; in production it completes the same task only some of the time, because consistency across repeated runs was never measured
- Eval tasks share an environment, so a file left by one trial lets the next one pass; the pass rate overstates what users will see

## Further Reading
Anthropic's "Demystifying evals for AI agents" is the most complete practical account: it recommends starting with 20–50 simple tasks drawn from real failures, separating capability evals (starting at a low pass rate) from regression evals (near 100%), choosing deterministic graders where possible and calibrating model graders closely against human experts, grading outcomes rather than paths, isolating each trial in a clean environment, and distinguishing pass@k (at least one of k trials succeeds) from pass^k (all k succeed). It places evals in CI on every agent change and model upgrade, and warns against taking scores at face value without reading transcripts. Husain and Shankar's evals FAQ argues that error analysis, reading real traces and naming the failure modes before automating anything, is the most important activity, recommends binary pass/fail judgements over rating scales, and describes validating model judges against human labels using true-positive and true-negative rates on held-out data. Google Cloud's AI and ML reliability perspective treats evaluation as a deploy gate with explicit thresholds covering factual accuracy, safety, and format, backed by automated rollback; Azure's AI design principles stress setting quality measurements early because of nondeterminism and treating benchmarking as an ongoing operational process rather than a one-time test. For deterministic test design, see *Testing Strategy and the Test Pyramid*; for rolling out an eval-passing change, see *Progressive Deployment Strategies*.
