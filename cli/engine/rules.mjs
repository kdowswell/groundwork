/**
 * groundwork detector rules.
 *
 * Two kinds:
 *  - file rules: run per file against its content; return line-level findings
 *  - posture rules: run once per repository; return repo-level findings
 *
 * Every rule maps to a principle id from the principles/ library. Rules are
 * heuristics — when unsure they must stay silent (false negatives are cheaper
 * than a noisy detector nobody trusts). Waive per-file/line with
 * `groundwork-disable[-line|-next-line] <rule-id>: reason` or via
 * .groundwork/config.json detector.ignoreRules / detector.ignoreFiles.
 */
import { posix } from "node:path";

const CODE = /\.(jsx?|tsx?|mjs|cjs|py|rb|go|java|kt|cs|php|rs|swift|vue|svelte)$/;
const JS = /\.(jsx?|tsx?|mjs|cjs|vue|svelte)$/;
const PY = /\.py$/;
const DOCKER = /(^|\/)(Dockerfile(\.[\w.-]+)?|[\w.-]+\.dockerfile)$/i;
const WORKFLOW = /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/;

const TEST_PATH =
  /(^|\/)(tests?|__tests__|spec|specs|fixtures|__fixtures__|examples?|mocks?|__mocks__)(\/|$)|\.(test|spec)\.[\w.]+$|_test\.(go|py|rb)$/i;

export function isTestPath(relPath) {
  return TEST_PATH.test(relPath);
}

/** Iterate content lines, yielding [lineNumber (1-based), text]. */
function* lines(content) {
  let n = 0;
  for (const text of content.split("\n")) yield [++n, text];
}

function findAll(content, re, message, opts = {}) {
  const findings = [];
  for (const [line, text] of lines(content)) {
    if (opts.skipLine && opts.skipLine.test(text)) continue;
    const m = text.match(re);
    if (m) {
      findings.push({
        line,
        message: typeof message === "function" ? message(m) : message,
        excerpt: text.trim().slice(0, 120),
      });
    }
  }
  return findings;
}

