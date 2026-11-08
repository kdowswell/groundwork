/**
 * Principle overlays (ADR-023): a project's or organization's own principles, in the library's
 * format, layered on top of the built-in library.
 *
 *   1. project overlay   .groundwork/principles/<category>/<id>.md
 *   2. org packages      paths listed in .groundwork/config.json  {"principles": {"overlays": [...]}}
 *                        (each a directory laid out like principles/, e.g. node_modules/@acme/principles)
 *   3. built-in library  this package's principles
 *
 * An overlay id must not collide with a built-in or with another overlay unless its frontmatter
 * declares `overrides: <id>`, and then it replaces that principle. Resolution stops at the first
 * layer that defines an id. Self-contained (node: builtins only): it ships inside installed
 * skills and is also imported by the CLI's doctor.
 */
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

export const CATEGORIES = ["reliability", "security", "scalability", "observability", "data", "design", "delivery", "operations"];
export const REQUIRED_SECTIONS = [
  "Principle",
  "When This Matters",
  "When This Doesn't Matter",
  "Questions the Agent Should Ask",
  "What Good Looks Like",
  "What Goes Wrong When You Skip This",
  "Further Reading",
];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function inside(root, abs) {
  const rel = relative(root, abs);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** Overlay source directories in resolution order, each {label, dir}; missing ones are skipped. */
export function overlaySources(root) {
  const sources = [];
  const project = join(root, ".groundwork", "principles");
  if (existsSync(project)) sources.push({ label: "project", dir: project });
  let config = {};
  try {
    config = JSON.parse(readFileSync(join(root, ".groundwork", "config.json"), "utf8"));
  } catch {
    // No config, or not JSON: doctor reports a broken config elsewhere.
  }
  const listed = Array.isArray(config?.principles?.overlays) ? config.principles.overlays : [];
  for (const entry of listed) {
    if (typeof entry !== "string" || entry === "") continue;
    const dir = resolve(root, entry);
    // Org packages live inside the project (for example under node_modules); never read outside it.
    if (!inside(root, dir) || !existsSync(dir)) {
      sources.push({ label: entry, dir, missing: true });
      continue;
    }
    try {
      if (!inside(realpathSync(root), realpathSync(dir))) {
        sources.push({ label: entry, dir, missing: true });
        continue;
      }
    } catch {
      continue;
    }
    sources.push({ label: entry, dir });
  }
  return sources;
}

/** Minimal frontmatter read: the scalar fields and which structured keys are present. */
export function readFrontmatter(text) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const fm = m[1];
  const scalar = (key) => fm.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"))?.[1];
  return {
    id: scalar("id"),
    title: scalar("title"),
    category: scalar("category"),
    overrides: scalar("overrides"),
    hasSources: /^sources:\s*\n\s+-\s+name:/m.test(fm) && /^\s+url:\s*\S/m.test(fm),
    hasAppliesWhen: /^applies_when:\s*\n(\s+(scope|scale|stage|domains):.*\n?){4}/m.test(`${fm}\n`),
    body: text.slice(m[0].length),
  };
}

/**
 * Problems with one overlay principle file, checked without dependencies: the same required
 * frontmatter and sections as the library schema (principles/_schema), in a lighter form.
 */
export function checkOverlayFile(path, text) {
  const errors = [];
  const fm = readFrontmatter(text);
  if (!fm) return ["missing YAML frontmatter"];
  const fileId = basename(path, ".md");
  if (!fm.id || !ID.test(fm.id)) errors.push("id must be kebab-case");
  else if (fm.id !== fileId) errors.push(`id "${fm.id}" must match the filename "${fileId}"`);
  if (!fm.title) errors.push("missing title");
  if (!CATEGORIES.includes(fm.category ?? "")) errors.push(`category must be one of: ${CATEGORIES.join(", ")}`);
  if (!fm.hasSources) errors.push("sources needs at least one entry with name and url");
  if (!fm.hasAppliesWhen) errors.push("applies_when needs scope, scale, stage, and domains");
  if (fm.overrides !== undefined && !ID.test(fm.overrides)) errors.push("overrides must name a principle id");
  let last = -1;
  for (const section of REQUIRED_SECTIONS) {
    const at = fm.body.search(new RegExp(`^## ${section.replace(/'/g, "['’]")}\\s*$`, "m"));
    if (at === -1) errors.push(`missing section "## ${section}"`);
    else if (at < last) errors.push(`section "## ${section}" is out of order`);
    else last = at;
  }
  return errors;
}

function overlayFiles(dir) {
  const out = [];
  for (const cat of readdirSync(dir, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name.startsWith("_") || cat.name.startsWith(".")) continue;
    const catDir = join(dir, cat.name);
    for (const f of readdirSync(catDir, { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith(".md") || f.name.toLowerCase() === "readme.md") continue;
      const abs = join(catDir, f.name);
      if (lstatSync(abs).isSymbolicLink()) continue;
      out.push(abs);
    }
  }
  return out.sort();
}

/**
 * Resolve overlays against the built-in ids.
 * @param {string} root project root
 * @param {Set<string>} builtIn built-in principle ids
 * @returns {{principles: Array<{id: string, title: string, category: string, path: string,
 *   source: string, overrides?: string}>, problems: Array<{path: string, message: string}>,
 *   sources: Array<{label: string, dir: string, missing?: boolean}>}}
 */
export function resolveOverlays(root, builtIn) {
  const sources = overlaySources(root);
  const principles = [];
  const problems = [];
  const seen = new Map(); // id -> overlay entry that defined it first
  for (const src of sources) {
    if (src.missing) {
      problems.push({ path: src.label, message: "overlay package not found inside the project" });
      continue;
    }
    for (const abs of overlayFiles(src.dir)) {
      const rel = relative(root, abs).split(sep).join("/");
      const text = readFileSync(abs, "utf8");
      const errors = checkOverlayFile(abs, text);
      if (errors.length) {
        for (const message of errors) problems.push({ path: rel, message });
        continue;
      }
      const fm = readFrontmatter(text);
      const id = fm.id;
      const declared = fm.overrides === id;
      if (seen.has(id)) {
        // An earlier layer already defines it and wins. That is only intended if the winner says so.
        const winner = seen.get(id);
        if (winner.source === src.label) {
          problems.push({ path: rel, message: `id "${id}" is defined twice in ${src.label}` });
        } else if (!winner.overrides) {
          problems.push({
            path: winner.path,
            message: `id "${id}" also exists in ${src.label} (${rel}); add "overrides: ${id}" to replace it on purpose, or rename it`,
          });
        }
        continue;
      }
      if (builtIn.has(id) && !declared) {
        problems.push({ path: rel, message: `id "${id}" collides with a built-in principle; add "overrides: ${id}" to replace it, or rename it` });
        continue;
      }
      if (fm.overrides !== undefined && fm.overrides !== id) {
        problems.push({ path: rel, message: `overrides must equal the file's own id ("${id}")` });
        continue;
      }
      const entry = { id, title: fm.title, category: fm.category, path: rel, source: src.label };
      if (declared) entry.overrides = id;
      seen.set(id, entry);
      principles.push(entry);
    }
  }
  return { principles, problems, sources };
}
