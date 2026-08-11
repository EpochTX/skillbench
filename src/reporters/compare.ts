import { Chalk } from 'chalk';

import type { ComparisonReport } from '../core/compare.js';
import type { Category, Issue, Severity } from '../core/types.js';

const categoryLabels: Record<Category, string> = {
  instruction: 'Instruction',
  safety: 'Safety',
  efficiency: 'Efficiency',
  portability: 'Portability',
  maintainability: 'Maintainability',
};

export function renderComparison(
  report: ComparisonReport,
  options: { format?: 'terminal' | 'json'; color?: boolean } = {},
): string {
  if (options.format === 'json') return JSON.stringify(report, null, 2);
  const c = new Chalk({ level: options.color === false ? 0 : 1 });
  const lines = [
    c.bold('SkillBench Comparison'),
    '',
    `${report.before.score.toFixed(1)} → ${report.after.score.toFixed(1)}  (${signed(report.delta.overallScore)})`,
    '',
  ];

  for (const [category, delta] of Object.entries(report.delta.categories) as [
    Category,
    number,
  ][]) {
    lines.push(
      `${categoryLabels[category].padEnd(16)} ${report.before.categories[category]
        .toFixed(1)
        .padStart(5)} → ${report.after.categories[category]
        .toFixed(1)
        .padStart(5)}  ${signed(delta).padStart(7)}`,
    );
  }

  lines.push(
    '',
    `Estimated tokens    ${report.before.tokens.estimatedTokens.toLocaleString()} → ${report.after.tokens.estimatedTokens.toLocaleString()}  (${signed(report.delta.estimatedTokens)})`,
    `Duplicate tokens    ${report.before.tokens.duplicateTokens.toLocaleString()} → ${report.after.tokens.duplicateTokens.toLocaleString()}  (${signed(report.delta.duplicateTokens)})`,
    '',
    c.bold(
      `Issues: +${report.issues.introduced.length} introduced, -${report.issues.resolved.length} resolved, ${report.issues.unchanged} unchanged`,
    ),
  );

  if (report.issues.introduced.length > 0) {
    lines.push('', c.red.bold('Introduced'));
    for (const issue of report.issues.introduced) lines.push(renderIssue(issue));
  }
  if (report.issues.resolved.length > 0) {
    lines.push('', c.green.bold('Resolved'));
    for (const issue of report.issues.resolved) lines.push(renderIssue(issue));
  }
  if (report.compatibility.length > 0) {
    lines.push('', c.bold('Compatibility changes'));
    for (const change of report.compatibility) {
      lines.push(`  ${change.agentName}: ${change.before} → ${change.after}`);
    }
  }
  return lines.join('\n');
}

function renderIssue(issue: Issue): string {
  const location = `${issue.path}${issue.line ? `:${issue.line}` : ''}`;
  return `  ${issue.ruleId} ${severityShort(issue.severity).padEnd(4)} ${location} — ${issue.message}`;
}

function severityShort(severity: Severity): string {
  if (severity === 'critical') return 'CRIT';
  if (severity === 'warning') return 'WARN';
  if (severity === 'error') return 'ERR';
  return 'INFO';
}

function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}
