import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { doctor } from "../cli/commands/doctor.mjs";
import { install } from "../cli/commands/install.mjs";
import { amendmentDiff, approve, approvedDiff, snapshotPath, verify } from "../cli/commands/approvals.mjs";
import { diffHunks, formatUnified, lineDiff } from "../cli/render/diff.mjs";

const ROOT = resolve(__dirname, "..");
const BIN = join(ROOT, "cli/bin/groundwork.mjs");
const BEFORE = join(ROOT, "examples/case-study/before");
const AFTER = join(ROOT, "examples/case-study/after");

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-cli-"));
  tempDirs.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function runCli(args: string[], opts: { cwd?: string } = {}) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      cwd: opts.cwd ?? ROOT,
      encoding: "utf8",
    });
    return { status: 0, stdout };
  } catch (err: any) {
    return { status: err.status as number, stdout: String(err.stdout ?? "") };
  }
}

describe("groundwork detect (CLI)", () => {
  it("exits 1 with JSON findings on the slop fixture", () => {
    const { status, stdout } = runCli(["detect", "--json", BEFORE]);
    expect(status).toBe(1);
    const report = JSON.parse(stdout);
    expect(report.version).toBe(1);
    expect(report.counts.error).toBeGreaterThan(0);
    expect(report.findings.length).toBeGreaterThan(10);
  });

  it("exits 0 on the corrected fixture", () => {
    const { status, stdout } = runCli(["detect", "--json", AFTER]);
    expect(status).toBe(0);
    expect(JSON.parse(stdout).findings).toEqual([]);
  });

  it("prints human output with principle attribution", () => {
    const { stdout } = runCli(["detect", BEFORE]);
    expect(stdout).toContain("principle: secrets-management");
    expect(stdout).toContain("groundwork-disable");
  });

  it("fails on unknown commands with help", () => {
    const { status } = runCli(["bogus"]);
    expect(status).toBe(2);
  });
});

describe("groundwork doctor", () => {
  it("errors when context is missing", () => {
    const dir = tempDir();
    const result = doctor(dir);
    expect(result.findings.map((f: any) => f.check)).toContain("context-missing");
  });

  it("flags stale dates, empty principles, unknown ids, and stack drift", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".groundwork"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork", "context.md"),
      [
        "# Project Context — test",
        "## Stack",
        "- Languages: COBOL",
        "## Stage",
        "- Current stage: build",
        "- Last reviewed: 2020-01-01",
        "## Active Principles",
        "- not-a-real-principle — because",
      ].join("\n"),
    );
    writeFileSync(join(dir, "package.json"), "{}");
    const checks = doctor(dir).findings.map((f: any) => f.check);
    expect(checks).toContain("context-stale");
    expect(checks).toContain("unknown-principle");
    expect(checks).toContain("stack-drift");
  });

  it("passes a fresh, consistent context", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".groundwork"), { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(
      join(dir, ".groundwork", "context.md"),
      [
        "# Project Context — test",
        "## Stack",
        "- Languages: TypeScript (Node)",
        "## Stage",
        `- Last reviewed: ${today}`,
        "## Active Principles",
        "- testing-strategy — we ship a library",
      ].join("\n"),
    );
    writeFileSync(join(dir, "package.json"), "{}");
    expect(doctor(dir).findings).toEqual([]);
  });

  it("exits 1 via the CLI when findings exist", () => {
    const dir = tempDir();
    const { status, stdout } = runCli(["doctor", "--json", dir]);
    expect(status).toBe(1);
    expect(JSON.parse(stdout).findings.length).toBeGreaterThan(0);
  });
});

