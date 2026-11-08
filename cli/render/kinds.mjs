/**
 * Artifact kinds groundwork produces, keyed by their H1 prefix. Shared by the review page and
 * `approve` (which derives each artifact's acceptance checkpoint for a bundle decision).
 */
export const ARTIFACT_KINDS = [
  { prefix: "Spec:", label: "Spec", checkpoint: "greenfield-spec-from-idea/accept" },
  { prefix: "Architecture:", label: "Architecture", checkpoint: "greenfield-architecture-sketch/accept" },
  { prefix: "Data Model:", label: "Data model", checkpoint: "greenfield-data-model-first/accept" },
  { prefix: "Safe Change Plan:", label: "Change plan", checkpoint: "brownfield-safe-change-plan/accept" },
  { prefix: "Threat Model:", label: "Threat model", checkpoint: "greenfield-threat-model/accept" },
];

/** The kind named by a Markdown document's first H1, or null. */
export function kindOf(source) {
  const h1 = (source.replace(/\r\n/g, "\n").split("\n").find((l) => /^#\s+/.test(l)) ?? "").replace(/^#\s+/, "").trim();
  return ARTIFACT_KINDS.find((k) => h1.startsWith(k.prefix)) ?? null;
}
