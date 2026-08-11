import type {
  Category,
  CategoryScore,
  CompatibilityResult,
  Issue,
  Rule,
  ScoreDeduction,
  ScoreResult,
  Severity,
} from './types.js';
import { categories } from './types.js';

const severityPoints: Record<Severity, number> = {
  info: 0,
  warning: 3,
  error: 8,
  critical: 18,
};

const compatibilityPoints = {
  SUPPORTED: 0,
  PARTIAL: 6,
  UNSUPPORTED: 16,
  UNKNOWN: 0,
} as const;

export const scoringPolicy = {
  severityPoints,
  compatibilityPoints,
  criticalCaps: [
    { minimumCount: 3, maximum: 39.9 },
    { minimumCount: 1, maximum: 59.9 },
  ],
} as const;

export function calculateScore(
  issues: readonly Issue[],
  rules: readonly Rule[],
  compatibility: readonly CompatibilityResult[],
  weights: Record<Category, number>,
): ScoreResult {
  const ruleWeights = new Map(rules.map((rule) => [rule.id, rule.weight]));
  const occurrence = new Map<string, number>();
  const deductions = new Map<Category, ScoreDeduction[]>(
    categories.map((category) => [category, []]),
  );

  for (const issue of issues) {
    const key = `${issue.category}:${issue.ruleId}`;
    const count = occurrence.get(key) ?? 0;
    occurrence.set(key, count + 1);
    const decay = count === 0 ? 1 : count === 1 ? 0.5 : 0.25;
    const points = round(
      severityPoints[issue.severity] * (ruleWeights.get(issue.ruleId) ?? 1) * decay,
      1,
    );
    if (points === 0) continue;
    deductions.get(issue.category)?.push({
      ruleId: issue.ruleId,
      severity: issue.severity,
      points,
      reason: issue.message,
    });
  }

  for (const result of compatibility) {
    const points = compatibilityPoints[result.status];
    if (points === 0) continue;
    deductions.get('portability')?.push({
      ruleId: `COMPAT-${result.agentId.toUpperCase()}`,
      severity: result.status === 'UNSUPPORTED' ? 'error' : 'warning',
      points,
      reason: `${result.agentName}: ${result.status.toLowerCase()}`,
    });
  }

  const categoryScores = Object.fromEntries(
    categories.map((category) => {
      const categoryDeductions = deductions.get(category) ?? [];
      const total = categoryDeductions.reduce((sum, item) => sum + item.points, 0);
      const categoryScore: CategoryScore = {
        score: round(Math.max(0, 100 - total), 1),
        weight: weights[category],
        deductions: categoryDeductions,
      };
      return [category, categoryScore];
    }),
  ) as Record<Category, CategoryScore>;

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weightedOverall = categories.reduce(
    (sum, category) =>
      sum + categoryScores[category].score * (weights[category] / totalWeight),
    0,
  );

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const capPolicy = scoringPolicy.criticalCaps.find(
    (entry) => criticalCount >= entry.minimumCount,
  );
  const cap =
    capPolicy && weightedOverall > capPolicy.maximum
      ? {
          maximum: capPolicy.maximum,
          reason: `${criticalCount} critical issue${criticalCount === 1 ? '' : 's'} require an overall score gate.`,
        }
      : undefined;

  return {
    overall: round(cap ? Math.min(weightedOverall, cap.maximum) : weightedOverall, 1),
    categories: categoryScores,
    ...(cap ? { cap } : {}),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