describe("groundwork install", () => {
  it("installs the router skill with an embedded engine", () => {
    const dir = tempDir();
    const result = install({ projectRoot: dir, providers: ["claude"] });
    expect(result.summary[0].count).toBe(1);
    const skillDir = join(dir, ".claude/skills/groundwork");
    expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillDir, "reference/plan.md"))).toBe(true);
    expect(existsSync(join(skillDir, "reference/init.md"))).toBe(true);
    expect(existsSync(join(skillDir, "scripts/context.mjs"))).toBe(true);
    expect(existsSync(join(skillDir, "scripts/engine/detect.mjs"))).toBe(true);
    expect(existsSync(join(skillDir, "scripts/data/principles.json"))).toBe(true);
  });

  it("installs standalone skills with --all-skills across providers", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".github"));
    const result = install({ projectRoot: dir, allSkills: true });
    expect(result.providers).toEqual(["github"]);
    expect(result.summary[0].count).toBe(16);
    expect(existsSync(join(dir, ".github/skills/brownfield-safe-change-plan/SKILL.md"))).toBe(true);
  });

  it("auto-detects providers and rejects unknown ones", () => {
    const dir = tempDir();
    expect(install({ projectRoot: dir }).providers).toEqual(["claude"]);
    expect(() => install({ projectRoot: dir, providers: ["vim"] })).toThrow(/unknown provider/);
  });

  it("installs the Claude hook idempotently and preserves existing settings", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".claude"), { recursive: true });
    writeFileSync(
      join(dir, ".claude/settings.local.json"),
      JSON.stringify({ permissions: { allow: ["Bash(ls)"] } }),
    );
    install({ projectRoot: dir, providers: ["claude"], hooks: true });
    install({ projectRoot: dir, providers: ["claude"], hooks: true });
    const settings = JSON.parse(readFileSync(join(dir, ".claude/settings.local.json"), "utf8"));
    expect(settings.permissions.allow).toEqual(["Bash(ls)"]);
    for (const event of ["SessionStart", "PostToolUse", "Stop"]) {
      expect(settings.hooks[event]).toHaveLength(1);
      expect(JSON.stringify(settings.hooks[event][0])).toContain("hook.mjs");
    }
    expect(settings.hooks.PostToolUse[0].matcher).toBe("Edit|Write|MultiEdit");
    expect(settings.hooks.Stop[0].matcher).toBeUndefined();
  });
});

describe("context loader (skill script)", () => {
  const LOADER = join(ROOT, "skills/groundwork/scripts/context.mjs");

  it("reports CONTEXT_MISSING outside a project", () => {
    const dir = tempDir();
    const stdout = execFileSync(process.execPath, [LOADER], { cwd: dir, encoding: "utf8" });
    expect(stdout).toContain("CONTEXT_MISSING");
  });

  it("prints the context with directives when present", () => {
    const stdout = execFileSync(process.execPath, [LOADER], { cwd: ROOT, encoding: "utf8" });
    expect(stdout).toContain("CONTEXT_OK");
    expect(stdout).toContain("---BEGIN PROJECT CONTEXT---");
    expect(stdout).toContain("Project Context — groundwork");
  });
});

