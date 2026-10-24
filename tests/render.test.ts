import { request } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { approve } from "../cli/commands/approvals.mjs";
import { render, serve } from "../cli/commands/render.mjs";
import { renderMarkdown } from "../cli/render/markdown.mjs";
import { analyzeArtifact } from "../cli/render/page.mjs";

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-render-"));
  tempDirs.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const SPEC = `# Spec: Escalation tracker

## Problem
Leads cannot see stuck escalations. <img src=x onerror=alert(1)>

## Primary Data Entity
Name: Escalation
Owner: support-operations

Ingestion lives in \`src/server.js\` and follows secrets-management.

## Open Questions
| Question | Category | Owner |
|---|---|---|
| Sync from ticketing or create here? | Blocking | Ops lead |
| Exclude nights from idle time? | Deferrable | PM |

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| What counts as stuck? | Answered in spec (wording tightened) |
| Which channel? | Agent call: in-app only |
| Can an escalation have two owners? | User: changes the data model |
`;

function project(spec = SPEC) {
  const dir = tempDir();
  mkdirSync(join(dir, "docs"));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "docs/spec.md"), spec);
  writeFileSync(join(dir, "src/server.js"), 'const API_KEY = "slop_live_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c";\n');
  return dir;
}

describe("markdown renderer", () => {
  it("escapes raw HTML and drops unsafe links, keeping safe ones", () => {
    const { html } = renderMarkdown(
      "Hi <script>alert(1)</script> [ok](https://example.com) [bad](javascript:alert(1)) [rel](../a.md) [proto](//evil.example)",
    );
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('<a href="https://example.com">ok</a>');
    expect(html).toContain('<a href="../a.md">rel</a>');
    expect(html).not.toMatch(/href="javascript|href="\/\/evil/);
    expect(html).not.toContain("bad)");
  });

  it("renders tables, nested lists, code, headings with ids, and source line breaks", () => {
    const { html, headings } = renderMarkdown(
      "## Scope Here\n- a\n  - b\n- c\n\n| x | y |\n|---|---|\n| `**1**` | 2 |\n\nName: A\nOwner: B\n\n```\n<b>raw</b>\n```",
    );
    expect(headings).toEqual([{ level: 2, text: "Scope Here", id: "scope-here" }]);
    expect(html).toContain('<h2 id="scope-here">');
    expect(html).toContain("<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>");
    expect(html).toContain("<td><code>**1**</code></td>");
    expect(html).toContain("Name: A<br>");
    expect(html).toContain("<pre><code>&lt;b&gt;raw&lt;/b&gt;</code></pre>");
  });
});

describe("artifact analysis", () => {
  it("finds kind, open user questions, blocking questions, principles, and named files", () => {
    const a = analyzeArtifact(SPEC, [
      { id: "secrets-management", title: "Secrets Management", category: "security" },
      { id: "idempotency-by-design", title: "Idempotency by Design", category: "design" },
    ]);
    expect(a.kind?.checkpoint).toBe("greenfield-spec-from-idea/accept");
    expect(a.questions.map((q: any) => q.text)).toEqual([
      "Can an escalation have two owners?",
      "Sync from ticketing or create here?",
    ]);
    expect(a.cited.map((p: any) => p.id)).toEqual(["secrets-management"]);
    expect(a.namedPaths).toContain("src/server.js");
    expect(a.workingSpec).toBe(false);
    expect(analyzeArtifact("# Architecture: X\n\n## Working Spec (unapproved)\n- y").workingSpec).toBe(true);
    // A leading "#" column doesn't get mistaken for the question.
    const numbered = analyzeArtifact(
      "# Spec: X\n\n## Open Questions\n| # | Question | Category |\n|---|---|---|\n| 3 | Who owns the profile? | Blocking |\n",
    );
    expect(numbered.questions.map((q: any) => q.text)).toEqual(["Who owns the profile?"]);
  });
});

describe("groundwork render (static)", () => {
  it("writes a self-contained, git-ignored page with findings and no form", () => {
    const dir = project();
    const result = render(dir, "docs/spec.md");
    expect(result.path).toBe(join(dir, ".groundwork/review/docs__spec.md.html"));
    expect(readFileSync(join(dir, ".groundwork/review/.gitignore"), "utf8")).toBe("*\n");
    const html = readFileSync(result.path!, "utf8");
    expect(html).toContain("Content-Security-Policy");
    expect(html).not.toMatch(/<script|<img/i); // no live tags...
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;"); // ...the payload is inert text
    expect(html).not.toContain("<form");
    expect(html).toContain("hardcoded-secret");
    expect(html).toContain("--serve");
  });

  it("refuses a review directory that is a symlink out of the project", () => {
    const dir = project();
    const outside = tempDir();
    mkdirSync(join(dir, ".groundwork"));
    symlinkSync(outside, join(dir, ".groundwork/review"));
    expect(() => render(dir, "docs/spec.md")).toThrow(/outside/);
    expect(existsSync(join(outside, "docs__spec.md.html"))).toBe(false);
  });
});

