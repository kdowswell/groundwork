#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { glob } from "glob";
import matter from "gray-matter";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SCHEMA_PATH = resolve(ROOT, "skills/_schema/skill.schema.json");
const SKILLS_GLOB = "skills/**/SKILL.md";
const IGNORE: string[] = [];

type FileError = { file: string; messages: string[] };

function loadSchema(): object {
  const raw = readFileSync(SCHEMA_PATH, "utf8");
  return JSON.parse(raw);
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.map((err) => {
    const path = err.instancePath || "(frontmatter root)";
    return `${path} ${err.message ?? "is invalid"}`;
  });
}

const MAX_BODY_LINES = 500;
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function checkDescriptionWhen(description: string): string | null {
  const lower = description.toLowerCase();
  if (
    !lower.includes("invoke") &&
    !lower.includes("use when") &&
    !lower.includes("use after") &&
    !lower.includes("use at") &&
    !lower.includes("use before")
  ) {
    return 'description must state when to invoke the skill (include "Invoke when/at/after/before" or "Use when/at/after/before")';
  }
  return null;
}

function checkBodyLineCount(raw: string): string | null {
  const lines = raw.split("\n").length;
  if (lines > MAX_BODY_LINES) {
    return `SKILL.md is ${lines} lines — must be ${MAX_BODY_LINES} or fewer (move additional detail to separate files)`;
  }
  return null;
}

function checkFileRefsDepth(body: string): string[] {
  const errors: string[] = [];
  for (const match of body.matchAll(MARKDOWN_LINK_RE)) {
    const href = match[2];
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) continue;
    const normalized = href.replace(/^\.\//, "");
    const slashes = (normalized.match(/\//g) ?? []).length;
    if (slashes > 1) {
      errors.push(`file reference "${href}" is more than one level deep`);
    }
  }
  return errors;
}

function checkPrincipleFiles(skillDir: string, principles: unknown): string[] {
  const errors: string[] = [];
  const principlesDir = `${skillDir}/principles`;

  const declaredIds: string[] = Array.isArray(principles)
    ? principles.filter((p): p is string => typeof p === "string")
    : [];

  const fileIds: string[] = existsSync(principlesDir)
    ? readdirSync(principlesDir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.slice(0, -3))
    : [];

  for (const id of declaredIds) {
    if (!fileIds.includes(id)) {
      errors.push(`principle "${id}" is listed in frontmatter but missing from principles/${id}.md`);
    }
  }
  for (const id of fileIds) {
    if (!declaredIds.includes(id)) {
      errors.push(`principles/${id}.md exists but "${id}" is not listed in frontmatter principles`);
    }
  }
  return errors;
}

function checkStepsSection(body: string): string | null {
  const stepsIdx = body.search(/^## Steps\b/m);
  if (stepsIdx === -1) {
    return 'missing "## Steps" section';
  }
  const afterSteps = body.slice(stepsIdx + "## Steps".length);
  const nextSection = afterSteps.search(/^## /m);
  const stepsBlock = nextSection === -1 ? afterSteps : afterSteps.slice(0, nextSection);
  if (!/^\d+\.\s/m.test(stepsBlock)) {
    return '"## Steps" section has no numbered list items';
  }
  return null;
}

function validateFile(
  filePath: string,
  validate: (data: unknown) => boolean,
  ajv: Ajv,
): FileError | null {
  const messages: string[] = [];
  const raw = readFileSync(filePath, "utf8");

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (err) {
    return {
      file: filePath,
      messages: [`failed to parse YAML frontmatter: ${(err as Error).message}`],
    };
  }

  const data = parsed.data;
  if (!data || Object.keys(data).length === 0) {
    return { file: filePath, messages: ["missing YAML frontmatter"] };
  }

  if (!validate(data)) {
    messages.push(...formatAjvErrors(ajv.errors));
  }

  // Cross-checks: skill directory name ↔ name, phase ↔ name prefix.
  // Each skill lives at skills/<phase>-<skill-name>/SKILL.md (flat structure).
  const skillDir = basename(dirname(filePath));

  if (data.name && data.name !== skillDir) {
    messages.push(`name "${data.name}" does not match skill directory "${skillDir}"`);
  }

  if (data.phase && data.name && !String(data.name).startsWith(`${data.phase}-`)) {
    messages.push(
      `name "${data.name}" must start with phase prefix "${data.phase}-"`,
    );
  }

  // Quality checks
  if (typeof data.description === "string") {
    const whenErr = checkDescriptionWhen(data.description);
    if (whenErr) messages.push(whenErr);
  }

  const lineErr = checkBodyLineCount(raw);
  if (lineErr) messages.push(lineErr);

  messages.push(...checkFileRefsDepth(parsed.content));

  const stepsErr = checkStepsSection(parsed.content);
  if (stepsErr) messages.push(stepsErr);

  messages.push(...checkPrincipleFiles(dirname(filePath), data.principles));

  return messages.length ? { file: filePath, messages } : null;
}

async function main(): Promise<void> {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const schema = loadSchema();
  const validate = ajv.compile(schema);

  const files = await glob(SKILLS_GLOB, {
    cwd: ROOT,
    ignore: IGNORE,
    absolute: true,
    nodir: true,
  });

  if (files.length === 0) {
    console.log("No skill files found under skills/.");
    return;
  }

  const failures: FileError[] = [];
  for (const file of files.sort()) {
    const failure = validateFile(file, validate, ajv);
    if (failure) failures.push(failure);
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} skill file(s) failed validation:\n`);
    for (const failure of failures) {
      console.error(`  ${relative(ROOT, failure.file)}`);
      for (const msg of failure.messages) {
        console.error(`    - ${msg}`);
      }
    }
    console.error("");
    process.exit(1);
  }

  const noun = files.length === 1 ? "skill file" : "skill files";
  console.log(`✓ ${files.length} ${noun} validated successfully.`);
}

main().catch((err) => {
  console.error("validator crashed:", err);
  process.exit(2);
});