describe("hook script", () => {
  const HOOK = join(ROOT, "skills/groundwork/scripts/hook.mjs");

  it("emits additionalContext for a file with findings and exits 0", () => {
    const event = JSON.stringify({
      tool_input: { file_path: join(BEFORE, "server.js") },
      cwd: BEFORE,
    });
    const stdout = execFileSync(process.execPath, [HOOK], {
      input: event,
      encoding: "utf8",
    });
    const parsed = JSON.parse(stdout);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("hardcoded-secret");
  });

  it("stays silent on clean files and malformed input", () => {
    const clean = execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_input: { file_path: join(AFTER, "orders.js") } }),
      encoding: "utf8",
    });
    expect(clean).toBe("");
    const garbage = execFileSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" });
    expect(garbage).toBe("");
  });

  const stateDir = tempDir();
  const runHook = (event: object) =>
    execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify(event),
      encoding: "utf8",
      env: { ...process.env, GROUNDWORK_HOOK_STATE_DIR: stateDir },
    });
  let sessionSeq = 0;
  const newSession = () => `vitest-${process.pid}-${Date.now()}-${sessionSeq++}`;
  const ledgerFor = (id: string) => join(stateDir, `${id}.log`);

  it("SessionStart digests project context and stays silent outside groundwork projects", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".git"));
    expect(runHook({ hook_event_name: "SessionStart", cwd: dir })).toBe("");

    mkdirSync(join(dir, ".groundwork"));
    writeFileSync(
      join(dir, ".groundwork/context.md"),
      "# Project Context\n\n## Stage\n- Last reviewed: 2000-01-01\n\n## Active Principles\n" +
        "- secrets-management — no secrets in code\n- idempotency — retries are safe\n",
    );
    mkdirSync(join(dir, "docs/decisions"), { recursive: true });
    writeFileSync(join(dir, "docs/decisions/ADR-001-x.md"), "# ADR-001\n\n**Status:** Proposed\n");
    writeFileSync(join(dir, "docs/decisions/ADR-002-y.md"), "# ADR-002\n\n**Status:** Accepted\n");

    const parsed = JSON.parse(runHook({ hook_event_name: "SessionStart", cwd: dir }));
    const ctx: string = parsed.hookSpecificOutput.additionalContext;
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(ctx).toContain("secrets-management, idempotency");
    expect(ctx).toContain("stale");
    expect(ctx).toContain("ADR-001-x.md");
    expect(ctx).not.toContain("ADR-002-y.md");
  });

  it("SessionStart reminds the agent of approved change plans whose delta isn't applied yet (ADR-012)", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".groundwork"));
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, ".groundwork/context.md"), "# Project Context\n\n## Active Principles\n- secrets-management — x\n");
    writeFileSync(join(dir, "docs/spec.md"), "# Spec: X\n\nOne calendar.\n");
    writeFileSync(join(dir, "docs/plan.md"), "# Safe Change Plan: Y\n\nBaseline: docs/spec.md\n");
    approve(dir, "docs/spec.md", { checkpoint: "greenfield-spec-from-idea/accept" });
    const digest = () => JSON.parse(runHook({ hook_event_name: "SessionStart", cwd: dir })).hookSpecificOutput.additionalContext as string;

    expect(digest()).not.toContain("Approved change plan"); // not approved yet
    approve(dir, "docs/plan.md", { checkpoint: "brownfield-safe-change-plan/accept" });
    expect(digest()).toContain("Approved change plan docs/plan.md: when you implement it, apply its Behavior Delta");
    expect(digest()).toContain("--decision=amended --via=docs/plan.md");

    writeFileSync(join(dir, "docs/spec.md"), "# Spec: X\n\nPer-team calendars.\n");
    approve(dir, "docs/spec.md", { decision: "amended", via: "docs/plan.md" } as any);
    expect(digest()).not.toContain("Approved change plan"); // applied: nothing to remind
  });

  it("Stop blocks once on unresolved errors from files edited this turn, then clears", () => {
    const session = newSession();
    runHook({
      hook_event_name: "PostToolUse",
      session_id: session,
      cwd: BEFORE,
      tool_input: { file_path: join(BEFORE, "server.js") },
    });
    expect(existsSync(ledgerFor(session))).toBe(true);

    const parsed = JSON.parse(runHook({ hook_event_name: "Stop", session_id: session, cwd: BEFORE }));
    expect(parsed.decision).toBe("block");
    expect(parsed.reason).toContain("hardcoded-secret");
    expect(existsSync(ledgerFor(session))).toBe(false);

    // Nothing edited since: the next stop is silent.
    expect(runHook({ hook_event_name: "Stop", session_id: session, cwd: BEFORE })).toBe("");
  });

  it("Stop never blocks when stop_hook_active is set", () => {
    const session = newSession();
    runHook({
      hook_event_name: "PostToolUse",
      session_id: session,
      cwd: BEFORE,
      tool_input: { file_path: join(BEFORE, "server.js") },
    });
    const out = runHook({
      hook_event_name: "Stop",
      session_id: session,
      cwd: BEFORE,
      stop_hook_active: true,
    });
    expect(out).toBe("");
    expect(existsSync(ledgerFor(session))).toBe(false);
  });

  it("Stop reports warnings to the user without blocking, and is silent for clean edits", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "cors.js"), 'res.setHeader("Access-Control-Allow-Origin", "*");\n');
    const warnSession = newSession();
    runHook({
      hook_event_name: "PostToolUse",
      session_id: warnSession,
      cwd: dir,
      tool_input: { file_path: join(dir, "cors.js") },
    });
    const parsed = JSON.parse(runHook({ hook_event_name: "Stop", session_id: warnSession, cwd: dir }));
    expect(parsed.decision).toBeUndefined();
    expect(parsed.systemMessage).toContain("1 warning");

    const cleanSession = newSession();
    runHook({
      hook_event_name: "PostToolUse",
      session_id: cleanSession,
      cwd: AFTER,
      tool_input: { file_path: join(AFTER, "orders.js") },
    });
    expect(runHook({ hook_event_name: "Stop", session_id: cleanSession, cwd: AFTER })).toBe("");
  });
});

