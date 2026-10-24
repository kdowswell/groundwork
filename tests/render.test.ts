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
    // Hard-wrapped prose joins with a space; short fact lines and hard breaks keep their break.
    const prose = renderMarkdown(`${"x".repeat(70)}\nwraps here\n\nline one  \nline two`).html;
    expect(prose).toContain(`${"x".repeat(70)}\nwraps here</p>`);
    expect(prose).toContain("line one<br>\nline two");
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

const ARCH = `# Architecture: Escalation tracker

## Components
| # | Component | Runs on | State | Responsibility |
|---|---|---|---|---|
| 1 | **Capture Client** | Device, mobile app | Stateless | Collects reports |
| 2 | **Outbox & Sync** | Device | **Stateful**: the system of record | Queues and syncs |
| 3 | **Escalation API** | Backend, one deployable | Stateful | Stores escalations |
| 4 | <img src=x onerror=alert(1)> | Third party (paging) | Stateless | Pages people |

## Primary Data Flow
1. **Report captured (device).** The Capture Client writes to the Outbox.
   *Fails by:* storage full.
2. **Sync.** Outbox & Sync posts to the Escalation API.
3. **Nobody in particular.** Logs are rotated.

## External Dependencies
| Dependency | What we need | Failure mode | Severity |
|---|---|---|---|
| Paging vendor | Pages on-call | Pages are late | Degraded |
| Identity provider | Sign-in | First sign-in fails | Degraded; catastrophic for new users |
| Data store | Everything | Down | Catastrophic |

## Sync / Async Boundary
**Synchronous (user waits):** report capture, local write, and replay (≤ 2 s, p90).
**Asynchronous (background):**
- Sync to the API.
- Paging.
`;

