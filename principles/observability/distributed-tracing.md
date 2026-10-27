---
id: distributed-tracing
title: Distributed Tracing
category: observability
sources:
  - name: "OpenTelemetry — Traces"
    url: "https://opentelemetry.io/docs/concepts/signals/traces/"
  - name: "OpenTelemetry — Context Propagation"
    url: "https://opentelemetry.io/docs/concepts/context-propagation/"
  - name: "OpenTelemetry — Sampling"
    url: "https://opentelemetry.io/docs/concepts/sampling/"
  - name: "Dapper, a Large-Scale Distributed Systems Tracing Infrastructure (Google)"
    url: "https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/"
  - name: "W3C Trace Context"
    url: "https://www.w3.org/TR/trace-context/"
  - name: "OpenTelemetry — GenAI spans specification (agent, inference, and tool spans; Development status)"
    url: "https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md"
  - name: "Anthropic — How we built our multi-agent research system (Jun 2025)"
    url: "https://www.anthropic.com/engineering/multi-agent-research-system"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, ecommerce, any_production]
tags: [observability, tracing, opentelemetry, distributed-systems, microservices, agents]
---

# Distributed Tracing

## Principle
Instrument every request as a tree of timed, causally linked spans whose context propagates across process and network boundaries. A trace turns "the system was slow" into "this specific span on this specific service spent 800ms waiting on this specific downstream call."

An agent run is a request like any other and gets one trace: the run is the root, and each model call and each tool call is a child span beneath it. Spans describe logical operations as the caller sees them, so automatic retries of one model or tool call sit inside a single span for that operation rather than appearing as separate, unrelated calls.

## When This Matters
- A user request crosses two or more services, queues, or external dependencies before completing
- Latency problems cannot be diagnosed from a single service's metrics — the slow part is somewhere in the chain
- The same business operation has different performance profiles for different tenants, regions, or input shapes, and you need to see why
- You are debugging a tail-latency problem (p95/p99) that does not show up in averages
- An incident already happened where engineers spent hours stitching logs across services to figure out what called what
- An agent makes many model and tool calls to complete one task, and a bad outcome could have come from any of them

## When This Doesn't Matter
- A monolithic application with no outbound network calls of consequence — a profiler is the right tool, not a tracer
- Pure batch or offline pipelines where cost-per-trace dwarfs benefit and aggregate metrics already answer the questions you ask
- A prototype with no production traffic; tracing infrastructure is overhead until there is something to debug

## Questions the Agent Should Ask
- Which propagation standard are you using — W3C Trace Context is the default; if not, why not, and how does context cross every hop including queues and background jobs?
- Where do traces start (edge, gateway, first service) and how is that root span created consistently?
- What is the sampling strategy — head-based ratio, tail-based on errors/latency, or both — and what is the expected cost at peak RPS?
- Are sampling decisions consistent across services so a trace is either fully kept or fully dropped, never partial?
- Which span attributes are mandatory (service name, http.route, db.system, error type) and which are forbidden (raw PII, full payloads, secrets)?
- How are traces correlated with logs and metrics — are trace and span IDs present on log records and on exemplars for key metrics?
- For async or queued work, how does trace context survive the hop, and is the consumer's span linked to the producer's?
- Who looks at traces today, in what tool, and is the cost of the backend (ingest + retention) understood and budgeted?
- For agent features: does one run produce one trace, with model and tool calls nested under it, and do retries appear inside the operation they retried?

## What Good Looks Like
- Every inbound request creates a root span at the edge and W3C `traceparent` headers propagate through every internal call without per-service custom code
- Span names describe operations, not URLs with IDs in them — `GET /users/{id}` not `GET /users/12345` — to keep cardinality manageable
- Errors are recorded on spans with status and exception attributes, not as ad-hoc string fields
- Sampling is deliberate: head-based for baseline volume, tail-based to retain all errors and slow traces, with documented retention
- A developer can pivot from a log line or alert to the corresponding trace in one click via shared trace IDs
- Async boundaries (queues, schedulers, workers) carry trace context as message headers, so background jobs are visible in the trace
- An agent run opens a root span; every model call and tool call is a child span, so a failed run can be opened and read step by step

## What Goes Wrong When You Skip This
- A latency regression takes a week to root-cause because nobody can prove which downstream call is slow without adding ad-hoc logging on every hop
- Traces exist but are useless because half the services don't propagate context, leaving disconnected single-span "traces" that hide the real path
- Trace storage costs balloon when every request is sampled at 100%, then the team disables tracing entirely instead of tuning the sampler
- Sensitive data leaks into span attributes because instrumentation was added by hand without a redaction layer, and now traces are subject to the same compliance rules as production data
- Each model call in an agent run is traced as its own root, so a run of forty calls shows up as forty unrelated traces; nobody can tell which tool result led the agent astray, and three retries of one call look like three different decisions

## Further Reading
Google's *Dapper* paper is the original treatment of low-overhead, always-on production tracing and explains why sampling is fundamental, not optional. The OpenTelemetry traces, context propagation, and sampling docs cover the modern implementation; W3C Trace Context defines the wire format every modern tracer should use. The OpenTelemetry GenAI spans specification, still in Development status, defines agent-invocation, inference, and tool-execution spans and says a GenAI span should cover the whole logical operation including its retries. Anthropic's account of its multi-agent research system describes full production tracing as what made agent failures diagnosable. See *ML and AI System Observability* for what to record on those spans.
