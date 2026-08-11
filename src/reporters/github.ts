import type { AnalysisReport, Issue, Severity } from '../core/types.js';
import type { Reporter } from './types.js';

export class GitHubReporter implements Reporter {
  readonly id = 'github';

  render(report: AnalysisReport): string {
    if (report.issues.length === 0) {
      return `SkillBench score ${report.score.overall.toFixed(1)}/100 — no issues found.`;
    }
    const lines = report.issues.map(renderAnnotation);
    lines.push(
      `SkillBench score ${report.score.overall.toFixed(1)}/100 — ${report.issues.length} issue${report.issues.length === 1 ? '' : 's'}.`,
    );
    return lines.join('\n');
  }
}

function renderAnnotation(issue: Issue): string {
  const command = annotationCommand(issue.severity);
  const properties = [
    `file=${escapeProperty(issue.path)}`,
    ...(issue.line ? [`line=${issue.line}`] : []),
    ...(issue.endLine ? [`endLine=${issue.endLine}`] : []),
    `title=${escapeProperty(`SkillBench ${issue.ruleId}`)}`,
  ];
  const message = issue.suggestion
    ? `${issue.message} Remediation: ${issue.suggestion}`
    : issue.message;
  return `::${command} ${properties.join(',')}::${escapeData(message)}`;
}

function annotationCommand(severity: Severity): 'notice' | 'warning' | 'error' {
  if (severity === 'critical' || severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'notice';
}

function escapeData(value: string): string {
  return value
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');
}
