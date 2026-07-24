#!/usr/bin/env tsx
/**
 * Compiles the 15 standalone phase skills into router playbooks under
 * skills/groundwork/reference/, and syncs the union of their principles
 * into skills/groundwork/reference/principles/ so relative
 * `principles/<id>.md` links keep working inside the router skill.
 *
 * The standalone skills remain the source of truth. Hand-authored playbooks
 * (init.md, doctor.md) are never touched. Also emits cli/data/principles.json
 * (id, title, category) for the CLI's doctor command.
 *
 * Run: npm run sync:router
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import matter from "gray-matter";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const ROUTER_DIR = join(ROOT, "skills/groundwork");
const REFERENCE_DIR = join(ROUTER_DIR, "reference");
const REF_PRINCIPLES_DIR = join(REFERENCE_DIR, "principles");
const CLI_DATA_DIR = join(ROOT, "cli/data");
const STRIP_HEADINGS = ["## Further Reading"];

/** Router command verb -> standalone skill directory name. */
export const COMMAND_MAP: Record<string, string> = {
  spec: "greenfield-spec-from-idea",
  sketch: "greenfield-architecture-sketch",
  model: "greenfield-data-model-first",
  principles: "greenfield-signal-driven-principles",
  adr: "greenfield-adr-setup",
  spike: "exploration-research-spike",
  assume: "exploration-assumption-mapping",
  compare: "exploration-tradeoff-analysis",
  vet: "exploration-prototype-review",
  review: "brownfield-architecture-review",
  triage: "brownfield-debt-triage",
  upgrade: "brownfield-dependency-upgrade",
  retro: "brownfield-incident-retro",
  plan: "brownfield-safe-change-plan",
  strangle: "brownfield-strangler-fig",
};

const PHASE_LABELS: Record<string, string> = {
  greenfield: "Define (greenfield)",
  exploration: "Explore (exploration)",
  brownfield: "Evolve (brownfield)",
};

function criteriaList(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return "- (none declared)";
  return items.map((c) => `- ${String(c)}`).join("\n");
}

function buildPlaybook(verb: string, skillName: string, raw: string): string {
  const { data, content } = matter(raw);
  const phaseLabel = PHASE_LABELS[String(data.phase)] ?? String(data.phase ?? "unspecified");
  // Drop the source H1 — the generated header replaces it.
  const body = content.trim().replace(/^# .+\n/, "").trim();

  return `<!-- generated from skills/${skillName}/SKILL.md by scripts/sync-router-references.ts.
     Edit the source skill, then run: npm run sync:router -->

# ${data.title ?? skillName} (\`/groundwork ${verb}\`)

**Phase:** ${phaseLabel} · **Time box:** ${data.time_box ?? "not set"}

**Before you start:** load project context for this session if you have not already (see the
router's Steps); honor active principles throughout. Entry criteria below must hold — if one
does not, say which and route to the command that establishes it instead of proceeding.

**Entry criteria:**
${criteriaList(data.entry_criteria)}

**Exit criteria:**
${criteriaList(data.exit_criteria)}

---

${body}
`;
}

function trimPrinciple(raw: string, sourceRelPath: string): string {
  const { content } = matter(raw);
  const sections = content.trim().split(/(?=^## )/m);
  const kept = sections.filter((s) => !STRIP_HEADINGS.some((h) => s.startsWith(h)));
  return `<!-- source: ${sourceRelPath} -->\n\n${kept.join("").trim()}\n`;
}

function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
  writeFileSync(path, content, "utf8");
  return true;
}

async function main(): Promise<void> {
  mkdirSync(REFERENCE_DIR, { recursive: true });

  // 1. Compile playbooks from standalone skills.
  let written = 0;
  let unchanged = 0;
  const principleUnion = new Set<string>();

  for (const [verb, skillName] of Object.entries(COMMAND_MAP)) {
    const sourcePath = join(ROOT, "skills", skillName, "SKILL.md");
    if (!existsSync(sourcePath)) {
      console.error(`✗ source skill missing: skills/${skillName}/SKILL.md`);
      process.exit(1);
    }
    const raw = readFileSync(sourcePath, "utf8");
    const { data } = matter(raw);
    for (const id of (data.principles as string[] | undefined) ?? []) {
      principleUnion.add(id);
    }
    const outPath = join(REFERENCE_DIR, `${verb}.md`);
    if (writeIfChanged(outPath, buildPlaybook(verb, skillName, raw))) {
      console.log(`  ✓ reference/${verb}.md`);
      written++;
    } else {
      unchanged++;
    }
  }

  // 2. Sync the union of referenced principles into reference/principles/.
  const principleIndex = new Map<string, string>();
  const allPrinciples: { id: string; title: string; category: string }[] = [];
  const principleFiles = await glob("principles/**/*.md", {
    cwd: ROOT,
    absolute: true,
    nodir: true,
    ignore: ["principles/_schema/**", "principles/README.md"],
  });
  for (const filePath of principleFiles) {
    const parsed = matter(readFileSync(filePath, "utf8"));
    const id = parsed.data.id as string | undefined;
    if (!id) continue;
    principleIndex.set(id, filePath);
    allPrinciples.push({
      id,
      title: String(parsed.data.title ?? id),
      category: String(parsed.data.category ?? ""),
    });
  }

  const missing: string[] = [];
  for (const id of [...principleUnion].sort()) {
    const sourcePath = principleIndex.get(id);
    if (!sourcePath) {
      missing.push(id);
      continue;
    }
    mkdirSync(REF_PRINCIPLES_DIR, { recursive: true });
    const trimmed = trimPrinciple(readFileSync(sourcePath, "utf8"), relative(ROOT, sourcePath));
    if (writeIfChanged(join(REF_PRINCIPLES_DIR, `${id}.md`), trimmed)) {
      console.log(`  ✓ reference/principles/${id}.md`);
      written++;
    } else {
      unchanged++;
    }
  }

  if (missing.length > 0) {
    console.error(`\n✗ principle ids not found in principles/ library: ${missing.join(", ")}\n`);
    process.exit(1);
  }

  // 3. Emit the principle index for the CLI's doctor command.
  mkdirSync(CLI_DATA_DIR, { recursive: true });
  allPrinciples.sort((a, b) => a.id.localeCompare(b.id));
  const indexJson = `${JSON.stringify(allPrinciples, null, 2)}\n`;
  if (writeIfChanged(join(CLI_DATA_DIR, "principles.json"), indexJson)) {
    console.log("  ✓ cli/data/principles.json");
    written++;
  } else {
    unchanged++;
  }

  console.log(`\nDone: ${written} written, ${unchanged} unchanged.`);
}

main().catch((err) => {
  console.error("sync-router-references crashed:", err);
  process.exit(2);
});