describe("architecture visuals (ADR-009)", () => {
  const MAP = '<figure class="viz sysmap">';
  const page = (source: string) => {
    const dir = project(source);
    return render(dir, "docs/spec.md", { write: false }).html;
  };

  it("draws a lane map with the components each flow step names", () => {
    const html = page(ARCH);
    const at = html.indexOf(MAP);
    const map = html.slice(at, html.indexOf("</figure>", at));
    // Placed under the Components heading, above its table.
    expect(html.indexOf('<h2 id="components">')).toBeLessThan(at);
    expect(at).toBeLessThan(html.indexOf("<th>Component</th>"));
    expect([...map.matchAll(/class="lane"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(["Device", "Backend", "Third party"]);
    expect(map.match(/<span class="tag">stateful<\/span>/g)).toHaveLength(2);
    // Step 1 names Capture Client and "the Outbox" (short alias of "Outbox & Sync"): columns 2 and 3.
    expect(map).toContain('<div class="dot" style="grid-column:2;grid-row:3">');
    expect(map).toContain('<div class="dot" style="grid-column:3;grid-row:3">');
    expect(map).toContain('<div class="wire" style="grid-column:3 / span 2;grid-row:4;margin-inline:calc(50% / 2)">');
    expect(map).toContain("<span>Report captured</span>"); // "(device)" moves to the tooltip
    expect(map).toContain("names no component");
    // Artifact text is never markup.
    expect(map).not.toContain("<img");
    expect(map).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("groups dependencies by severity and splits sync from async", () => {
    const html = page(ARCH);
    expect(html).toMatch(/<section class="sev sev-bad"><h4>Catastrophic <span>1<\/span><\/h4><ul><li[^>]*><strong>Data store/);
    expect(html).toContain("<em>catastrophic for new users</em>");
    expect(html).toMatch(/sev-ok"><h4>Degraded <span>1</);
    expect(html).toContain('<li title="report capture">report capture</li>');
    expect(html).toContain('<li title="replay (≤ 2 s, p90)">replay (≤ 2 s, p90)</li>');
    expect(html).toContain('<li title="Sync to the API">Sync to the API</li>');
  });

  it("asks for a Runs on column instead of guessing lanes, and stays silent without the sections", () => {
    const noLanes = page(ARCH.replace(/\| Runs on /, "| Notes ").replace("|---|---|---|---|---|", "|---|---|---|---|---|"));
    expect(noLanes).toContain("Add a <code>Runs on</code> column");
    expect(noLanes).not.toContain('class="lane"');
    expect(page("# Architecture: Bare\n\nJust prose.\n")).not.toContain("<figure");
    const huge = ARCH.replace(
      "| 4 |",
      Array.from({ length: 12 }, (_, i) => `| x${i} | **Extra ${i}** | Backend | Stateless | More |\n`).join("") + "| 4 |",
    );
    expect(page(huge)).not.toContain(MAP);
  });
});

const FULL_SPEC = `# Spec: Escalation tracker

## Scope
### In scope (v1: one team)
1. **Escalation board.** Leads see stuck items.
2. **Owner changes.** Reassign in one step.

### Non-goals (explicitly out of scope)
- Customer-facing status pages. They belong to support.
- <script>alert(1)</script>

## Success Criteria
1. Leads find stuck items in under a minute.

## Open Questions
| # | Question | Category | Owner |
|---|---|---|---|
| 1 | Sync from ticketing or create here? | Blocking: needed before the model | Ops lead |
| 2 | Exclude nights from idle time? | Deferrable (UX in build) | PM |
| 3 | Which region? | Nice to know | PM |

## Riskiest Assumption
Leads will check a board rather than wait for chat pings,
often enough to catch stuck escalations within a day.

If false, alerts matter more than the board.

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| What counts as stuck? | Answered in spec (wording tightened) |
| Which channel? | Agent call: in-app only |
| Two owners? | User: changes the data model |
| Night hours? | Deferrable: Open Question 2 |
| Board columns? | Method content (ops lead) |
`;

describe("spec visuals (ADR-009)", () => {
  const page = (source: string) => render(project(source), "docs/spec.md", { write: false }).html;

  it("opens with the riskiest assumption and counts that link to their sections", () => {
    const html = page(FULL_SPEC);
    const top = html.slice(html.indexOf("<article>"), html.indexOf('<h2 id="scope">'));
    expect(top).toContain('<a class="claim" href="#riskiest-assumption"><span>Riskiest assumption</span>Leads will check a board rather than wait for chat pings, often enough');
    expect(top).not.toContain("If false"); // only the claim, not the consequences
    expect([...top.matchAll(/<li><a href="#([a-z-]+)">([^<]+)<\/a>/g)].map((m) => `${m[1]}: ${m[2]}`)).toEqual([
      "scope: 2 in scope",
      "scope: 2 not doing",
      "success-criteria: 1 success criteria",
      "open-questions: 3 open questions, 1 blocking",
    ]);
  });

  it("puts scope side by side and open questions on a board with owners", () => {
    const html = page(FULL_SPEC);
    expect(html).toMatch(/<section class="scope-col in"><h4>In scope <span>2<\/span><\/h4><div class="small">v1: one team<\/div><ol><li[^>]*>Escalation board<\/li>/);
    expect(html).toMatch(/<section class="scope-col out">.*<ul><li[^>]*>Customer-facing status pages<\/li><li[^>]*>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/li><\/ul>/);
    expect(html).not.toContain("<script>");
    expect(html).toContain('<ul class="chips owners"><li>PM <b>2</b></li><li>Ops lead <b>1</b></li></ul>');
    const order = [...html.matchAll(/<section class="sev [^"]*"><h4>([^<]+) <span>(\d+)/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(order).toEqual(["Blocking 1", "Deferrable 1", "Nice to know 1"]);
    expect(html).toContain('<b class="qn">1</b> <strong>Sync from ticketing or create here?</strong><span>needed before the model</span><i class="owner">Ops lead</i>');
    expect(html).toContain("<span>UX in build</span>"); // "(UX in build)" loses its parentheses
  });

  it("draws the builder-check bar for every artifact kind", () => {
    const legend = (html: string) => [...html.matchAll(/<li><i class="sw ([a-z-]+)"><\/i>([^<]+) <b>(\d+)/g)].map((m) => `${m[2]} ${m[3]} ${m[1]}`);
    const expected = ["Answered 1 r-answered", "Agent call 1 r-agent", "User 1 r-user", "Deferred 1 r-deferred", "Method content 1 r-other"];
    expect(legend(page(FULL_SPEC))).toEqual(expected);
    const checkOnly = FULL_SPEC.slice(FULL_SPEC.indexOf("## Builder Check"));
    expect(legend(page(`# Architecture: X\n\n${checkOnly}`))).toEqual(expected);
    expect(legend(page(`# Data Model: X\n\n${checkOnly}`))).toEqual(expected);
    expect(page(`# Meeting notes\n\n${checkOnly}`)).not.toContain('class="viz bcheck"'); // not a groundwork artifact
  });
});

const MODEL = `# Data Model: Escalations

## Entities
| Entity | Definition | Owner |
|---|---|---|
| Team | A support team | Accounts |
| Escalation | A stuck customer issue | Support ops |
| Note | A comment on an escalation | Support ops |
| <b>Agent</b> | A person who works escalations | Accounts |

## Relationships
| Entity A | Relationship | Entity B | Notes |
|---|---|---|---|
| Team | one-to-many | Escalation | Each escalation has one team |
| Note | many-to-one | Escalation | |
| Escalation | many-to-many | <b>Agent</b> | Watchers |
| Escalation | 1:N | AuditEvent | Not listed above |
| Note | sometimes | Team | No cardinality: skipped |

## Consistency Requirements
| Boundary | Requirement | Reason |
|---|---|---|
| Escalation → Note | Eventual | Notes can lag |
| Team → Escalation | Strong | Reassignment must not double-assign |
| Escalation → Search | Strong at write, eventual to search | Index lags |
`;

describe("data model visuals (ADR-009)", () => {
  const page = (source: string, context?: string) => {
    const dir = project(source);
    if (context) {
      mkdirSync(join(dir, ".groundwork"), { recursive: true });
      writeFileSync(join(dir, ".groundwork/context.md"), context);
    }
    return render(dir, "docs/spec.md", { write: false }).html;
  };
  const ERD = '<figure class="viz erd">';
  const nodeY = (html: string, name: string) =>
    Number(html.match(new RegExp(`<title>${name}[^<]*</title><rect x="[\\d.]+" y="([\\d.]+)"`))![1]);

  it("lays out entities with the one side above the many side", () => {
    const html = page(MODEL);
    const at = html.indexOf(ERD);
    expect(html.indexOf('<h2 id="entities">')).toBeLessThan(at);
    expect(at).toBeLessThan(html.indexOf("<th>Definition</th>"));
    // Team (1) above Escalation (N); "many-to-one" flips so Escalation sits above Note.
    expect(nodeY(html, "Team")).toBeLessThan(nodeY(html, "Escalation"));
    expect(nodeY(html, "Escalation")).toBeLessThan(nodeY(html, "Note"));
    // Named only in Relationships: drawn dashed and labeled.
    expect(html).toContain('<g class="node unlisted"><title>AuditEvent — Named in Relationships but not in Entities</title>');
    // A relationship with no cardinality is skipped, not guessed.
    expect(html).not.toContain("Note sometimes Team");
    // Escaped labels, and owners in the legend.
    expect(html).not.toContain("<b>Agent</b>");
    expect(html).toContain("&lt;b&gt;Agent&lt;/b&gt;");
    expect([...html.matchAll(/<li><i class="sw" style="background:[^"]+"><\/i>([^<]+)<\/li>/g)].map((m) => m[1])).toEqual([
      "Accounts",
      "Support ops",
    ]);
  });

  it("survives cycles, and draws nothing without both tables or past the size cap", () => {
    const cyclic = MODEL.replace("| Note | sometimes | Team |", "| Escalation | one-to-many | Team |");
    expect(page(cyclic)).toContain(ERD);
    expect(page(MODEL.replace("## Relationships", "## Links"))).not.toContain(ERD);
    const many = Array.from({ length: 17 }, (_, i) => `| E${i} | one-to-many | E${i + 1} | |`).join("\n");
    expect(page(`# Data Model: Big\n\n## Entities\n| Entity | Owner |\n|---|---|\n| E0 | x |\n\n## Relationships\n| Entity A | Relationship | Entity B | Notes |\n|---|---|---|---|\n${many}\n`)).not.toContain(ERD);
  });

  it("groups consistency boundaries, strongest first", () => {
    const html = page(MODEL);
    const order = [...html.slice(html.indexOf('<figure class="viz consistency">')).matchAll(/<section class="sev ([a-z-]*)"><h4>([^<]+) <span>/g)]
      .slice(0, 3)
      .map((m) => `${m[2]} ${m[1]}`);
    expect(order).toEqual(["Strong sev-bad", "Strong at write sev-warn", "Eventual sev-ok"]);
  });

  it("shows coverage of the project's active principles, ignoring excluded ones", () => {
    const context = `# Context

## Active Principles
- data-ownership — one owner per entity
- consistency-models — explicit rules
- secrets-management — keys stay server-side

Suppressed or excluded:
- feature-flags — not needed

## Stack
- Node
`;
    const html = page(`${MODEL}\n## Principle Compliance Notes\n- data-ownership: owners named.\n- consistency-models: see above.\n- idempotency-by-design: client IDs.\n`, context);
    expect(html).toContain("<h2>Active principles</h2>");
    expect(html).toContain("2 of 3 addressed in this data model");
    expect(html).toMatch(/<li class="miss"><span class="mark">–<\/span><a [^>]*>Secrets Management<\/a> <span class="small">not addressed/);
    expect(html).not.toContain("Feature Flags");
    expect(html).toMatch(/Also cited: <a [^>]*>Idempotency by Design<\/a>/);
    // No context file: the plain cited list, as before.
    expect(page(MODEL)).toContain("<h2>Principles cited</h2>");
  });
});

describe("change plans (ADR-012)", () => {
  const FIXTURES = join(__dirname, "../eval/plugin/_fixtures");
  const PLAN = readFileSync(join(FIXTURES, "plan-team-calendars.md"), "utf8");
  function brownfield() {
    const dir = tempDir();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs/spec.md"), readFileSync(join(FIXTURES, "spec-long.md"), "utf8"));
    writeFileSync(join(dir, "docs/plan.md"), PLAN);
    return dir;
  }

  it("recognizes the plan and draws its delta, blast radius, and baseline", () => {
    const dir = brownfield();
    approve(dir, "docs/spec.md", { checkpoint: "greenfield-spec-from-idea/accept" });
    const r = render(dir, "docs/plan.md", { write: false });
    expect(r.checkpoint).toBe("brownfield-safe-change-plan/accept");
    const counts = [...r.html.matchAll(/<section class="dcol ([a-z-]+)"><h4>(\w+) <span>(\d+)/g)].map((m) => `${m[2]} ${m[3]}`);
    expect(counts).toEqual(["Added 2", "Modified 3", "Removed 1", "Unchanged 3"]);
    expect(r.html).toContain("<strong>Team calendars.</strong> Each team has its own business-hours calendar");
    expect(r.html).toContain('<span class="was">One business-hours calendar for all teams in v1</span>');
    expect(r.html).toContain('<span class="ref">Scope, item 19 (Business calendar)</span>');
    expect(r.html).toMatch(/<figure class="viz callout warn"><span>Blast radius<\/span><strong>Silent<\/strong>/);
    expect(r.html).not.toContain("<span>One-way door</span>"); // "One-way doors: None" draws no callout
    expect(r.html).toMatch(/<h2>Baseline<\/h2><p><code>docs\/spec\.md<\/code><\/p><span class="badge ok">Approved, unchanged since/);
  });

  it("flags a missing Unchanged list, a one-way door, and an observed-behavior baseline", () => {
    const dir = brownfield();
    const risky = PLAN.replace(/### Unchanged[\s\S]*?(?=## Blast Radius)/, "")
      .replace("One-way doors: None", "One-way doors: dropping the shared calendar table")
      .replace("Baseline: docs/spec.md (approved 2026-10-20)", "Baseline: observed behavior (no spec): src/idle.js");
    writeFileSync(join(dir, "docs/plan.md"), risky);
    const { html } = render(dir, "docs/plan.md", { write: false });
    expect(html).toContain("No Unchanged items");
    expect(html).toMatch(/<span>One-way door<\/span><strong>dropping the shared calendar table<\/strong>/);
    expect(html).toContain("No spec: the plan's Before items cite observed behavior.");
  });

  it("shows an amended spec's own change, and its lapse when the plan changes", () => {
    const dir = brownfield();
    approve(dir, "docs/spec.md", { checkpoint: "greenfield-spec-from-idea/accept" });
    approve(dir, "docs/plan.md", { checkpoint: "brownfield-safe-change-plan/accept" });
    const spec = readFileSync(join(dir, "docs/spec.md"), "utf8");
    writeFileSync(join(dir, "docs/spec.md"), spec.replace("One business-hours calendar for all teams in v1.", "Each team's own business-hours calendar."));
    approve(dir, "docs/spec.md", { decision: "amended", via: "docs/plan.md" } as any);

    const amended = render(dir, "docs/spec.md", { write: false }).html;
    expect(amended).toContain('<a class="badge ok" href="#amendment">Amended via docs/plan.md');
    expect(amended).toContain('<section class="changes" id="amendment">');
    expect(amended).toMatch(/stat-add">\+1<.*stat-del">−1</);
    // The plan's page shows its baseline as amended, without a link to a section it doesn't have.
    expect(render(dir, "docs/plan.md", { write: false }).html).toMatch(/<span class="badge ok">Amended via docs\/plan\.md/);

    writeFileSync(join(dir, "docs/plan.md"), `${PLAN}\nEdited after approval.\n`);
    const lapsed = render(dir, "docs/spec.md", { write: false }).html;
    expect(lapsed).toContain("Amendment lapsed: docs/plan.md changed after it was approved");
    expect(lapsed).not.toContain('id="amendment"');
  });
});

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
