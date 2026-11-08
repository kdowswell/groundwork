<!-- source: principles/observability/ml-ai-observability.md -->

# ML and AI System Observability

## Principle
ML and AI systems fail silently in ways traditional software does not. A service can be perfectly healthy by latency and error rate while its model gives wrong answers, because the model is the business logic and its correctness does not show up in a status code. Observability has to cover four layers: the data going in (is it what the model expects?), the model's behavior (are outputs within the expected range and quality?), the business outcome (did the output achieve what it was for?), and the serving infrastructure. For systems built on large language models and agents, add a fifth: the run itself. Record each agent run as one trace, with nested spans for the agent, each model call, and each tool call; record token and cache usage and the model version that actually answered; keep prompt and response content out of telemetry by default and capture it only by deliberate opt-in, stored separately under a retention policy. Feed sampled production traces back into the evaluation set, so what you observe in production becomes what you test against next.

## When This Matters
- A trained model serves production traffic and its predictions affect users or business decisions
- A pipeline retrains models on fresh data, where a silent data-quality problem would corrupt the next model without tripping any infrastructure alert
- A product feature generates text, extracts data, or answers questions with a language model, so "correct" cannot be measured with an error rate
- An agent runs multi-step tasks, calling the model and tools many times per request, and a failure could come from any step
- Token spend is a material cost, varies widely between requests, and nobody can say which feature or tenant drives it
- The model provider can change or retire the model underneath you, and quality shifts need to be traced to their cause

## When This Doesn't Matter
- A purely rule-based system with no learned or generative component; standard application observability applies
- An internal data transformation pipeline that does not serve predictions or generated output to users or downstream systems
- A short-lived experiment whose offline evaluation replaces production monitoring, and which will be torn down rather than promoted

## Questions the Agent Should Ask
- What does a "wrong" output look like for this feature, and can it be detected automatically, detected later through outcomes, or only judged by a person?
- Are inputs logged (or referenced) alongside outputs and the model version, so a bad result discovered later can be reconstructed?
- For classic models: what is the baseline input and prediction distribution, and is production traffic drifting away from it?
- For agents: does one user request produce one trace, with the agent's steps, each model call, and each tool call as child spans? Can you open a failed run and see which step went wrong?
- Do spans record the model that was requested and the model that actually responded, plus input, output, and cached tokens?
- Are prompts and responses captured in telemetry? If so, who opted in, where is the content stored, who can read it, and when is it deleted?
- Which quality signals run on live traffic (format validity, refusal rate, a calibrated model grader on a sample), and how do failures found there become eval tasks?
- What is normal behavior for this agent (steps per run, tools called, tokens per task), and what alerts when it departs from that baseline? Is there a switch that stops it quickly without a deploy?
- Which telemetry naming convention is used, and is its version pinned?

## What Good Looks Like
- Inputs to classic models are validated against the training distribution; out-of-distribution inputs are flagged rather than silently scored
- Predictions are logged with their inputs, model version, and timestamp; outcome labels are joined back when they arrive, so accuracy can be measured with a delay
- Drift metrics run on a schedule and alert past a defined threshold; model performance is tracked on a rolling window of labelled outcomes
- Every agent run is one trace: a root span for the run, child spans for each model call and each tool call, and retries recorded inside the one logical operation they belong to, so the trace reads as what the agent did, not as noise
- Each model-call span records the requested model, the model that responded, and token counts including cache reads, so cost per run, per feature, and per tenant can be computed from telemetry alone
- Prompt and response content is off by default; where it is needed for debugging, users or operators opt in, content goes to a separate store with access control and a retention period, and spans hold a reference to it rather than the text
- Monitoring watches behavior as well as health: format-validation failures, refusal rate, steps and tool calls per run, cost per successful task, and a sampled quality score from a grader that has been checked against human labels
- A scheduled review reads a sample of production traces, names new failure patterns, and adds representative cases to the eval suite
- Agent features have a kill switch that disables the agent path or falls back to a non-agent path in seconds, and alerts on behavior that departs from the baseline (a sudden jump in tool calls or tokens per run)
- Telemetry uses the standard GenAI attribute names, with the convention version pinned and upgrades handled as a deliberate change

## What Goes Wrong When You Skip This
- A model degrades over months as the world changes; no alert fires because the service is healthy by infrastructure metrics, and the drop is found when a stakeholder traces falling conversion back to model quality
- A training pipeline ingests corrupted data after an upstream schema change; the retrained model is silently worse and stays in production for weeks
- A customer complains about an agent's action, and the team cannot reconstruct what happened: there is a log line per model call, but nothing ties the calls and tool invocations of that run together
- The provider starts serving a newer model under the same alias; output quality shifts, and because spans record only the requested model, nobody can see that anything changed
- Full prompts and responses are logged by default to the general log store; customer personal data is now searchable by everyone with log access and kept for years
- An agent loops on a failing tool, calling it hundreds of times per run; the cost shows up on the monthly invoice because nothing watched tool calls or tokens per run
- Production monitoring finds recurring bad answers, but they never reach the eval suite, so the next prompt change reintroduces the same failure
- The team adopts unstable GenAI attribute names without pinning a version; an instrumentation upgrade renames them and every dashboard and alert built on the old names goes blank
