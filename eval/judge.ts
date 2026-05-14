import Anthropic from "@anthropic-ai/sdk";
import type { RubricDimension, JudgmentScore } from "./types.js";
import { withRetry } from "./utils.js";

// 1 run is sufficient at temperature=0 (outputs are deterministic)
const JUDGE_RUNS = parseInt(process.env.JUDGE_RUNS ?? "1", 10);

interface ScoreToolInput {
  scores: Array<{ dimension: string; score: number; reasoning: string }>;
}

export async function judgeOutput(
  client: Anthropic,
  model: string,
  taskDescription: string,
  output: string,
  rubric: RubricDimension[]
): Promise<JudgmentScore[]> {
  const dimensionList = rubric
    .map((d) => `- **${d.dimension}** (weight ${d.weight.toFixed(2)}): ${d.description}`)
    .join("\n");

  const prompt = `## Task Given to Agent
${taskDescription}

## Agent Output
${output}

## Rubric Dimensions to Score
${dimensionList}

Score this agent output against each rubric dimension. Provide a score 0.0–1.0 and one sentence of reasoning citing what is present or absent.

Scoring: 1.0 = fully satisfies | 0.5 = partially satisfies | 0.0 = does not satisfy. Be strict — score what is present, not what you assume was intended.`;

  // Run sequentially to avoid overloading the API
  const runResponses: Anthropic.Message[] = [];
  for (let i = 0; i < JUDGE_RUNS; i++) {
    const response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 1024,
        temperature: 0,
        tools: [
          {
            name: "score_output",
            description: "Score the agent output against each rubric dimension",
            input_schema: {
              type: "object" as const,
              properties: {
                scores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      dimension: { type: "string" },
                      score: { type: "number", minimum: 0, maximum: 1 },
                      reasoning: { type: "string" },
                    },
                    required: ["dimension", "score", "reasoning"],
                  },
                },
              },
              required: ["scores"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "score_output" },
        messages: [{ role: "user", content: prompt }],
      })
    );
    runResponses.push(response);
  }

  const allRunScores = runResponses.map((response) => {
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Judge response missing tool_use block");
    }
    return (toolUse.input as ScoreToolInput).scores;
  });

  // Average scores across runs; use reasoning from the first run
  return rubric.map((d) => {
    const dimRuns = allRunScores.map(
      (run) =>
        run.find((s) => s.dimension === d.dimension) ?? {
          dimension: d.dimension,
          score: 0,
          reasoning: "(dimension not scored by judge)",
        }
    );
    const avgScore = dimRuns.reduce((sum, s) => sum + s.score, 0) / dimRuns.length;
    return {
      dimension: d.dimension,
      score: Math.round(avgScore * 100) / 100,
      reasoning: dimRuns[0].reasoning,
    };
  });
}

export function weightedScore(scores: JudgmentScore[], rubric: RubricDimension[]): number {
  const total = scores.reduce((sum, s) => {
    const dim = rubric.find((d) => d.dimension === s.dimension);
    return sum + s.score * (dim?.weight ?? 0);
  }, 0);
  return Math.round(total * 100) / 100;
}
