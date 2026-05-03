#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { glob } from "glob";
import matter from "gray-matter";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SCHEMA_PATH = resolve(ROOT, "principles/_schema/principle.schema.json");
const PRINCIPLES_GLOB = "principles/**/*.md";
const IGNORE = ["principles/README.md", "principles/_schema/**"];

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

  // Cross-checks: filename ↔ id, parent dir ↔ category.
  const fileId = basename(filePath, ".md");
  if (data.id && data.id !== fileId) {
    messages.push(`id "${data.id}" does not match filename "${fileId}"`);
  }

  const parentDir = basename(dirname(filePath));
  if (data.category && data.category !== parentDir) {
    messages.push(
      `category "${data.category}" does not match parent directory "${parentDir}"`,
    );
  }

  return messages.length ? { file: filePath, messages } : null;
}

async function main(): Promise<void> {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const schema = loadSchema();
  const validate = ajv.compile(schema);

  const files = await glob(PRINCIPLES_GLOB, {
    cwd: ROOT,
    ignore: IGNORE,
    absolute: true,
    nodir: true,
  });

  if (files.length === 0) {
    console.log("No principle files found under principles/.");
    return;
  }

  const failures: FileError[] = [];
  for (const file of files.sort()) {
    const failure = validateFile(file, validate, ajv);
    if (failure) failures.push(failure);
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} principle file(s) failed validation:\n`);
    for (const failure of failures) {
      console.error(`  ${relative(ROOT, failure.file)}`);
      for (const msg of failure.messages) {
        console.error(`    - ${msg}`);
      }
    }
    console.error("");
    process.exit(1);
  }

  const noun = files.length === 1 ? "principle file" : "principle files";
  console.log(`✓ ${files.length} ${noun} validated successfully.`);
}

main().catch((err) => {
  console.error("validator crashed:", err);
  process.exit(2);
});
