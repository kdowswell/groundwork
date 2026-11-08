/**
 * Deterministic checks on the router's `description` (#49), the only field agent runtimes read
 * when deciding whether to invoke a skill. groundwork is usually installed beside other packs
 * whose descriptions also say "plan", "spec", and "review", and mis-routing to another pack is
 * silent, so the description must name its commands, say when to invoke it, draw its "not for"
 * boundary, and stay within the Agent Skills length limit.
 */

/** Agent Skills specification: description is at most 1024 characters. */
export const DESCRIPTION_MAX = 1024;

/** Collapse a folded YAML description to the single line runtimes see. */
export function normalizeDescription(description: string): string {
  return description.replace(/\s+/g, " ").trim();
}

/**
 * @param description the router's frontmatter description
 * @param commands every command the router routes (COMMAND_MAP keys plus HAND_WRITTEN)
 * @returns human-readable problems; empty when the description passes
 */
export function lintRouterDescription(description: string, commands: string[]): string[] {
  const text = normalizeDescription(description);
  const errors: string[] = [];
  if (text.length > DESCRIPTION_MAX) {
    errors.push(`description is ${text.length} characters; the Agent Skills limit is ${DESCRIPTION_MAX}`);
  }
  const missing = commands.filter((c) => !new RegExp(`(^|[\\s,:(])${c.replace(/[-]/g, "\\-")}([\\s,.;)]|$)`).test(text));
  if (missing.length > 0) {
    errors.push(`description doesn't name these commands, so requests for them may route elsewhere: ${missing.join(", ")}`);
  }
  if (!/\binvoke when\b/i.test(text)) errors.push('description must say when to invoke the router ("Invoke when ...")');
  if (!/\bnot for\b/i.test(text)) {
    errors.push('description must draw its boundary with co-installed build packs ("Not for writing feature code ...")');
  }
  if (!/\/groundwork\b/.test(text)) errors.push("description must mention the /groundwork command so explicit invocations match");
  return errors;
}
