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
});
