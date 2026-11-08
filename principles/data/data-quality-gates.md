---
id: data-quality-gates
title: Data Quality Gates at Pipeline Boundaries
category: data
sources:
  - name: "Schelter et al. — Automating Large-Scale Data Quality Verification (VLDB 2018)"
    url: "https://www.vldb.org/pvldb/vol11/p1781-schelter.pdf"
  - name: "Breck et al. — Data Validation for Machine Learning (SysML 2019)"
    url: "https://mlsys.org/Conferences/2019/doc/2019/167.pdf"
  - name: "Google SRE Workbook — Data Processing Pipelines"
    url: "https://sre.google/workbook/data-processing/"
  - name: "AWS Well-Architected Data Analytics Lens — BP 7.2: Monitor for data quality anomalies"
    url: "https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/best-practice-7.2---monitor-for-data-quality-anomalies..html"
  - name: "AWS Well-Architected Data Analytics Lens — BP 7.3: Trace data lineage"
    url: "https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/best-practice-7.3---trace-data-lineage..html"
  - name: "Open Data Contract Standard (Bitol)"
    url: "https://bitol-io.github.io/open-data-contract-standard/"
  - name: "OpenLineage — an open framework for data lineage collection and analysis"
    url: "https://openlineage.io/"
tags: [data, data-platforms, pipelines, data-quality, validation, freshness, lineage, data-contracts, ml-data]
applies_when:
  scope: [new_build, epic, feature, bug_fix]
  scale: [team, enterprise]
  stage: [refinement, build, maintain]
  domains: [data_platforms, ai_systems]
---

# Data Quality Gates at Pipeline Boundaries

## Principle
Check data where it crosses a boundary (into the platform from a source, between layers, and out to consumers) against explicit, declarative expectations, and stop bad data at the boundary instead of passing it on. A pipeline that ran without errors has not shown that its output is correct. Jobs fail loudly; bad data fails silently, spreads to every table and model built from it, and is usually found by a consumer after decisions have been made on it.

Expectations cover more than schema: completeness (no missing required values), validity (values in range, keys that resolve), uniqueness, volume (row counts within an expected band), freshness (data arrived when it should have), and distribution (no sudden shift in the shape of a column). The ones a consumer relies on belong in a data contract with the producer, so a break is caught by a check, not discovered by the consumer.

## When This Matters
- Data from systems you don't control (vendor feeds, other teams' services, user uploads, scraped or third-party sources) enters your platform
- Dashboards, financial reports, customer-facing numbers, or regulatory filings are built from the pipeline's output
- ML models are trained or served from the data, where a bad batch degrades the model without raising any error
- Many downstream tables and teams depend on a few upstream sources, so one bad batch has a wide blast radius
- Consumers have been burned before and keep their own private copies and sanity checks because they don't trust the shared tables

## When This Doesn't Matter
- An exploratory analysis or prototype whose output nobody depends on yet; add gates when someone starts relying on the result
- The data is fully produced and validated by a system you control, at the same boundary, and a second check would duplicate the first; keep the check at one place, not zero

## Questions the Agent Should Ask
- What does a consumer of this table assume about it: which columns are never null, which keys are unique, which values are in range, when it is updated? Are those assumptions written down and checked anywhere?
- When a check fails, what happens: does the pipeline stop, quarantine the bad rows and continue, or publish with a warning? Is that choice made per check, based on what the consumer can tolerate?
- How will you know data didn't arrive at all? Is there a freshness check with an expected arrival time, or does a missing load look the same as a quiet day?
- What volume and distribution are normal for this source, and how much change is a real business shift rather than a broken feed?
- Who is notified when a check fails, and do they own the source well enough to fix it?
- If a bad batch was published, which downstream tables, reports, and models did it reach? Can you answer that from recorded lineage, or only by reading code?
- Is the expectation set owned with the producer as a contract, or is it the consumer's guess about what the producer will send?
- For ML pipelines: is training data checked against the same expectations as serving data, so a skew between the two is caught?

## What Good Looks Like
- Each published table has a declared set of expectations kept in version control next to the transformation that produces it, and they run on every load
- Checks run before data is made visible to consumers (write to a staging location, validate, then publish), so a failed check means consumers see the last good data, not the bad batch
- The failure action is chosen per check: hard failures halt publishing, soft failures quarantine rows or warn, and the choice is documented
- Freshness and volume are monitored against expected bands, with alerts that go to the team who can fix the source
- Producer-consumer expectations are captured in a data contract (schema, semantics, quality rules, freshness, owner), and contract changes go through the same review as API changes
- Lineage is collected automatically from pipeline runs, so the blast radius of a bad batch is a query, not an investigation
- Check failures and quarantined rows are visible on a dashboard with trends over time, so a chronically noisy source is fixed rather than ignored

## What Goes Wrong When You Skip This
- A vendor changes a price field from dollars to cents; every job succeeds, revenue in the dashboard jumps a hundredfold, and the first person to notice is an executive in a meeting
- A source stops sending one region's records; volume drops ten percent, nothing fails, and the gap is found a month later when that region's managers ask why their numbers fell
- A null-heavy batch is published, a model retrains on it overnight, and recommendation quality drops for a week before anyone connects the two
- An upstream team renames a column they believe is internal; three downstream pipelines break, and nobody knew those dependencies existed
- After a bad load, the team spends two days reading code to find which reports and exports used the affected table, while customers have already received some of them
- Consumers stop trusting the shared tables, each team builds its own cleaned copy with its own rules, and the organization ends up with several conflicting versions of the same metric

## Further Reading
Schelter et al. describe Amazon's approach to declarative, unit-test-style data quality checks at scale (completeness, uniqueness, value ranges, and anomaly detection on metrics over time), and are the clearest statement of treating data checks like code tests. Breck et al. describe Google's data validation for production ML, including schema inference, training-serving skew detection, and why validation must run before a model trains on a new batch. The Google SRE Workbook's chapter on data processing pipelines sets freshness as a service level for pipelines, treats delayed and corrupt data as distinct failure modes, and argues that stale data is almost always better than incorrect data, which is why a gate should hold back a bad batch rather than publish it. The AWS Well-Architected Data Analytics Lens makes the same case at framework level: check quality so bad data is caught before it propagates downstream, and trace lineage to find downstream dependencies quickly. The Open Data Contract Standard is a vendor-neutral format for writing down producer-consumer expectations (schema, quality rules, service levels, ownership) so they can be checked. OpenLineage defines a standard for collecting lineage from pipeline runs, which is what makes blast-radius analysis a lookup. Ownership of the data behind a contract is covered in *Data Ownership and Service Boundaries*; changing a contract safely is covered in *Schema Evolution and Compatibility*; and monitoring model inputs once a model is in production is covered in *ML and AI System Observability*.
