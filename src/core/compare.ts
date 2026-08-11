import { categories } from './types.js';
import type {
  AnalysisReport,
  Category,
  CompatibilityStatus,
  Issue,
  Severity,
  TokenMetrics,
} from './types.js';
import { issueIdentity } from './fingerprint.js';

export interface ReportSnapshot {
  target: string;
  score: number;
  categories: Record<Category, number>;
  summary: Record<Severity, number>;
  tokens: Pick<
    TokenMetrics,
    | 'estimatedTokens'
    | 'duplicateTokens'
    | 'redundancyRatio'
    | 'instructionDensity'
  >;
  fileCount: number;
}

export interface CompatibilityChange {
  agentId: string;
  agentName: string;
  before: CompatibilityStatus;
  after: CompatibilityStatus;
}

export interface ComparisonReport {
  schemaVersion: AnalysisReport['schemaVersion'];
  tool: AnalysisReport['tool'];
  before: ReportSnapshot;
  after: ReportSnapshot;
  delta: {
    overallScore: number;
    categories: Record<Category, number>;
    estimatedTokens: number;
    duplicateTokens: number;
    fileCount: number;
  };
  issues: {
    introduced: Issue[];
    resolved: Issue[];
    unchanged: number;
  };
  compatibility: CompatibilityChange[];
}

export function compareReports(
  before: AnalysisReport,
  after: AnalysisReport,
): ComparisonReport {
  const issueDiff = diffIssues(before.issues, after.issues);
  const categoryDelta = Object.fromEntries(
    categories.map((category) => [
      category,
      round(
        after.score.categories[category].score -
          before.score.categories[category].score,
        1,
      ),
    ]),
  ) as Record<Category, number>;

  return {
    schemaVersion: after.schemaVersion,
    tool: after.tool,
    before: snapshot(before),
    after: snapshot(after),
    delta: {
      overallScore: round(after.score.overall - before.score.overall, 1),
      categories: categoryDelta,
      estimatedTokens: after.tokens.estimatedTokens - before.tokens.estimatedTokens,
      duplicateTokens: after.tokens.duplicateTokens - before.tokens.duplicateTokens,
      fileCount: after.files.length - before.files.length,
    },
    issues: issueDiff,
    compatibility: diffCompatibility(before, after),
  };
}

function snapshot(report: AnalysisReport): ReportSnapshot {
  return {
    target: report.target,
    score: report.score.overall,
    categories: Object.fromEntries(
      categories.map((category) => [category, report.score.categories[category].score]),
    ) as Record<Category, number>,
    summary: { ...report.summary },
    tokens: {
      estimatedTokens: report.tokens.estimatedTokens,
      duplicateTokens: report.tokens.duplicateTokens,
      redundancyRatio: report.tokens.redundancyRatio,
      instructionDensity: report.tokens.instructionDensity,
    },
    fileCount: report.files.length,
  };
}

function diffIssues(
  beforeIssues: readonly Issue[],
  afterIssues: readonly Issue[],
): ComparisonReport['issues'] {
  const beforeBuckets = bucketIssues(beforeIssues);
  const afterBuckets = bucketIssues(afterIssues);
  const introduced: Issue[] = [];
  const resolved: Issue[] = [];
  let unchanged = 0;
  const keys = new Set([...beforeBuckets.keys(), ...afterBuckets.keys()]);

  for (const key of keys) {
    const before = beforeBuckets.get(key) ?? [];
    const after = afterBuckets.get(key) ?? [];
    const shared = Math.min(before.length, after.length);
    unchanged += shared;
    if (after.length > shared) introduced.push(...after.slice(shared));
    if (before.length > shared) resolved.push(...before.slice(shared));
  }

  return {
    introduced: sortIssues(introduced),
    resolved: sortIssues(resolved),
    unchanged,
  };
}

function bucketIssues(issues: readonly Issue[]): Map<string, Issue[]> {
  const buckets = new Map<string, Issue[]>();
  for (const issue of issues) {
    const key = issueIdentity(issue);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(issue);
    else buckets.set(key, [issue]);
  }
  return buckets;
}

function sortIssues(issues: readonly Issue[]): Issue[] {
  return [...issues].sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      (left.line ?? 0) - (right.line ?? 0) ||
      left.ruleId.localeCompare(right.ruleId),
  );
}

function diffCompatibility(
  before: AnalysisReport,
  after: AnalysisReport,
): CompatibilityChange[] {
  const ids = new Set([
    ...Object.keys(before.compatibility),
    ...Object.keys(after.compatibility),
  ]);
  const changes: CompatibilityChange[] = [];

  for (const agentId of ids) {
    const previous = before.compatibility[agentId];
    const next = after.compatibility[agentId];
    const previousStatus = previous?.status ?? 'UNKNOWN';
    const nextStatus = next?.status ?? 'UNKNOWN';
    if (previousStatus === nextStatus) continue;
    changes.push({
      agentId,
      agentName: next?.agentName ?? previous?.agentName ?? agentId,
      before: previousStatus,
      after: nextStatus,
    });
  }

  return changes.sort((left, right) => left.agentName.localeCompare(right.agentName));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