describe("groundwork approve / verify", () => {
  const NOW = new Date("2026-10-22T12:00:00Z");
  function projectWithSpec() {
    const dir = tempDir();
    mkdirSync(join(dir, "docs/specs"), { recursive: true });
    writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\n\nScope: v1.\n");
    return dir;
  }

  it("records a hash-pinned receipt and verifies it fresh", () => {
    const dir = projectWithSpec();
    const { receipt, path, replaced } = approve(dir, "docs/specs/orders.md", {
      checkpoint: "greenfield-spec-from-idea/scope",
      notes: "ship v1 only",
      now: NOW,
    });
    expect(replaced).toBe(false);
    expect(path).toBe(join(dir, ".groundwork/approvals/docs__specs__orders.md.json"));
    expect(receipt).toMatchObject({
      version: 1,
      artifact: "docs/specs/orders.md",
      decision: "approved",
      decidedBy: "user",
      date: "2026-10-22",
      notes: "ship v1 only",
    });
    expect(receipt.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(verify(dir)).toMatchObject({ ok: true, receipts: [{ status: "fresh" }] });
    expect(verify(dir, "docs/specs/orders.md").ok).toBe(true);
  });

  it("flags stale and missing artifacts, and treats CRLF checkouts as unchanged", () => {
    const dir = projectWithSpec();
    approve(dir, "docs/specs/orders.md", { checkpoint: "scope", now: NOW });

    writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\r\n\r\nScope: v1.\r\n");
    expect(verify(dir).ok).toBe(true);

    writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\n\nScope: v1 and v2.\n");
    expect(verify(dir)).toMatchObject({ ok: false, receipts: [{ status: "stale" }] });
    expect(verify(dir, "docs/specs/orders.md").ok).toBe(false);

    rmSync(join(dir, "docs/specs/orders.md"));
    expect(verify(dir).receipts[0].status).toBe("missing");
  });

  it("snapshots the decided-on text and reports what changed since (ADR-009)", () => {
    const dir = projectWithSpec();
    approve(dir, "docs/specs/orders.md", { checkpoint: "scope", now: NOW });
    const snap = snapshotPath(dir, "docs/specs/orders.md");
    expect(snap).toBe(join(dir, ".groundwork/approvals/docs__specs__orders.md.snapshot"));
    expect(readFileSync(snap, "utf8")).toBe("# Orders\n\nScope: v1.\n");
    expect(approvedDiff(dir, "docs/specs/orders.md")).toMatchObject({ status: "fresh" });

    writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\n\nScope: v1 and v2.\nOwner: ops.\n");
    expect(verify(dir).receipts[0]).toMatchObject({ status: "stale", changes: { added: 2, removed: 1 } });
    const d = approvedDiff(dir, "docs/specs/orders.md");
    expect(d.ops!.filter((o: any) => o.op !== " ").map((o: any) => `${o.op}${o.text}`)).toEqual([
      "-Scope: v1.",
      "+Scope: v1 and v2.",
      "+Owner: ops.",
    ]);

    // A snapshot that doesn't hash to the receipt is never trusted.
    writeFileSync(snap, "# Orders\n\nforged approved text\n");
    expect(verify(dir).receipts[0]).toMatchObject({ status: "stale", changes: null });
    expect(approvedDiff(dir, "docs/specs/orders.md").reason).toMatch(/no snapshot/);

    // Pre-ADR-009 receipts (no snapshot) still verify; they just can't diff.
    rmSync(snap);
    expect(verify(dir).receipts[0]).toMatchObject({ status: "stale", changes: null });
  });

  it("refuses to write a snapshot through a symlink", () => {
    const outside = tempDir();
    const victim = join(outside, "victim.txt");
    writeFileSync(victim, "keep\n");
    const dir = projectWithSpec();
    mkdirSync(join(dir, ".groundwork/approvals"), { recursive: true });
    symlinkSync(victim, snapshotPath(dir, "docs/specs/orders.md"));
    expect(() => approve(dir, "docs/specs/orders.md", { checkpoint: "scope" })).toThrow(/regular file/);
    expect(readFileSync(victim, "utf8")).toBe("keep\n");
  });

  it("CLI: verify --diff prints the change since the decision", () => {
    const dir = projectWithSpec();
    expect(runCli(["approve", "docs/specs/orders.md", "--checkpoint=scope"], { cwd: dir }).status).toBe(0);
    writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\n\nScope: v2.\n");
    const out = runCli(["verify", "docs/specs/orders.md", "--diff"], { cwd: dir });
    expect(out.status).toBe(1);
    expect(out.stdout).toContain("+1 −1 lines since the decision");
    expect(out.stdout).toContain("-Scope: v1.\n+Scope: v2.");
  });

  describe("amendments (ADR-012)", () => {
    function projectWithPlan() {
      const dir = projectWithSpec();
      approve(dir, "docs/specs/orders.md", { checkpoint: "greenfield-spec-from-idea/accept", now: NOW });
      writeFileSync(join(dir, "docs/specs/plan.md"), "# Safe Change Plan: v2\n\nModified: v1 -> v2\n");
      return dir;
    }
    const amend = (dir: string, via = "docs/specs/plan.md") =>
      approve(dir, "docs/specs/orders.md", { decision: "amended", via, now: NOW } as any);

    it("records the agent's amendment against an approved plan, keeping the spec's checkpoint", () => {
      const dir = projectWithPlan();
      const plan = approve(dir, "docs/specs/plan.md", { checkpoint: "brownfield-safe-change-plan/accept", now: NOW });
      writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\n\nScope: v2.\n");
      expect(verify(dir, "docs/specs/orders.md").ok).toBe(false); // edited, not yet recorded

      const { receipt } = amend(dir);
      expect(receipt).toMatchObject({
        decision: "amended",
        decidedBy: "agent-amended",
        checkpoint: "greenfield-spec-from-idea/accept",
        via: { artifact: "docs/specs/plan.md", sha256: plan.receipt.sha256 },
        previous: { decision: "approved" },
      });
      expect(verify(dir, "docs/specs/orders.md")).toMatchObject({ ok: true, receipts: [{ status: "fresh", via: "docs/specs/plan.md" }] });
      // The amendment's own change, before → after, for reviewers.
      const d = amendmentDiff(dir, "docs/specs/orders.md")!;
      expect(d.ops!.filter((o: any) => o.op !== " ").map((o: any) => `${o.op}${o.text}`)).toEqual(["-Scope: v1.", "+Scope: v2."]);
    });

    it("refuses an amendment without a standing plan approval", () => {
      const dir = projectWithPlan();
      expect(() => approve(dir, "docs/specs/orders.md", { decision: "amended" } as any)).toThrow(/--via/);
      expect(() => amend(dir)).toThrow(/no approval receipt/);
      approve(dir, "docs/specs/plan.md", { checkpoint: "plan", decision: "changes-requested" });
      expect(() => amend(dir)).toThrow(/not approved/);
      approve(dir, "docs/specs/plan.md", { checkpoint: "plan" });
      writeFileSync(join(dir, "docs/specs/plan.md"), "# Safe Change Plan: v3\n");
      expect(() => amend(dir)).toThrow(/changed after it was approved/);
      expect(() => amend(dir, "docs/specs/orders.md")).toThrow(/amend itself/);
      // An amended spec with no prior receipt needs an explicit checkpoint.
      const fresh = projectWithSpec();
      writeFileSync(join(fresh, "docs/specs/plan.md"), "# Safe Change Plan: v2\n");
      approve(fresh, "docs/specs/plan.md", { checkpoint: "plan" });
      expect(() => amend(fresh)).toThrow(/--checkpoint/);
    });

    it("lapses when the plan changes or is re-decided, and verify says why", () => {
      const dir = projectWithPlan();
      approve(dir, "docs/specs/plan.md", { checkpoint: "plan", now: NOW });
      amend(dir);
      writeFileSync(join(dir, "docs/specs/plan.md"), "# Safe Change Plan: v2, edited\n");
      expect(verify(dir, "docs/specs/orders.md").receipts[0]).toMatchObject({
        status: "stale",
        lapsed: expect.stringMatching(/changed after it was approved/),
      });
      approve(dir, "docs/specs/plan.md", { checkpoint: "plan", now: NOW }); // re-approved: a new decision
      expect(verify(dir, "docs/specs/orders.md").receipts[0].lapsed).toMatch(/re-decided/);
      const out = runCli(["verify", "docs/specs/orders.md"], { cwd: dir });
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("amendment no longer stands");
    });
  });

  it("records delegated decisions as the agent's, and changes-requested never passes", () => {
    const dir = projectWithSpec();
    const { receipt } = approve(dir, "docs/specs/orders.md", {
      checkpoint: "scope",
      decision: "delegated",
      now: NOW,
    });
    expect(receipt.decidedBy).toBe("agent-delegated");
    expect(verify(dir, "docs/specs/orders.md").ok).toBe(true);

    const second = approve(dir, "docs/specs/orders.md", {
      checkpoint: "scope",
      decision: "changes-requested",
      now: NOW,
    });
    expect(second.replaced).toBe(true);
    expect(verify(dir).ok).toBe(true); // receipt itself is intact
    expect(verify(dir, "docs/specs/orders.md").ok).toBe(false); // but work may not proceed
  });

  it("rejects bad input and reports unapproved and invalid receipts", () => {
    const dir = projectWithSpec();
    expect(() => approve(dir, "docs/specs/orders.md", {} as any)).toThrow(/--checkpoint/);
    expect(() => approve(dir, "docs/specs/orders.md", { checkpoint: "Bad Id" })).toThrow();
    expect(() =>
      approve(dir, "docs/specs/orders.md", { checkpoint: "scope", decision: "maybe" }),
    ).toThrow(/--decision/);
    expect(() => approve(dir, "../outside.md", { checkpoint: "scope" })).toThrow(/inside/);
    expect(() => approve(dir, "docs/specs/nope.md", { checkpoint: "scope" })).toThrow(/exist/);

    expect(verify(dir, "docs/specs/orders.md").receipts[0].status).toBe("unapproved");

    mkdirSync(join(dir, ".groundwork/approvals"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/approvals/broken.json"), "{");
    expect(verify(dir)).toMatchObject({ ok: false, receipts: [{ status: "invalid" }] });
  });

  it("refuses to overwrite a receipt that belongs to a colliding artifact path", () => {
    const dir = projectWithSpec();
    writeFileSync(join(dir, "docs__specs__orders.md"), "collides\n");
    approve(dir, "docs/specs/orders.md", { checkpoint: "scope", now: NOW });
    expect(() => approve(dir, "docs__specs__orders.md", { checkpoint: "scope" })).toThrow(
      /already belongs/,
    );
  });

  it("CLI: approve then verify, with exit codes and notes containing '='", () => {
    const dir = projectWithSpec();
    const approved = runCli(
      ["approve", "docs/specs/orders.md", "--checkpoint=scope", "--notes=limit=100 rps"],
      { cwd: dir },
    );
    expect(approved.status).toBe(0);
    expect(approved.stdout).toContain("Recorded approved");
    const receipt = JSON.parse(
      readFileSync(join(dir, ".groundwork/approvals/docs__specs__orders.md.json"), "utf8"),
    );
    expect(receipt.notes).toBe("limit=100 rps");

    expect(runCli(["verify"], { cwd: dir }).status).toBe(0);
    writeFileSync(join(dir, "docs/specs/orders.md"), "# Orders\n\nchanged\n");
    const stale = runCli(["verify", "--json"], { cwd: dir });
    expect(stale.status).toBe(1);
    expect(JSON.parse(stale.stdout).receipts[0].status).toBe("stale");
    expect(runCli(["approve", "docs/specs/orders.md"], { cwd: dir }).status).toBe(2);
  });

  it("never writes or reads through symlinks, and rejects artifacts outside the project", () => {
    const outside = tempDir();
    const victim = join(outside, "victim.txt");
    writeFileSync(victim, "export SECRET=1\n");

    // A planted receipt symlink is refused, and the target is untouched.
    const dir = projectWithSpec();
    mkdirSync(join(dir, ".groundwork/approvals"), { recursive: true });
    symlinkSync(victim, join(dir, ".groundwork/approvals/docs__specs__orders.md.json"));
    expect(() => approve(dir, "docs/specs/orders.md", { checkpoint: "scope" })).toThrow(/regular file/);
    expect(readFileSync(victim, "utf8")).toBe("export SECRET=1\n");
    // verify reports it without echoing the target's contents.
    const report = verify(dir);
    expect(report).toMatchObject({ ok: false, receipts: [{ status: "invalid" }] });
    expect(JSON.stringify(report)).not.toContain("SECRET");

    // A symlinked approvals directory pointing outside is refused.
    const dir2 = projectWithSpec();
    mkdirSync(join(dir2, ".groundwork"));
    symlinkSync(outside, join(dir2, ".groundwork/approvals"));
    expect(() => approve(dir2, "docs/specs/orders.md", { checkpoint: "scope" })).toThrow(/outside/);
    expect(readdirSync(outside)).toEqual(["victim.txt"]);
    expect(verify(dir2).ok).toBe(false);

    // A symlinked artifact resolving outside the project is refused.
    const dir3 = projectWithSpec();
    symlinkSync(victim, join(dir3, "docs/specs/link.md"));
    expect(() => approve(dir3, "docs/specs/link.md", { checkpoint: "scope" })).toThrow(/inside/);

    // A receipt whose artifact path escapes the project is invalid, not hashed.
    const dir4 = projectWithSpec();
    mkdirSync(join(dir4, ".groundwork/approvals"), { recursive: true });
    writeFileSync(
      join(dir4, ".groundwork/approvals/escape.json"),
      JSON.stringify({
        artifact: "../victim.txt",
        sha256: "0".repeat(64),
        checkpoint: "scope",
        decision: "approved",
        decidedBy: "user",
        date: "2026-10-22",
      }),
    );
    expect(verify(dir4).receipts[0]).toMatchObject({ status: "invalid" });
    expect(verify(dir4).receipts[0].message).toMatch(/escapes/);
  });

  it("leaves no temp files behind after writing a receipt and snapshot", () => {
    const dir = projectWithSpec();
    approve(dir, "docs/specs/orders.md", { checkpoint: "scope", now: NOW });
    approve(dir, "docs/specs/orders.md", { checkpoint: "scope", now: NOW });
    expect(readdirSync(join(dir, ".groundwork/approvals")).sort()).toEqual([
      "docs__specs__orders.md.json",
      "docs__specs__orders.md.snapshot",
    ]);
  });

  it("doctor reports stale approvals even without a context file", () => {
    const dir = projectWithSpec();
    approve(dir, "docs/specs/orders.md", { checkpoint: "scope", now: NOW });
    writeFileSync(join(dir, "docs/specs/orders.md"), "changed\n");
    const checks = doctor(dir).findings.map((f: any) => f.check);
    expect(checks).toContain("approval-stale");
    expect(checks).toContain("context-missing");
  });
});

describe("plugin hooks manifest", () => {
  it("registers the dispatcher for every lifecycle event and the script exists", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "hooks/hooks.json"), "utf8"));
    for (const event of ["SessionStart", "PostToolUse", "Stop"]) {
      const command: string = manifest.hooks[event][0].hooks[0].command;
      expect(command).toContain("${CLAUDE_PLUGIN_ROOT}/skills/groundwork/scripts/hook.mjs");
    }
    expect(existsSync(join(ROOT, "skills/groundwork/scripts/hook.mjs"))).toBe(true);
  });
});

