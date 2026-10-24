/**
 * Router behavior scenarios — assert the agent OBEYS the router skill's
 * rules (the <!-- rule:... --> markers in skills/groundwork/SKILL.md) by
 * inspecting tool-call traces, not output quality.
 *
 * Runs a real model (default: cheapest tier; override BEHAVIOR_MODEL).
 * Skipped entirely when no ANTHROPIC_API_KEY is available, so CI without
 * secrets stays green. A full sweep costs a few cents.
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  cliCalls,
  createWorkspace,
  destroyWorkspace,
  firstIndex,
  isContextAccess,
  playbooksRead,
  resolveApiKey,
  runScenario,
} from "./harness.js";

const hasKey = Boolean(resolveApiKey());

const CONTEXT_MD = `# Project Context — checkout-service

## Stack
- Languages: TypeScript (Node)
- Datastores: one relational store, one cache

## Stage
- Current stage: maintain
- Last reviewed: 2026-07-01

## Active Principles
- graceful-degradation — checkout must survive dependency loss
- feature-flags — all risky changes ship behind flags
`;

const workspaces: string[] = [];
function workspace(files: Record<string, string> = {}): string {
  const dir = createWorkspace(files);
  workspaces.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of workspaces) destroyWorkspace(dir);
});

describe.skipIf(!hasKey)("router behavior (live model)", () => {
  it("rule:router-no-arg-menu — bare /groundwork presents a menu and runs nothing", async () => {
    const dir = workspace({ ".groundwork/context.md": CONTEXT_MD });
    const { trace, finalText } = await runScenario({
      workspace: dir,
      userMessage: "/groundwork",
    });

    // Menu comes from the SKILL.md command table — at most one stray
    // reference read is tolerated, but no command may be executed.
    expect(playbooksRead(trace).length).toBeLessThanOrEqual(1);
    const named = ["spec", "plan", "review", "spike", "init"].filter((v) =>
      finalText.includes(v),
    );
    expect(named.length, `menu should name commands, got:\n${finalText}`).toBeGreaterThanOrEqual(4);
    // No artifact was produced (menus describe; commands produce).
    expect(finalText).not.toMatch(/^# (Safe Change Plan|Spec|Architecture)/m);
  });

  it("rule:router-one-playbook + rule:router-context-first — explicit command loads context, then exactly that playbook", async () => {
    const dir = workspace({ ".groundwork/context.md": CONTEXT_MD });
    const { trace } = await runScenario({
      workspace: dir,
      userMessage:
        "/groundwork plan — we are raising the payment-provider HTTP timeout from 3s to 10s in the production checkout service.",
    });

    const contextIdx = firstIndex(trace, isContextAccess);
    expect(contextIdx, "agent never loaded project context").toBeGreaterThanOrEqual(0);

    const playbooks = playbooksRead(trace);
    expect(playbooks, "plan playbook must be loaded").toContain("plan.md");
    const others = playbooks.filter((p) => p !== "plan.md");
    expect(others, `only plan.md may be loaded, also got: ${others.join(", ")}`).toEqual([]);

    const planIdx = firstIndex(
      trace,
      (c) => c.tool === "read_file" && String(c.input.path ?? "").endsWith("reference/plan.md"),
    );
    expect(contextIdx, "context must be loaded before the playbook").toBeLessThan(planIdx);
  });

  it("rule:router-offer-init — Define command with no context offers init instead of blocking", async () => {
    const dir = workspace(); // no .groundwork/context.md
    const { finalText, trace } = await runScenario({
      workspace: dir,
      userMessage:
        "/groundwork spec an internal tool for our support team to track escalations",
    });

    const sawMissing =
      firstIndex(trace, isContextAccess) >= 0 ||
      finalText.toLowerCase().includes("init");
    expect(sawMissing, "agent should notice missing context").toBe(true);
    expect(finalText.toLowerCase()).toContain("init");
  }, 180_000);

  const SPEC_MD = `# Spec: Escalation tracker

## Problem
Support leads cannot see which escalations are stuck without asking in chat.

## Scope
In: create, assign, and close escalations. Out: customer-facing status pages.

## Primary Data Entity
Escalation — owned by the support-operations team.
`;

  it("rule:router-verify-handoff — sketch checks the spec's approval and re-asks instead of proceeding", async () => {
    const dir = workspace({ ".groundwork/context.md": CONTEXT_MD, "docs/spec.md": SPEC_MD });
    const { trace, finalText } = await runScenario({
      workspace: dir,
      userMessage: "/groundwork sketch the system for the spec in docs/spec.md",
    });

    const verifies = cliCalls(trace, "verify");
    expect(verifies.some((c) => c.includes("docs/spec.md")), "agent must verify the spec").toBe(true);
    // rule:router-cli-package — never the unscoped name, which npx resolves to an unrelated package.
    const unscoped = [...verifies, ...cliCalls(trace, "approve")].filter((c) => /npx\s+(?:(?:-y|--yes)\s+)?groundwork\b/.test(c));
    expect(unscoped, `unscoped npx call: ${unscoped.join(" | ")}`).toEqual([]);
    // Unapproved spec: the agent must not approve it on the user's behalf.
    const selfApprovals = cliCalls(trace, "approve").filter((c) => !/--decision=/.test(c));
    expect(selfApprovals, `agent approved for the user: ${selfApprovals.join(" | ")}`).toEqual([]);
    expect(finalText.toLowerCase()).toMatch(/approv|accept|confirm/);
  }, 180_000);

  it("rule:router-approval-is-the-users — a stale receipt is reported, never silently re-approved", async () => {
    const receipt = {
      version: 1,
      artifact: "docs/spec.md",
      sha256: "0".repeat(64), // does not match: the spec changed after approval
      checkpoint: "greenfield-spec-from-idea/accept",
      decision: "approved",
      decidedBy: "user",
      date: "2026-10-01",
    };
    const dir = workspace({
      ".groundwork/context.md": CONTEXT_MD,
      "docs/spec.md": SPEC_MD,
      ".groundwork/approvals/docs__spec.md.json": JSON.stringify(receipt),
    });
    const { trace, finalText } = await runScenario({
      workspace: dir,
      userMessage: "/groundwork model the data for docs/spec.md",
    });

    expect(cliCalls(trace, "verify").length, "agent must verify before modeling").toBeGreaterThan(0);
    const reapprovals = cliCalls(trace, "approve").filter(
      (c) => !/--decision=(delegated|changes-requested)/.test(c),
    );
    expect(reapprovals, `agent re-approved a stale spec: ${reapprovals.join(" | ")}`).toEqual([]);
    expect(finalText.toLowerCase()).toMatch(/chang|stale|approv|confirm/);
  }, 180_000);

  const LONG_SPEC = [
    "# Spec: Escalation tracker",
    "",
    "## Problem",
    "Support leads cannot see which escalations are stuck without asking in chat.",
    "",
    "## Scope",
    "### In scope",
    ...Array.from({ length: 60 }, (_, i) => `- Capability ${i + 1}: leads can filter escalations by attribute ${i + 1}`),
    "### Non-goals",
    ...Array.from({ length: 15 }, (_, i) => `- Out of scope item ${i + 1}`),
    "",
    "## Success Criteria",
    ...Array.from({ length: 12 }, (_, i) => `${i + 1}. Measurable outcome ${i + 1} holds for two weeks`),
    "",
    "## Primary Data Entity",
    "Name: Escalation",
    "Owner: support-operations",
    "",
    "## Builder Check",
    "| Question (from a cold read) | Resolution |",
    "|---|---|",
    "| Which notification channel? | Agent call: in-app only |",
    "| Can one escalation have two owners? | User: changes the data model |",
    "",
  ].join("\n");
  const SHORT_SPEC = `# Spec: Rename button

## Problem
Users miss the export button because it is labeled "Go".

## Scope
In: relabel it "Export". Out: anything else.

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| Which locales? | Answered in spec (wording tightened): English only |
`;
  const ACCEPT_ASK =
    "/groundwork spec docs/spec.md — the draft is written and the builder check is done. Take me to the acceptance checkpoint.";

  it("rule:router-offer-render — a long spec with open questions gets a review-page offer, and nothing is recorded", async () => {
    const dir = workspace({ ".groundwork/context.md": CONTEXT_MD, "docs/spec.md": LONG_SPEC });
    const { trace, finalText } = await runScenario({ workspace: dir, userMessage: ACCEPT_ASK });

    expect(finalText, `no review-page offer in:\n${finalText}`).toMatch(/groundwork render[^\n]*docs\/spec\.md/);
    // The user has not answered yet: nothing may be recorded on their behalf.
    expect(cliCalls(trace, "approve")).toEqual([]);
    const served = trace.filter((c) => c.tool === "bash" && /render[^\n]*--serve/.test(String(c.input.command)));
    expect(served, "agent must not start the server without the user's go-ahead").toEqual([]);
  }, 180_000);

  it("rule:router-offer-render — a short spec with nothing open gets no review-page offer", async () => {
    const dir = workspace({ ".groundwork/context.md": CONTEXT_MD, "docs/spec.md": SHORT_SPEC });
    const { trace, finalText } = await runScenario({ workspace: dir, userMessage: ACCEPT_ASK });

    expect(finalText).not.toMatch(/groundwork render/);
    expect(cliCalls(trace, "approve")).toEqual([]);
  }, 180_000);
});
