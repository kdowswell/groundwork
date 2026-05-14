export interface RubricDimension {
  dimension: string;
  description: string;
  weight: number;
}

export interface TestCase {
  id: string;
  skill: string;
  task_description: string;
  context?: string;
  follow_up?: string;
  rubric: RubricDimension[];
  negative_control?: boolean;
}

export interface JudgmentScore {
  dimension: string;
  score: number;
  reasoning: string;
}

export interface EvalResult {
  case_id: string;
  skill: string;
  output_with_skill: string;
  output_without_skill: string;
  scores_with_skill: JudgmentScore[];
  scores_without_skill: JudgmentScore[];
  weighted_score_with: number;
  weighted_score_without: number;
  delta: number;
}

export interface SkillSummary {
  skill: string;
  mean_delta: number;
  cases: number;
  regressions: number;
  improvements: number;
  neutral: number;
  per_case: EvalResult[];
}

export interface EvalReport {
  run_id: string;
  timestamp: string;
  models: { agent: string; judge: string };
  skills: SkillSummary[];
}
