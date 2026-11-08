/**
 * The router's command table, shared by sync-router-references.ts and the tests.
 */

/**
 * Router command verb -> standalone skill directory name. Verbs pass the naming test (ADR-016):
 * someone who has never seen groundwork can guess what the command produces from its name.
 */
export const COMMAND_MAP: Record<string, string> = {
  spec: "greenfield-spec-from-idea",
  architecture: "greenfield-architecture-sketch",
  "data-model": "greenfield-data-model-first",
  principles: "greenfield-signal-driven-principles",
  adr: "greenfield-adr-setup",
  threat: "greenfield-threat-model",
  spike: "exploration-research-spike",
  risks: "exploration-assumption-mapping",
  compare: "exploration-tradeoff-analysis",
  "prototype-review": "exploration-prototype-review",
  review: "brownfield-architecture-review",
  debt: "brownfield-debt-triage",
  upgrade: "brownfield-dependency-upgrade",
  postmortem: "brownfield-incident-retro",
  plan: "brownfield-safe-change-plan",
  replace: "brownfield-strangler-fig",
  check: "brownfield-change-review",
  "analytics-model": "greenfield-analytical-data-model",
  "evals": "greenfield-eval-suite",
  "path-to-prod": "brownfield-path-to-production",
};

/** Old command names the router still accepts (ADR-016); each maps to its new verb. */
export const COMMAND_ALIASES: Record<string, string> = {
  sketch: "architecture",
  model: "data-model",
  vet: "prototype-review",
  assume: "risks",
  triage: "debt",
  retro: "postmortem",
  strangle: "replace",
};

/** Router-level playbooks written by hand; sync never writes or removes them. */
export const HAND_WRITTEN = ["init", "doctor", "start", "continue", "learn"];
