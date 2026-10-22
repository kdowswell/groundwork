import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import type { RubricDimension, JudgmentScore } from "./types.js";
import { withRetry } from "./utils.js";

// Sampling parameters are no longer accepted, so judgments are not strictly
// deterministic; raise JUDGE_RUNS to average out variance when it matters.
const JUDGE_RUNS = parseInt(process.env.JUDGE_RUNS ?? "1", 10);

// Structured output, not a forced tool call: current models reject forced tool_choice.
const SCORES_FORMAT = jsonSchemaOutputFormat({
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dimension: { type: "string" },
          score: { type: "number" },
          reasoning: { type: "string" },
        },
        required: ["dimension", "score", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["scores"],
  additionalProperties: false,
});

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
  const allRunScores: Array<Array<{ dimension: string; score: number; reasoning: string }>> = [];
  for (let i = 0; i < JUDGE_RUNS; i++) {
    const response = await withRetry(() =>
      client.messages.parse({
        model,
        max_tokens: 4096,
        output_config: { format: SCORES_FORMAT },
        messages: [{ role: "user", content: prompt }],
      })
    );
    if (response.stop_reason === "refusal") {
      throw new Error(`Judge refused (${response.stop_details?.category ?? "no category"})`);
    }
    if (!response.parsed_output) {
      throw new Error(`Judge returned no parseable scores (stop_reason: ${response.stop_reason})`);
    }
    // The schema can't bound numbers, so clamp to the rubric's 0–1 scale.
    allRunScores.push(
      response.parsed_output.scores.map((s) => ({ ...s, score: Math.min(1, Math.max(0, s.score)) }))
    );
  }

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
