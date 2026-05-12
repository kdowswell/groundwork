---
id: ml-ai-observability
title: ML and AI System Observability
category: observability
sources:
  - name: "Chip Huyen — Designing Machine Learning Systems (2022)"
    url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"
  - name: "Martin Zinkevich — Rules of Machine Learning (Google)"
    url: "https://developers.google.com/machine-learning/guides/rules-of-ml"
  - name: "Evidently AI — ML Monitoring Guide"
    url: "https://www.evidentlyai.com/ml-monitoring-course"
  - name: "Shankar et al. — Operationalizing Machine Learning: An Interview Study (2022)"
    url: "https://arxiv.org/abs/2209.09125"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, ecommerce, media, any_production]
tags: [observability, ml, ai, monitoring, data-quality, drift]
---

# ML and AI System Observability

## Principle
ML and AI systems fail silently in ways traditional software does not. A service can be perfectly healthy from a latency and error-rate perspective while its model is producing wrong predictions — because the model is the business logic, and its correctness cannot be measured with a status code. Observability for ML systems must cover the full stack: data quality (inputs are what the model expects), model behavior (predictions are within the expected distribution), business outcomes (predictions are producing the intended user or business result), and infrastructure (serving and training pipelines are running correctly). Each layer requires different instrumentation, and the signals that matter most are domain-specific, not generic.

## When This Matters
- A trained model is deployed to serve production traffic and its predictions affect user experience or business decisions
- A pipeline retrains models on fresh data, where silent data quality issues in training data would corrupt future models without triggering any infrastructure alert
- A generative AI system (LLM-based chat, document generation, code completion) produces outputs that require quality monitoring beyond error rate
- Model predictions feed downstream business processes where a wrong prediction has a material cost: loan decisions, fraud detection, supply chain ordering, clinical recommendations
- The model was trained on historical data that may no longer represent production traffic — distribution shift is likely over months, guaranteed over years

## When This Doesn't Matter
- A purely rule-based system without a learned model component — standard application observability applies
- An internal data transformation pipeline that does not serve predictions to end users or downstream systems
- A short-lived experiment or A/B test where the evaluation framework replaces production monitoring

## Questions the Agent Should Ask
- What does a "wrong" prediction look like for this model, and can that wrongness be detected automatically (ground truth labels), detected with a delay (outcome tracking), or only detected by humans (qualitative review)?
- Are input features logged alongside predictions so that you can reconstruct what the model saw when a bad prediction is discovered later?
- What is the baseline distribution of predictions on validation data, and is production traffic drifting away from that distribution over time?
- Which features are most influential for this model's predictions, and are those features monitored for distribution shift independently of overall prediction monitoring?
- What is the acceptable staleness of the model — how long can it go without retraining before performance degrades to an unacceptable level, and is that measured?
- For generative outputs: what quality signals can be measured automatically (length, format adherence, toxicity, factual consistency), and which require human or model-based evaluation?
- Is there a rollback plan for models — can the previous version be restored within minutes if a new deployment degrades quality metrics?
- For AI features with cost-per-inference: is inference cost tracked as a first-class metric alongside latency and quality?

## What Good Looks Like
- Input data is validated against the training distribution before inference; out-of-distribution inputs are flagged and logged rather than silently passed to the model
- Predictions are logged with their feature inputs, model version, and a timestamp — enough to reproduce the decision and evaluate it when ground truth arrives
- Outcome labels are collected where possible and linked back to the prediction that drove the outcome, enabling delayed accuracy measurement
- Data drift metrics (population stability index, feature distribution divergence) run on a schedule and alert when drift exceeds a defined threshold
- Model performance metrics (precision, recall, AUC, or domain-appropriate equivalents) are computed on a rolling window of labeled outcomes and tracked over time
- Model deployments use a canary pattern before full rollout; rollback is a one-step operation with a clear trigger condition
- For LLM-based systems: automated quality checks run on a sample of outputs (format, toxicity, refusal rate, hallucination signals); human review samples are scheduled on a regular cadence for deeper qualitative evaluation

## What Goes Wrong When You Skip This
- A model degrades over months as the world changes; no alert fires because the service is healthy by infrastructure metrics; the degradation surfaces when a business stakeholder notices a drop in conversion and traces it back to model quality
- A training pipeline ingests corrupted data from a schema change upstream; the retrained model is silently worse than its predecessor; the regression is found only after the new model has been in production for weeks
- Input features arrive in a different unit, scale, or encoding than the model was trained on (a data pipeline bug); the model produces predictions with a systematic bias that is not caught before going live
- A generative AI feature begins producing subtly off-brand or factually incorrect outputs after a base model upgrade; no monitoring exists for output quality, and the issue is discovered by a customer complaint days later
- A team cannot investigate a customer complaint about an AI-driven decision because the input features and model version were not logged with the prediction

## Further Reading
Huyen's *Designing Machine Learning Systems* is the most complete treatment of operationalizing ML, covering data collection, training, deployment, and monitoring as a unified systems engineering problem — the monitoring chapter is particularly practical. Zinkevich's *Rules of Machine Learning* documents patterns Google found essential for production ML reliability, with specific warnings about silent model degradation and the traps of optimizing the wrong metric. Evidently AI's monitoring guide is the most accessible introduction to statistical methods for detecting data and model drift in production. Shankar et al.'s interview study documents the most common failure modes practitioners encounter when operationalizing models, and is useful for prioritizing which monitoring capabilities to build first.