/** Raw HTTP so tests control Host and Origin headers. */
function http(
  url: string,
  opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: opts.method ?? "GET", headers: opts.headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function post(url: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  return http(`${url}decision`, {
    method: "POST",
    body: new URLSearchParams(fields).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
  });
}

const tokenOf = (html: string) => html.match(/name="token" value="([0-9a-f]+)"/)![1];
const receiptPath = (dir: string) => join(dir, ".groundwork/approvals/docs__spec.md.json");

describe("changes since approval (ADR-009)", () => {
  it("opens a stale artifact's page with the diff against the approved snapshot", () => {
    const dir = project();
    approve(dir, "docs/spec.md", { checkpoint: "greenfield-spec-from-idea/accept" });
    writeFileSync(join(dir, "docs/spec.md"), SPEC.replace("Owner: support-operations", "Owner: <b>support-leads</b>"));
    const { html } = render(dir, "docs/spec.md", { write: false });
    expect(html).toContain('<a class="badge bad" href="#changes">Changed since approval</a>');
    expect(html).toContain('<section class="changes" id="changes">');
    expect(html).toMatch(/stat-add">\+1<.*stat-del">−1</);
    expect(html).toContain("Owner: &lt;b&gt;support-leads&lt;/b&gt;"); // diff text is escaped
    expect(html).not.toContain("<b>support-leads");

    rmSync(join(dir, ".groundwork/approvals/docs__spec.md.snapshot"));
    expect(render(dir, "docs/spec.md", { write: false }).html).toContain("no snapshot of that version was saved");
  });

  it("shows no changes section for a fresh approval", () => {
    const dir = project();
    approve(dir, "docs/spec.md", { checkpoint: "greenfield-spec-from-idea/accept" });
    expect(render(dir, "docs/spec.md", { write: false }).html).not.toContain('id="changes"');
  });
});

describe("groundwork render --serve", () => {
  it("records the user's approval pinned to the rendered digest, then shuts down", async () => {
    const dir = project();
    const { url, done, rendered } = await serve(dir, "docs/spec.md", { now: new Date("2026-10-22T00:00:00Z") });
    const page = await http(url);
    expect(page.status).toBe(200);
    const res = await post(url, {
      token: tokenOf(page.body),
      sha256: rendered.sha256,
      decision: "approved",
      notes: "ship it",
    });
    expect(res.status).toBe(200);
    const outcome = await done;
    expect(outcome.decision).toBe("approved");
    const receipt = JSON.parse(readFileSync(receiptPath(dir), "utf8"));
    expect(receipt).toMatchObject({
      artifact: "docs/spec.md",
      sha256: rendered.sha256,
      checkpoint: "greenfield-spec-from-idea/accept",
      decision: "approved",
      decidedBy: "user",
      notes: "ship it",
    });
    await expect(http(url)).rejects.toThrow(); // server is gone
  });

  it("accepts the browser's same-origin form post", async () => {
    // Browsers send `Origin: null` on form posts under Referrer-Policy: no-referrer,
    // which the origin check rightly refuses — so the page must not send that policy.
    const dir = project();
    const { url, done, rendered } = await serve(dir, "docs/spec.md");
    const page = await new Promise<{ headers: Record<string, unknown>; body: string }>((resolve, reject) => {
      request(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ headers: res.headers, body }));
      })
        .on("error", reject)
        .end();
    });
    expect(page.headers["referrer-policy"]).toBe("same-origin");
    const origin = new URL(url).origin;
    const res = await post(
      url,
      { token: tokenOf(page.body), sha256: rendered.sha256, decision: "approved" },
      { Origin: origin },
    );
    expect(res.status).toBe(200);
    expect((await done).decision).toBe("approved");
  });

  it("refuses wrong hosts, foreign origins, bad tokens, and unknown decisions", async () => {
    const dir = project();
    const { url, done, rendered, stop } = await serve(dir, "docs/spec.md");
    const token = tokenOf((await http(url)).body);
    const port = new URL(url).port;
    const good = { token, sha256: rendered.sha256, decision: "approved" };

    expect((await http(url, { headers: { Host: `evil.example:${port}` } })).status).toBe(421);
    expect((await post(url, good, { Origin: "https://evil.example" })).status).toBe(403);
    expect((await post(url, { ...good, token: "0".repeat(48) })).status).toBe(403);
    expect((await post(url, { ...good, decision: "delegated" })).status).toBe(400);
    expect(existsSync(receiptPath(dir))).toBe(false);

    stop({ decision: null, reason: "test" });
    expect((await done).decision).toBeNull();
  });

  it("refuses a decision when the file changed after rendering", async () => {
    const dir = project();
    const { url, rendered, stop } = await serve(dir, "docs/spec.md");
    const token = tokenOf((await http(url)).body);
    writeFileSync(join(dir, "docs/spec.md"), `${SPEC}\nEdited after render.\n`);
    const res = await post(url, { token, sha256: rendered.sha256, decision: "approved" });
    expect(res.status).toBe(409);
    expect(existsSync(receiptPath(dir))).toBe(false);
    stop({ decision: null, reason: "test" });
  });

  it("needs a checkpoint for non-groundwork artifacts, and idles out", async () => {
    const dir = project("# Meeting notes\n\nNothing to approve.\n");
    expect(() => serve(dir, "docs/spec.md")).toThrow(/--checkpoint/);
    const { done } = await serve(dir, "docs/spec.md", { checkpoint: "notes/accept", idleMs: 50 });
    expect(await done).toEqual({ decision: null, reason: "idle" });
  });
});