const PLACEHOLDER_VALUE =
  /(^|['"])(x{3,}|your[-_]|my[-_]|<[^>]*>|example|changeme|placeholder|dummy|test|sample|redacted|\$\{|\{\{|%s|\.\.\.)/i;

/** Version specs that don't resolve from the registry, so a lockfile entry proves nothing. */
const NON_REGISTRY_SPEC = /^(file|link|workspace|portal|git|git\+[a-z]+|github|gitlab|bitbucket|https?):|^[\w.-]+\/[\w.-]+(#.*)?$/i;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const FILE_RULES = [
  {
    id: "hardcoded-secret",
    principle: "secrets-management",
    severity: "error",
    title: "Hardcoded secret",
    files: CODE,
    includeTests: true,
    check(content) {
      const findings = [];
      findings.push(
        ...findAll(content, /AKIA[0-9A-Z]{16}/, "AWS access key id committed to source"),
      );
      findings.push(
        ...findAll(
          content,
          /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
          "private key material committed to source",
        ),
      );
      for (const [line, text] of lines(content)) {
        const m = text.match(
          /(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']([A-Za-z0-9_\-/+=]{20,})["']/i,
        );
        if (m && !PLACEHOLDER_VALUE.test(m[2]) && !/process\.env|os\.environ|getenv/i.test(text)) {
          findings.push({
            line,
            message: `credential-looking literal assigned to ${m[1]}`,
            excerpt: text.trim().slice(0, 120),
          });
        }
      }
      return findings;
    },
  },
  {
    id: "default-credentials",
    principle: "secrets-management",
    severity: "error",
    title: "Default credentials",
    files: CODE,
    check(content) {
      return findAll(
        content,
        /(password|passwd|pwd)\s*[:=]\s*["'](admin|password|passw0rd|changeme|123456|root|letmein)["']/i,
        (m) => `default credential "${m[2]}" assigned to ${m[1]}`,
      );
    },
  },
  {
    id: "swallowed-exception",
    principle: "structured-logging",
    severity: "error",
    title: "Swallowed exception",
    files: CODE,
    check(content, relPath) {
      const findings = [];
      if (JS.test(relPath)) {
        const re = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;
        let m;
        while ((m = re.exec(content)) !== null) {
          const line = content.slice(0, m.index).split("\n").length;
          findings.push({
            line,
            message: "empty catch block — the error vanishes with no log, metric, or rethrow",
            excerpt: m[0].replace(/\s+/g, " ").slice(0, 120),
          });
        }
      }
      if (PY.test(relPath)) {
        const re = /^([ \t]*)except[^\n]*:\s*\n(?:[ \t]*#[^\n]*\n)*\1[ \t]+pass\b/gm;
        let m;
        while ((m = re.exec(content)) !== null) {
          const line = content.slice(0, m.index).split("\n").length;
          findings.push({
            line,
            message: "except/pass — the error vanishes with no log, metric, or re-raise",
            excerpt: "except ...: pass",
          });
        }
      }
      return findings;
    },
  },
  {
    id: "console-debugging",
    principle: "structured-logging",
    severity: "info",
    title: "Debug-print logging",
    files: CODE,
    threshold: 5,
    check(content, relPath) {
      // CLIs and scripts print by design; only flag application source.
      if (/(^|\/)(bin|cli|scripts?|tools)(\/|$)/i.test(relPath)) return [];
      const re = JS.test(relPath)
        ? /(^|[^.\w])console\.(log|debug)\s*\(/
        : PY.test(relPath)
          ? /(^|[^\w.])print\s*\(/
          : null;
      if (!re) return [];
      const hits = findAll(content, re, "", { skipLine: /^\s*(\/\/|#)/ });
      if (hits.length <= this.threshold) return [];
      return [
        {
          line: hits[0].line,
          message: `${hits.length} debug prints in one source file — route through a structured logger`,
          excerpt: hits[0].excerpt,
        },
      ];
    },
  },
  {
    id: "wildcard-cors",
    principle: "zero-trust",
    severity: "warn",
    title: "Wildcard CORS",
    files: CODE,
    check(content) {
      const findings = [];
      findings.push(
        ...findAll(
          content,
          /Access-Control-Allow-Origin["'\s:,=]+\*/i,
          "CORS allows every origin — scope it to known origins",
        ),
      );
      findings.push(
        ...findAll(
          content,
          /origin\s*:\s*["']\*["']/,
          "CORS allows every origin — scope it to known origins",
        ),
      );
      return findings;
    },
  },
  {
    id: "debug-enabled",
    principle: "least-privilege",
    severity: "warn",
    title: "Debug mode enabled",
    files: CODE,
    check(content, relPath) {
      const findings = [];
      if (PY.test(relPath)) {
        findings.push(
          ...findAll(content, /\bdebug\s*=\s*True\b/i, "debug mode on — never ship this enabled", {
            skipLine: /^\s*#/,
          }),
        );
      }
      return findings;
    },
  },
  {
    id: "placeholder-impl",
    principle: "tech-debt-management",
    severity: "warn",
    title: "Placeholder implementation",
    files: CODE,
    check(content) {
      const findings = [];
      findings.push(
        ...findAll(
          content,
          /throw new Error\(["'`][^"'`]*not implemented[^"'`]*["'`]\)|raise NotImplementedError/i,
          "stubbed implementation shipped as if complete",
        ),
      );
      findings.push(
        ...findAll(
          content,
          /(return\s+(null|undefined|true|\[\]|\{\}|None))\s*;?\s*(\/\/|#)\s*(TODO|placeholder|for now|temporary)/i,
          "hardcoded return standing in for real logic",
        ),
      );
      return findings;
    },
  },
  {
    id: "demo-disclaimer",
    principle: "tech-debt-management",
    severity: "warn",
    title: "Demo-grade disclaimer",
    files: CODE,
    check(content) {
      return findAll(
        content,
        /in a real (app|application|production|system|world)|for demo purposes|simplified for (brevity|clarity|this example)|in production,? you would/i,
        "code admits it is not production-grade — finish it or track it as debt",
      );
    },
  },
  {
    id: "mock-data-in-src",
    principle: "testing-strategy",
    severity: "warn",
    title: "Mock data in production source",
    files: CODE,
    check(content) {
      return findAll(
        content,
        /\b(mock|fake|dummy|sample)[_]?(data|users?|items|products|orders|response)\b|lorem ipsum/i,
        "mock/sample data in non-test source — real paths must not depend on it",
        { skipLine: /^\s*(\/\/|#|\*)/ },
      );
    },
  },
  {
    id: "todo-density",
    principle: "tech-debt-management",
    severity: "info",
    title: "High TODO density",
    files: CODE,
    includeTests: true,
    threshold: 5,
    check(content) {
      const hits = findAll(content, /\b(TODO|FIXME|HACK|XXX)\b[:\s]/, "");
      if (hits.length <= this.threshold) return [];
      return [
        {
          line: hits[0].line,
          message: `${hits.length} TODO/FIXME/HACK markers in one file — triage them into tracked debt`,
          excerpt: hits[0].excerpt,
        },
      ];
    },
  },
  {
    id: "missing-http-timeout",
    principle: "fault-isolation",
    severity: "info",
    title: "HTTP call without timeout",
    files: PY,
    check(content) {
      return findAll(
        content,
        /requests\.(get|post|put|delete|patch|head)\s*\((?![^)\n]*timeout\s*=)[^)\n]*\)/,
        "outbound HTTP call with no timeout — a slow dependency stalls this caller forever",
        { skipLine: /^\s*#/ },
      );
    },
  },
  {
    id: "unpinned-github-action",
    principle: "supply-chain-security",
    severity: "info",
    title: "Mutable GitHub Action ref",
    files: WORKFLOW,
    includeTests: true,
    check(content) {
      return findAll(
        content,
        /^\s*(?:-\s*)?uses:\s*\S+@(main|master)\s*$/,
        "action pinned to a moving branch — pin to a tag or commit SHA",
      );
    },
  },
  {
    id: "dockerfile-latest",
    principle: "supply-chain-security",
    severity: "warn",
    title: "Unpinned base image",
    files: DOCKER,
    includeTests: true,
    check(content) {
      return findAll(
        content,
        /^\s*FROM\s+(?!scratch\b)[\w./-]+(:latest)?\s*(AS\s+\w+\s*)?$/i,
        "base image has no version tag (or :latest) — builds are not reproducible",
      );
    },
  },
  {
    id: "unlocked-dependency",
    principle: "supply-chain-security",
    severity: "warn",
    title: "Dependency missing from the lockfile",
    files: /(^|\/)package\.json$/,
    /**
     * A dependency declared in package.json with no entry in the sibling package-lock.json was
     * added without installing. Flag it while it is still only a name, so it can be checked
     * before install: coding assistants sometimes invent plausible package names, and attackers
     * register them. Silent without an npm lockfile (no-lockfile covers that) or on parse errors.
     */
    check(content, relPath, ctx) {
      const lockRaw = ctx?.read?.(posix.join(posix.dirname(relPath), "package-lock.json"));
      if (!lockRaw) return [];
      let pkg;
      let lock;
      try {
        pkg = JSON.parse(content);
        lock = JSON.parse(lockRaw);
      } catch {
        return [];
      }
      const isLocked = lock.packages
        ? (name) => Object.hasOwn(lock.packages, `node_modules/${name}`)
        : lock.dependencies
          ? (name) => Object.hasOwn(lock.dependencies, name)
          : null;
      if (!isLocked) return [];

      const findings = [];
      const textLines = content.split("\n");
      for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
        for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
          if (NON_REGISTRY_SPEC.test(String(spec)) || isLocked(name)) continue;
          const re = new RegExp(`"${escapeRegex(name)}"\\s*:`);
          const index = textLines.findIndex((l) => re.test(l));
          findings.push({
            line: index === -1 ? 1 : index + 1,
            message:
              `${section}.${name} is declared but has no entry in package-lock.json, so it was added without being installed. ` +
              "Check that the package exists and is the one intended (assistants sometimes invent plausible names) before installing; installing it pins it.",
            excerpt: index === -1 ? undefined : textLines[index].trim().slice(0, 120),
          });
        }
      }
      return findings;
    },
  },
];

export const POSTURE_RULES = [
  {
    id: "no-lockfile",
    principle: "supply-chain-security",
    severity: "warn",
    title: "No dependency lockfile",
    check(repo) {
      const findings = [];
      if (
        repo.has("package.json") &&
        !["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb"].some((f) =>
          repo.has(f),
        )
      ) {
        findings.push({
          message: "package.json without a lockfile — installs are not reproducible",
          path: "package.json",
        });
      }
      if (
        (repo.has("pyproject.toml") || repo.has("requirements.txt")) &&
        !["poetry.lock", "uv.lock", "Pipfile.lock", "requirements.lock", "pdm.lock"].some((f) =>
          repo.has(f),
        ) &&
        !repo.read("requirements.txt")?.match(/^\S+==\d/m)
      ) {
        findings.push({
          message: "Python dependencies without a lockfile or pinned versions",
          path: repo.has("pyproject.toml") ? "pyproject.toml" : "requirements.txt",
        });
      }
      return findings;
    },
  },
  {
    id: "floating-dependency",
    principle: "supply-chain-security",
    severity: "warn",
    title: "Floating dependency version",
    check(repo) {
      const raw = repo.read("package.json");
      if (!raw) return [];
      let pkg;
      try {
        pkg = JSON.parse(raw);
      } catch {
        return [];
      }
      const findings = [];
      for (const section of ["dependencies", "devDependencies"]) {
        for (const [name, version] of Object.entries(pkg[section] ?? {})) {
          if (version === "*" || version === "latest" || String(version).startsWith(">=")) {
            findings.push({
              message: `${section}.${name} is "${version}" — any release can break the build`,
              path: "package.json",
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "no-ci-config",
    principle: "ci-cd-pipeline",
    severity: "warn",
    title: "No CI configuration",
    check(repo) {
      const hasCi =
        repo.files.some((f) => WORKFLOW.test(f)) ||
        ["/.gitlab-ci.yml", "/.circleci/config.yml", "/Jenkinsfile", "/azure-pipelines.yml", "/bitbucket-pipelines.yml"].some(
          (f) => repo.has(f.slice(1)),
        );
      if (hasCi || !repo.looksLikeProject) return [];
      return [{ message: "no CI configuration found — nothing verifies changes before merge" }];
    },
  },
  {
    id: "no-tests",
    principle: "testing-strategy",
    severity: "warn",
    title: "No tests",
    check(repo) {
      if (!repo.looksLikeProject) return [];
      const hasTests = repo.files.some((f) => isTestPath(f) && CODE.test(f));
      if (hasTests) return [];
      return [{ message: "no test files found — the only verification is production traffic" }];
    },
  },
  {
    id: "env-file-unignored",
    principle: "secrets-management",
    severity: "error",
    title: ".env not gitignored",
    check(repo) {
      const envFiles = repo.files.filter((f) => /(^|\/)\.env(\.\w+)?$/.test(f) && !/\.env\.(example|sample|template)$/.test(f));
      if (envFiles.length === 0) return [];
      const gitignore = repo.read(".gitignore") ?? "";
      const ignoresEnv = /^\s*\**\.?env(\.\w*)?\s*$|^\s*\.env\*/m.test(gitignore) || /^\s*\.env\b/m.test(gitignore);
      if (ignoresEnv) return [];
      return envFiles.map((f) => ({
        message: ".env file present and not covered by .gitignore — secrets are one commit away from the remote",
        path: f,
      }));
    },
  },
  {
    id: "dockerfile-root",
    principle: "least-privilege",
    severity: "warn",
    title: "Container runs as root",
    check(repo) {
      const findings = [];
      for (const f of repo.files.filter((f) => DOCKER.test(f))) {
        const content = repo.read(f) ?? "";
        if (/^\s*FROM\s+scratch\b/im.test(content)) continue;
        if (!/^\s*USER\s+\S+/im.test(content)) {
          findings.push({
            message: "Dockerfile never drops root — add a USER instruction",
            path: f,
          });
        }
      }
      return findings;
    },
  },
];

export const ALL_RULES = [...FILE_RULES, ...POSTURE_RULES];
