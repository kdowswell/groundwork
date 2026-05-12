#!/usr/bin/env tsx
/**
 * Syncs trimmed principle files into each skill's principles/ directory.
 *
 * For each principle ID listed in a SKILL.md's frontmatter, finds the source
 * principle file, strips the "Further Reading" section and YAML frontmatter,
 * and writes the result to skills/<name>/principles/<id>.md.
 *
 * Run: npm run sync:principles
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import matter from "gray-matter";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SKILLS_GLOB = "skills/**/SKILL.md";
const PRINCIPLES_GLOB = "principles/**/*.md";
const STRIP_HEADINGS = ["## Further Reading"];

function trimPrinciple(raw: string, sourceRelPath: string): string {
  const { content } = matter(raw);

  // Split on H2 boundaries, filter unwanted sections, reassemble
  const sections = content.trim().split(/(?=^## )/m);
  const kept = sections.filter(
    (s) => !STRIP_HEADINGS.some((h) => s.startsWith(h))
  );

  return `<!-- source: ${sourceRelPath} -->\n\n${kept.join("").trim()}\n`;
}

async function main(): Promise<void> {
  // Index all principle files by their `id` frontmatter field
  const principleIndex = new Map<string, string>(); // id -> absolute path
  const principleFiles = await glob(PRINCIPLES_GLOB, {
    cwd: ROOT,
    absolute: true,
    nodir: true,
    ignore: ["principles/_schema/**", "principles/README.md"],
  });

  for (const filePath of principleFiles) {
    const parsed = matter(readFileSync(filePath, "utf8"));
    const id = parsed.data.id as string | undefined;
    if (id) principleIndex.set(id, filePath);
  }

  console.log(`Indexed ${principleIndex.size} principles.\n`);

  // Process each skill
  const skillFiles = await glob(SKILLS_GLOB, {
    cwd: ROOT,
    absolute: true,
    nodir: true,
  });

  let written = 0;
  let unchanged = 0;
  const missing: string[] = [];

  for (const skillFile of skillFiles.sort()) {
    const parsed = matter(readFileSync(skillFile, "utf8"));
    const principles = parsed.data.principles as string[] | undefined;
    if (!principles || principles.length === 0) continue;

    const skillDir = dirname(skillFile);
    const skillName = basename(skillDir);
    const principlesDir = join(skillDir, "principles");

    for (const id of principles) {
      const sourcePath = principleIndex.get(id);
      if (!sourcePath) {
        missing.push(`${skillName}: ${id}`);
        continue;
      }

      const sourceRelPath = relative(ROOT, sourcePath);
      const trimmed = trimPrinciple(readFileSync(sourcePath, "utf8"), sourceRelPath);
      const outPath = join(principlesDir, `${id}.md`);

      if (existsSync(outPath) && readFileSync(outPath, "utf8") === trimmed) {
        unchanged++;
        continue;
      }

      mkdirSync(principlesDir, { recursive: true });
      writeFileSync(outPath, trimmed, "utf8");
      console.log(`  ✓ ${skillName}/principles/${id}.md`);
      written++;
    }
  }

  if (missing.length > 0) {
    console.error("\n✗ Principle IDs not found in principles/ library:");
    for (const m of missing) console.error(`    ${m}`);
    console.error("");
    process.exit(1);
  }

  console.log(`\nDone: ${written} written, ${unchanged} unchanged.`);
}

main().catch((err) => {
  console.error("sync-skill-principles crashed:", err);
  process.exit(2);
});