describe("plugin agents", () => {
  it("groundwork-builder is read-only and named after its file", () => {
    const raw = readFileSync(join(ROOT, "agents/groundwork-builder.md"), "utf8");
    const frontmatter = raw.split(/^---$/m)[1];
    expect(frontmatter).toMatch(/^name: groundwork-builder$/m);
    expect(frontmatter).toMatch(/^tools: Read$/m);
    expect(frontmatter).toMatch(/^description: .*builder check/m);
  });
});

describe("line diff", () => {
  const ops = (a: string, b: string) => lineDiff(a, b)!.map((o: any) => `${o.op}${o.text}`);

  it("finds a minimal edit script", () => {
    expect(ops("a\nb\nc\n", "a\nb\nc\n")).toEqual([" a", " b", " c"]);
    expect(ops("", "x\n")).toEqual(["+x"]);
    expect(ops("x\n", "")).toEqual(["-x"]);
    expect(ops("a\nb\nc\nd\n", "a\nc\nd\ne\n")).toEqual([" a", "-b", " c", " d", "+e"]);
    expect(ops("a\r\nb\r\n", "a\nb\n")).toEqual([" a", " b"]);
  });

  it("groups hunks with context and formats unified output", () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
    const after = before.replace("line 2\n", "line two\n").replace("line 19", "line nineteen");
    const d = lineDiff(before, after)!;
    const hunks = diffHunks(d, 3);
    expect(hunks.map((h: any) => [h.aStart, h.aLen, h.bStart, h.bLen])).toEqual([
      [1, 5, 1, 5],
      [16, 5, 16, 5],
    ]);
    expect(formatUnified(d, "a", "b")).toContain("@@ -1,5 +1,5 @@\n line 1\n-line 2\n+line two\n line 3");
  });
});
