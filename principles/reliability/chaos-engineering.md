---
id: chaos-engineering
title: Chaos Engineering
category: reliability
sources:
  - name: "Principles of Chaos Engineering"
    url: "https://principlesofchaos.org/"
  - name: "Netflix Technology Blog — Chaos Engineering"
    url: "https://netflixtechblog.com/tagged/chaos-engineering"
  - name: "Gremlin — Chaos Engineering documentation"
    url: "https://www.gremlin.com/community/tutorials"
  - name: "AWS Fault Injection Service"
    url: "https://docs.aws.amazon.com/fis/latest/userguide/what-is.html"
applies_when:
  scope: [new_build, epic]
  scale: [team, enterprise]
  stage: [build, maintain]
  domains: [financial_services, ecommerce, media, any_production]
tags: [reliability, resilience, testing, operations, distributed-systems]
---

# Chaos Engineering

## Principle
Deliberately inject failure into a running system to verify that it behaves as designed under stress. Form a hypothesis about steady-state behavior, introduce a real-world fault (instance loss, latency, dependency outage), and observe whether the system holds — before production does the experiment for you.

## When This Matters
- The system is distributed enough that no individual can reason through every failure mode from the architecture diagram
- You have invested in resilience patterns (retries, circuit breakers, fallbacks, autoscaling) and need to know whether they actually work
- Past incidents have surfaced failure modes that "should not have been possible" — you suspect more are hiding
- Disaster recovery, region failover, or backup restore procedures exist on paper but have never been exercised end-to-end
- You need evidence of resilience for compliance, executive review, or contractual SLAs

## When This Doesn't Matter
- The system is a single-process app or prototype where the failure modes are obvious from reading the code
- Basic observability is missing — you cannot detect or measure the effect of an injected fault, so the experiment teaches you nothing
- Known reliability problems are already on the backlog and unfixed; chaos experiments will surface what you already know
- The team has no on-call coverage or runbooks; injecting failure before you can respond to it is reckless

## Questions the Agent Should Ask
- What is the steady-state metric you would measure to know the system is "fine" — and is it instrumented today?
- What hypothesis is the experiment testing? "What happens when X fails" is not enough; predict the outcome first.
- What is the blast radius if the system does not behave as predicted, and how will you stop the experiment?
- Will the experiment run in production, in a production-equivalent environment, or in staging — and what are you giving up at each level?
- Does the failure being injected actually resemble a real failure mode (network partition, dependency 5xx, slow disk), or is it a synthetic scenario the system will never see?
- Who needs to know the experiment is happening (on-call, customer support, downstream teams), and how will they know?
- Are circuit breakers, retries, and autoscaling instrumented well enough that the experiment will reveal whether they fired?
- Are the prerequisites in place — observability, runbooks, paging, the ability to halt the experiment — or is this premature?

## What Good Looks Like
- Experiments start with a written hypothesis: predicted steady-state metric, predicted system response, abort conditions
- Blast radius is controlled — the smallest meaningful fault that tests the hypothesis, not the largest fault the team is brave enough to run
- The first experiments target known-resilient paths to build confidence in the tooling and the team's response, then progress to riskier scenarios
- Game days are scheduled, broadcast, and produce written findings that turn into backlog items
- Findings change the system: a failed experiment leads to a fix and a regression test, not a slide deck
- The team can stop an experiment within seconds and the abort path is rehearsed, not theoretical

## What Goes Wrong When You Skip This
- A region failover that "definitely works" takes six hours during a real incident because nobody had run it end-to-end
- A circuit breaker quietly stopped tripping months ago after a refactor; the team only finds out when the dependency it was supposed to protect against takes the service down
- Retry-storm behavior compounds an outage because nobody had seen what happens when 200 services all retry the same failing dependency at once
- Disaster recovery documents describe a process that no longer matches the running system

## Further Reading
The *Principles of Chaos Engineering* manifesto is short and worth reading in full — it defines the discipline as hypothesis-driven experimentation, not random destruction. Netflix's tech blog and AWS Fault Injection Service documentation cover the operational mechanics: blast-radius controls, abort conditions, and the path from staging experiments to production game days.
