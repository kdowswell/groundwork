import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { detect, countBySeverity } from "../cli/engine/detect.mjs";
import { globToRegex, parseWaivers, isWaived } from "../cli/engine/scan.mjs";

const ROOT = resolve(__dirname, "..");
const BEFORE = join(ROOT, "examples/case-study/before");
const AFTER = join(ROOT, "examples/case-study/after");

const tempDirs: string[] = [];
function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-test-"));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return dir;
}
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("case-study fixtures", () => {
  it("flags the slop service on every expected rule", () => {
    const { findings } = detect(BEFORE);
    const rules = new Set(findings.map((f: any) => f.rule));
    for (const expected of [
      "hardcoded-secret",
      "default-credentials",
      "swallowed-exception",
      "console-debugging",
      "wildcard-cors",
      "debug-enabled",
      "placeholder-impl",
      "demo-disclaimer",
      "mock-data-in-src",
      "todo-density",
      "missing-http-timeout",
      "dockerfile-latest",
      "dockerfile-root",
      "no-lockfile",
      "floating-dependency",
      "no-ci-config",
      "no-tests",
      "env-file-unignored",
    ]) {
      expect(rules, `expected rule ${expected} to fire on the before fixture`).toContain(expected);
    }
    const counts = countBySeverity(findings);
    expect(counts.error).toBeGreaterThan(0);
  });

  it("every finding names a principle and a location shape", () => {
    const { findings } = detect(BEFORE);
    for (const f of findings) {
      expect(f.principle, `${f.rule} must map to a principle`).toMatch(/^[a-z0-9-]+$/);
      expect(["error", "warn", "info"]).toContain(f.severity);
      expect(f.message.length).toBeGreaterThan(10);
    }
  });

  it("passes the corrected service cleanly", () => {
    const { findings } = detect(AFTER);
    expect(findings).toEqual([]);
  });
});

describe("single-file scans (hook path)", () => {
  it("scans one file and skips posture rules", () => {
    const { findings } = detect(join(BEFORE, "server.js"));
    const rules = new Set(findings.map((f: any) => f.rule));
    expect(rules).toContain("hardcoded-secret");
    expect(rules).not.toContain("no-lockfile");
  });
});

describe("waivers", () => {
  it("respects file-wide, line, and next-line waivers", () => {
    const waivers = parseWaivers(
      [
        "// groundwork-disable todo-density: legacy sweep scheduled",
        "const x = 1; // groundwork-disable-line hardcoded-secret",
        "// groundwork-disable-next-line swallowed-exception",
        "try {} catch (e) {}",
      ].join("\n"),
    );
    expect(isWaived(waivers, "todo-density", 99)).toBe(true);
    expect(isWaived(waivers, "hardcoded-secret", 2)).toBe(true);
    expect(isWaived(waivers, "hardcoded-secret", 3)).toBe(false);
    expect(isWaived(waivers, "swallowed-exception", 4)).toBe(true);
  });

  it("suppresses findings via inline waivers end to end", () => {
    const dir = tempProject({
      "app.js":
        '// groundwork-disable default-credentials: fixture\nconst password = "admin";\n',
    });
    const { findings } = detect(dir);
    expect(findings.map((f: any) => f.rule)).not.toContain("default-credentials");
  });
});

describe("config ignores", () => {
  it("honors detector.ignoreRules and detector.ignoreFiles", () => {
    const dir = tempProject({
      ".groundwork/config.json": JSON.stringify({
        detector: { ignoreRules: ["default-credentials"], ignoreFiles: ["legacy/**"] },
      }),
      "app.js": 'const password = "admin";\n',
      "legacy/old.js": "try { x(); } catch (e) {}\n",
    });
    const { findings } = detect(dir);
    const rules = findings.map((f: any) => f.rule);
    expect(rules).not.toContain("default-credentials");
    expect(findings.filter((f: any) => f.file?.startsWith("legacy/"))).toEqual([]);
  });

  it("throws a clear error on malformed config", () => {
    const dir = tempProject({
      ".groundwork/config.json": "{not json",
      "app.js": "const x = 1;\n",
    });
    expect(() => detect(dir)).toThrow(/config\.json is not valid JSON/);
  });
});

describe("globToRegex", () => {
  it("matches segments and double stars correctly", () => {
    expect(globToRegex("legacy/**").test("legacy/deep/file.js")).toBe(true);
    expect(globToRegex("**/vendor/*.js").test("a/b/vendor/x.js")).toBe(true);
    expect(globToRegex("**/vendor/*.js").test("vendor/x.js")).toBe(true);
    expect(globToRegex("*.js").test("a/b.js")).toBe(false);
    expect(globToRegex("src/*.py").test("src/x.py")).toBe(true);
  });
});

describe("test-path exemptions", () => {
  it("does not flag mock data inside test directories", () => {
    const dir = tempProject({
      "tests/data.test.js": "const mockData = { users: [] };\n",
      "src/data.js": "const mockData = { users: [] };\n",
    });
    const { findings } = detect(dir);
    const files = findings.filter((f: any) => f.rule === "mock-data-in-src").map((f: any) => f.file);
    expect(files).toEqual(["src/data.js"]);
  });
});
