<!-- source: principles/observability/structured-logging.md -->

# Structured Logging

## Principle
Emit logs as machine-parseable key-value records — typically JSON — with consistent field names, request correlation identifiers, and severity levels that mean something. Logs are an event stream the application writes to stdout; routing, storage, and retention are someone else's problem.

## When This Matters
- More than one process or service handles a request, and you need to reconstruct what happened end-to-end
- You will ever grep, aggregate, or alert on log content — which is to say, always in production
- The system is multi-tenant or has user-identifiable activity that must be filterable per tenant or user
- You are integrating with a log platform (Datadog, Splunk, Elastic, Loki) that indexes structured fields
- An incident has already happened where unstructured logs made root cause analysis slow

## When This Doesn't Matter
- Throwaway scripts, local dev tools, or one-shot CLIs where output is read by a human in real time
- Build-time or compile-time tooling whose output goes to a developer's terminal, not a log pipeline

## Questions the Agent Should Ask
- What is the log format — JSON, logfmt, plain text — and is it consistent across every service the team owns?
- Which fields are required on every log line: timestamp, severity, service name, request/trace ID, user/tenant ID?
- How are correlation IDs (trace ID, request ID) generated at the edge and propagated across service hops?
- What categories of data are forbidden in logs — passwords, tokens, full PANs, PHI, raw PII — and is that enforced by a redaction layer or only by code review?
- What do the log levels actually mean here, and at what level does each level reach which destination?
- Is the application writing to stdout/stderr only, or is it managing files, rotation, or shipping itself?
- Are exceptions logged with structured stack traces and error type fields, or as one giant message string?
- Are field names aligned with OpenTelemetry semantic conventions where one applies (e.g., `http.request.method`, `user.id`)?

## What Good Looks Like
- Every log line is one valid JSON object with a stable set of required fields and a free-form message
- Trace ID and span ID are present on every log emitted within a request, and a log entry can be pivoted to its trace in one click
- Sensitive fields are redacted by a shared formatter or middleware, not by ad-hoc string replacement at each call site
- Log levels are documented: `error` means a human should look, `warn` means a trend matters, `info` describes business events, `debug` is opt-in detail
- The application logs to stdout only; collection, parsing, and shipping happen in the platform layer
- New services adopt the same field names and severity conventions as existing ones — there is one logging library or wrapper, not five

## What Goes Wrong When You Skip This
- An incident drags on for hours because the root cause is buried in unstructured text logs from three services that use different field names for the same concept
- A token, password, or full credit card number ends up in the log index, triggering a security incident and potentially a regulatory breach notification
- Alerting rules brittle on substring matches break the first time a developer changes wording in a log message
- Log volume explodes because every level is effectively `info`, and the team starts dropping logs at the collector instead of fixing the source
