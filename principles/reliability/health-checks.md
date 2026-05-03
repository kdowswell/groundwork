---
id: health-checks
title: Health Checks — Liveness, Readiness, and Dependency Reporting
category: reliability
sources:
  - name: "Kubernetes — Configure Liveness, Readiness and Startup Probes"
    url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"
  - name: "AWS Elastic Load Balancing — Target Group Health Checks"
    url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html"
  - name: "Health Endpoint Monitoring Pattern — Azure Architecture Center"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [any_production]
tags: [reliability, operations, kubernetes, observability, deployment]
---

# Health Checks — Liveness, Readiness, and Dependency Reporting

## Principle
Distinguish "this process is alive" from "this process is ready to serve traffic" from "this process's dependencies are healthy." Each question deserves its own endpoint with different semantics, because the platform takes different actions on each one.

## When This Matters
- The service runs behind a load balancer, ingress, or scheduler that uses HTTP probes to route traffic and decide when to restart
- The service has slow startup (warm caches, JIT, schema migrations, large model loads) that takes longer than the platform's default timeout
- The service has hard dependencies (database, queue, cache) — and you need the platform to stop sending traffic when they are unreachable
- The service has soft dependencies you do not want the platform to restart over (a degraded recommendations API should not cause pod restarts)
- Deployments occasionally cause user-visible errors during rollout because traffic arrives before the new instance is ready

## When This Doesn't Matter
- A short-lived job, batch script, or CLI tool with no concept of "serving traffic"
- A development-only service where startup races and dependency outages are acceptable
- A platform-managed runtime (some serverless tiers) that exposes no probe mechanism

## Questions the Agent Should Ask
- What does the platform do with each probe — restart the container, remove from load balancer, fail the deployment? Are you targeting the right one?
- What is "ready" for this service? At minimum: HTTP server up, required config loaded, dependencies reachable that the service cannot function without.
- Which dependencies should fail readiness, and which should the service handle gracefully without flapping out of rotation?
- Should the liveness check ever call a dependency? (Usually no — you do not want a database blip to restart every pod in the cluster.)
- How long does cold start actually take, and is the startup probe configured to give it that headroom?
- What signal does the service emit when readiness flips, and is it visible during a deploy or incident?
- Will deep health checks (those that exercise dependencies) be exposed publicly, behind auth, or scrape-only — and is the response cached so probes don't hammer dependencies?
- Are health endpoints excluded from access logs, request metrics, and tracing to avoid drowning out real traffic?

## What Good Looks Like
- Liveness checks are shallow and process-local — they fail only when the process itself is wedged and a restart will help
- Readiness checks reflect the service's ability to handle a real request right now, including required dependencies
- Slow-starting services use a startup probe (or equivalent grace period) so liveness doesn't kill them mid-boot
- Deep health endpoints exist for operators and dashboards but are separate from what the load balancer probes
- Probe results, dependency status, and the version/commit of the running build are all queryable without shelling into the container
- Deploys produce zero readiness flaps under normal conditions; flapping is treated as a bug, not background noise

## What Goes Wrong When You Skip This
- A liveness probe that calls the database causes every pod to be killed and rescheduled when the database has a transient hiccup, turning a 30-second blip into a full outage
- New deploys serve 502s for the first 60 seconds because traffic arrives before caches are warm and readiness is the same as liveness
- The platform marks a pod as healthy because the HTTP server responds, even though the service cannot actually reach its message broker
- Operators paging at 3am cannot tell whether a service is stuck, slow, or just unable to reach a dependency, because there is one health endpoint that returns 200 OK or nothing

## Further Reading
The Kubernetes documentation is the most concrete treatment of liveness vs. readiness vs. startup semantics and is worth reading even if you do not run on Kubernetes — the same distinctions apply on ECS, Nomad, and behind any load balancer. The Azure Architecture Center's Health Endpoint Monitoring pattern covers what to put inside a deep health response and how external probers should consume it.
