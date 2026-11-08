#!/usr/bin/env tsx
/**
 * Routing eval (#49): given groundwork's router description beside commonly co-installed packs'
 * descriptions, does a model route each prompt to the right skill? Costs a few cents per run, is
 * not run in CI, and complements the deterministic description lint in validate:skills.
 *
 * Run: npm run eval:routing   (BEHAVIOR_MODEL overrides the model; needs ANTHROPIC_API_KEY or .env)
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BEHAVIOR_MODEL = process.env.BEHAVIOR_MODEL ?? "claude-haiku-5-5";

/** Same lookup as the behavior harness: the environment, then a local .env. */
function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    return readFileSync(path.resolve(process.cwd(), ".env"), "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

interface Fixtures {
  skills: { name: string; description: string }[];
  cases: { prompt: string; expect: string }[];
}

const ROOT = path.resolve(HERE, "../..");
const fixtures = JSON.parse(readFileSync(path.join(HERE, "fixtures.json"), "utf8")) as Fixtures;
const router = matter(readFileSync(path.join(ROOT, "skills/groundwork/SKILL.md"), "utf8")).data.description as string;
const skills = [{ name: "groundwork", description: router.replace(/\s+/g, " ").trim() }, ...fixtures.skills];

async function main(): Promise<void> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error("No ANTHROPIC_API_KEY in the environment or .env; skipping.");
    process.exit(0);
  }
  const client = new Anthropic({ apiKey });
  const listing = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  let correct = 0;
  for (const c of fixtures.cases) {
    const res = await client.messages.create({
      model: BEHAVIOR_MODEL,
      max_tokens: 2000,
      system: `You route a user's request to exactly one installed skill, using only the skill descriptions below. Reply with the skill name and nothing else.\n\n${listing}`,
      messages: [{ role: "user", content: c.prompt }],
    });
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    const picked = skills.map((s) => s.name).find((n) => text.includes(n)) ?? text;
    const ok = picked === c.expect;
    if (ok) correct++;
    console.log(`${ok ? "✓" : "✗"} ${c.prompt}\n    expected ${c.expect}, got ${picked}`);
  }
  console.log(`\n${correct}/${fixtures.cases.length} routed correctly (${BEHAVIOR_MODEL})`);
  process.exit(correct === fixtures.cases.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
