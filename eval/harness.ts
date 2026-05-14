import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { glob } from "glob";
import path from "path";
import type { TestCase, EvalResult, SkillSummary, EvalReport } from "./types.js";
import { judgeOutput, weightedScore } from "./judge.js";
import { withRetry } from "./utils.js";

const AGENT_MODEL = process.env.AGENT_MODEL ?? "claude-haiku-4-5-20251001";
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "claude-sonnet-4-6";
const SKILLS_DIR = path.resolve(process.cwd(), "skills");
const CASES_DIR = path.resolve(process.cwd(), "eval/cases");
const RESULTS_DIR = path.resolve(process.cwd(), "eval/results");
const REGRESSION_THRESHOLD = -0.05;
const IMPROVEMENT_THRESHOLD = 0.05;

function loadSkill(skillName: string): string {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!existsSync(skillPath)) throw new Error(`Skill not found: ${skillPath}`);
  return readFileSync(skillPath, "utf-8");
}

async function runAgent(
  client: Anthropic,
  taskDescription: string,
  context: string | undefined,
  skillContent: string | undefined,
  followUp?: string
): Promise<string> {
  const userContent = context
    ? `${taskDescription}\n\n---\n\n${context}`
    : taskDescription;

  // Skill content uses cache_control so the same block is reused across test cases
  // for the same skill, reducing token costs across a run.
  const systemBlocks: Anthropic.TextBlockParam[] = skillContent
    ? [
        {
          type: "text",
          text: "You are an AI coding agent. The following skill should guide how you approach this task:\n\n",
        },
        {
          type: "text",
          text: skillContent,
          cache_control: { type: "ephemeral" },
        },
      ]
    : [
        {
          type: "text",
          text: "You are an AI coding agent assisting with software development tasks.",
        },
      ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];

  if (followUp) {
    const turn1 = await withRetry(() =>
      client.messages.create({
        model: AGENT_MODEL,
        max_tokens: 2048,
        system: systemBlocks,
        messages,
      })
    );
    const turn1Text = turn1.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    messages.push({ role: "assistant", content: turn1Text });
    messages.push({ role: "user", content: followUp });
  }

  const response = await withRetry(() =>
    client.messages.create({
      model: AGENT_MODEL,
      max_tokens: 2048,
      system: systemBlocks,
      messages,
    })
  );

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function evalCase(
  client: Anthropic,
  testCase: TestCase,
  skillContent: string
): Promise<EvalResult> {
  // Run sequentially to stay within API rate limits
  process.stdout.write(`  [${testCase.id}] agent+skill...`);
  const outputWith = await runAgent(client, testCase.task_description, testCase.context, skillContent, testCase.follow_up);
  process.stdout.write(` baseline...`);
  const outputWithout = await runAgent(client, testCase.task_description, testCase.context, undefined, testCase.follow_up);
  process.stdout.write(` judging-with...`);
  const scoresWith = await judgeOutput(client, JUDGE_MODEL, testCase.task_description, outputWith, testCase.rubric);
  process.stdout.write(` judging-without...`);
  const scoresWithout = await judgeOutput(client, JUDGE_MODEL, testCase.task_description, outputWithout, testCase.rubric);

  const wWith = weightedScore(scoresWith, testCase.rubric);
  const wWithout = weightedScore(scoresWithout, testCase.rubric);
  const delta = Math.round((wWith - wWithout) * 100) / 100;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
  console.log(` done (Δ ${deltaStr})`);

  return {
    case_id: testCase.id,
    skill: testCase.skill,
    output_with_skill: outputWith,
    output_without_skill: outputWithout,
    scores_with_skill: scoresWith,
    scores_without_skill: scoresWithout,
    weighted_score_with: wWith,
    weighted_score_without: wWithout,
    delta,
  };
}

function summarizeSkill(skill: string, results: EvalResult[]): SkillSummary {
  const mean = results.reduce((sum, r) => sum + r.delta, 0) / results.length;
  return {
    skill,
    mean_delta: Math.round(mean * 100) / 100,
    cases: results.length,
    regressions: results.filter((r) => r.delta < REGRESSION_THRESHOLD).length,
    improvements: results.filter((r) => r.delta > IMPROVEMENT_THRESHOLD).length,
    neutral: results.filter(
      (r) => r.delta >= REGRESSION_THRESHOLD && r.delta <= IMPROVEMENT_THRESHOLD
    ).length,
    per_case: results,
  };
}

function formatReport(report: EvalReport): string {
  const lines = [
    `# Groundwork Skill Eval — ${report.timestamp}`,
    ``,
    `**Run ID:** \`${report.run_id}\``,
    `**Agent:** ${report.models.agent} | **Judge:** ${report.models.judge}`,
    ``,
    `## Summary`,
    ``,
    `| Skill | Mean Δ | Improved | Neutral | Regressed |`,
    `|---|---|---|---|---|`,
  ];

  for (const s of report.skills) {
    const d = s.mean_delta > 0 ? `+${s.mean_delta.toFixed(2)}` : s.mean_delta.toFixed(2);
    lines.push(
      `| ${s.skill} | **${d}** | ${s.improvements}/${s.cases} | ${s.neutral}/${s.cases} | ${s.regressions}/${s.cases} |`
    );
  }

  lines.push(``, `---`, ``, `## Per-Skill Detail`);

  for (const skill of report.skills) {
    lines.push(``, `### ${skill.skill} (mean Δ ${skill.mean_delta > 0 ? "+" : ""}${skill.mean_delta.toFixed(2)})`, ``);

    for (const r of skill.per_case) {
      const d = r.delta > 0 ? `+${r.delta.toFixed(2)}` : r.delta.toFixed(2);
      lines.push(
        `#### ${r.case_id} — Δ ${d} (with: ${r.weighted_score_with} | without: ${r.weighted_score_without})`,
        ``,
        `| Dimension | With | Without | Δ |`,
        `|---|---|---|---|`
      );
      for (const sw of r.scores_with_skill) {
        const swo = r.scores_without_skill.find((x) => x.dimension === sw.dimension);
        const dimDelta = swo ? Math.round((sw.score - swo.score) * 100) / 100 : 0;
        const dimD = dimDelta > 0 ? `+${dimDelta}` : `${dimDelta}`;
        lines.push(`| ${sw.dimension} | ${sw.score.toFixed(2)} | ${swo?.score.toFixed(2) ?? "—"} | ${dimD} |`);
      }
      lines.push(
        ``,
        `<details><summary>Reasoning</summary>`,
        ``,
        `**With skill:**`,
        ...r.scores_with_skill.map((s) => `- *${s.dimension}*: ${s.reasoning}`),
        ``,
        `**Without skill:**`,
        ...r.scores_without_skill.map((s) => `- *${s.dimension}*: ${s.reasoning}`),
        ``,
        `</details>`,
        ``
      );
    }
  }

  return lines.join("\n");
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = new Anthropic({
    apiKey,
    defaultHeaders: { "anthropic-beta": "prompt-caching-2024-07-31" },
  });

  const skillFilter = process.argv[2];
  const pattern = skillFilter
    ? path.join(CASES_DIR, `${skillFilter}.json`)
    : path.join(CASES_DIR, "*.json");

  const caseFiles = await glob(pattern);
  if (caseFiles.length === 0) {
    console.error(`No test case files found matching: ${pattern}`);
    process.exit(1);
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const skillResults: SkillSummary[] = [];

  for (const caseFile of caseFiles.sort()) {
    const cases: TestCase[] = JSON.parse(readFileSync(caseFile, "utf-8"));
    const skillName = path.basename(caseFile, ".json");

    console.log(`\nSkill: ${skillName} (${cases.length} cases)`);

    let skillContent: string;
    try {
      skillContent = loadSkill(skillName);
    } catch (e) {
      console.error(`  Skipping — skill file not found`);
      continue;
    }

    const results: EvalResult[] = [];
    for (const testCase of cases) {
      try {
        results.push(await evalCase(client, testCase, skillContent));
      } catch (e) {
        console.error(`  Error on case ${testCase.id}: ${e}`);
      }
    }

    if (results.length > 0) {
      const summary = summarizeSkill(skillName, results);
      skillResults.push(summary);
      const d = summary.mean_delta > 0 ? `+${summary.mean_delta}` : `${summary.mean_delta}`;
      console.log(
        `  Mean Δ: ${d} | Improved: ${summary.improvements} | Neutral: ${summary.neutral} | Regressed: ${summary.regressions}`
      );
    }
  }

  const report: EvalReport = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    models: { agent: AGENT_MODEL, judge: JUDGE_MODEL },
    skills: skillResults,
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  const jsonPath = path.join(RESULTS_DIR, `${runId}.json`);
  const mdPath = path.join(RESULTS_DIR, `${runId}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, formatReport(report));

  console.log(`\n${"─".repeat(60)}`);
  console.log(formatReport(report));
  console.log(`\nResults saved to eval/results/${runId}.{json,md}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
