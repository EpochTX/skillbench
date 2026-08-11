import { Chalk, type ChalkInstance } from 'chalk';

import type {
  AnalysisReport,
  Category,
  CompatibilityStatus,
  Issue,
  Severity,
} from '../core/types.js';
import type { Reporter } from './types.js';

const categoryLabels: Record<Category, string> = {
  instruction: 'Instruction',
  safety: 'Safety',
  efficiency: 'Efficiency',
  portability: 'Portability',
  maintainability: 'Maintainability',
};

export class TerminalReporter implements Reporter {
  readonly id = 'terminal';
  private readonly color: ChalkInstance;

  constructor(color = true) {
    this.color = new Chalk({ level: color ? 1 : 0 });
  }

  render(report: AnalysisReport): string {
    const c = this.color;
    const lines = [
      c.bold(`SkillBench ${report.tool.version}`),
      c.dim(
        `${report.files.length} file${report.files.length === 1 ? '' : 's'} scanned`,
      ),
      '',
      c.bold('Overall Score'),
      scoreColor(c, report.score.overall)(`${report.score.overall.toFixed(1)} / 100`),
    ];
    if (report.score.cap) {
      lines.push(
        c.red(
          `Score capped at ${report.score.cap.maximum.toFixed(1)}: ${report.score.cap.reason}`,
        ),
      );
    }
    lines.push('');

    for (const [category, result] of Object.entries(report.score.categories) as [
      Category,
      AnalysisReport['score']['categories'][Category],
    ][]) {
      lines.push(
        `${categoryLabels[category].padEnd(16)} ${bar(result.score)} ${result.score
          .toFixed(1)
          .padStart(5)}`,
      );
    }

    lines.push('', c.bold('Compatibility'));
    for (const entry of Object.values(report.compatibility)) {
      lines.push(
        `${entry.agentName.padEnd(20)} ${compatibilityLabel(c, entry.status)}`,
      );
    }

    lines.push(
      '',
      c.bold('Issues'),
      `${severityCount(c, 'critical', report.summary.critical)}  ${severityCount(
        c,
        'error',
        report.summary.error,
      )}  ${severityCount(c, 'warning', report.summary.warning)}  ${severityCount(
        c,
        'info',
        report.summary.info,
      )}`,
    );
    if (report.issues.length > 0) {
      lines.push(
        '',
        ...report.issues.slice(0, 8).flatMap((entry) => renderIssue(c, entry)),
      );
      if (report.issues.length > 8) {
        lines.push(
          c.dim(
            `… ${report.issues.length - 8} more issues; run skillbench lint for all findings.`,
          ),
        );
      }
    }
    return lines.join('\n');
  }
}

export function renderScore(report: AnalysisReport, color = true): string {
  const c = new Chalk({ level: color ? 1 : 0 });
  const lines = [
    c.bold(`SkillBench ${report.tool.version}`),
    '',
    `Overall Score: ${scoreColor(c, report.score.overall)(report.score.overall.toFixed(1))}`,
  ];
  if (report.score.cap) {
    lines.push(
      c.red(
        `Score capped at ${report.score.cap.maximum.toFixed(1)}: ${report.score.cap.reason}`,
      ),
    );
  }
  lines.push('');
  for (const [category, result] of Object.entries(report.score.categories) as [
    Category,
    AnalysisReport['score']['categories'][Category],
  ][]) {
    lines.push(`${categoryLabels[category].padEnd(16)} ${result.score.toFixed(1)}`);
  }
  return lines.join('\n');
}

export function renderLint(report: AnalysisReport, color = true): string {
  const c = new Chalk({ level: color ? 1 : 0 });
  if (report.issues.length === 0) return c.green('No issues found.');
  return report.issues.flatMap((entry) => renderIssue(c, entry)).join('\n');
}

export function renderCompatibility(report: AnalysisReport, color = true): string {
  const c = new Chalk({ level: color ? 1 : 0 });
  const lines = [c.bold('Compatibility Report'), ''];
  for (const entry of Object.values(report.compatibility)) {
    lines.push(`${entry.agentName.padEnd(20)} ${compatibilityLabel(c, entry.status)}`);
    for (const reason of entry.reasons) lines.push(c.dim(`  - ${reason.message}`));
  }
  return lines.join('\n');
}

export function renderTokens(report: AnalysisReport, color = true): string {
  const c = new Chalk({ level: color ? 1 : 0 });
  const tokens = report.tokens;
  return [
    c.bold('Token Efficiency'),
    '',
    `Characters            ${tokens.characters.toLocaleString().padStart(10)}`,
    `Words                 ${tokens.words.toLocaleString().padStart(10)}`,
    `Estimated Tokens      ${tokens.estimatedTokens.toLocaleString().padStart(10)}`,
    `Duplicate Tokens      ${tokens.duplicateTokens.toLocaleString().padStart(10)}`,
    `Potential Reduction   ${(tokens.redundancyRatio * 100).toFixed(1).padStart(9)}%`,
    `Instruction Density   ${(tokens.instructionDensity * 100).toFixed(1).padStart(9)}%`,
  ].join('\n');
}

export function renderFixSuggestions(report: AnalysisReport, color = true): string {
  const c = new Chalk({ level: color ? 1 : 0 });
  const suggestions = report.issues.filter(
    (entry): entry is Issue & { suggestion: string } => Boolean(entry.suggestion),
  );
  if (suggestions.length === 0) return c.green('No fix suggestions.');
  const lines = [c.bold('Suggested fixes (dry run)'), ''];
  const seen = new Set<string>();
  for (const entry of suggestions) {
    const key = `${entry.ruleId}:${entry.path}:${entry.line ?? 0}:${entry.suggestion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(
      `${severityLabel(c, entry.severity)} ${c.bold(entry.ruleId)} ${entry.path}${
        entry.line ? `:${entry.line}` : ''
      }`,
      `  ${entry.suggestion}`,
      '',
    );
  }
  lines.push(
    c.dim('No files were changed. SkillBench v0.2 only provides suggestions.'),
  );
  return lines.join('\n').trimEnd();
}

export function renderSecurity(report: AnalysisReport, color = true): string {
  const c = new Chalk({ level: color ? 1 : 0 });
  const issues = report.issues.filter((entry) => entry.category === 'safety');
  if (issues.length === 0) return c.green('No security issues found.');
  return [
    c.bold('Security Report'),
    '',
    ...issues.flatMap((entry) => renderIssue(c, entry)),
  ].join('\n');
}

function renderIssue(c: ChalkInstance, entry: Issue): string[] {
  const location = `${entry.path}${entry.line ? `:${entry.line}` : ''}`;
  const lines = [
    `${severityLabel(c, entry.severity)} ${c.bold(entry.ruleId)} ${entry.message}`,
    c.dim(`  ${location}`),
  ];
  if (entry.evidence) lines.push(c.dim(`  ${entry.evidence}`));
  if (entry.suggestion) lines.push(`  ${entry.suggestion}`);
  lines.push('');
  return lines;
}

function bar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}

function compatibilityLabel(c: ChalkInstance, status: CompatibilityStatus): string {
  if (status === 'SUPPORTED') return c.green('PASS');
  if (status === 'UNSUPPORTED') return c.red('FAIL');
  if (status === 'PARTIAL') return c.yellow('WARN');
  return c.gray('UNKNOWN');
}

function severityLabel(c: ChalkInstance, severity: Severity): string {
  if (severity === 'critical') return c.bgRed.white.bold(' CRITICAL ');
  if (severity === 'error') return c.red.bold('ERROR');
  if (severity === 'warning') return c.yellow.bold('WARNING');
  return c.blue('INFO');
}

function severityCount(c: ChalkInstance, severity: Severity, count: number): string {
  const label = `${count} ${severity}`;
  if (severity === 'critical' && count > 0) return c.red.bold(label);
  if (severity === 'error' && count > 0) return c.red(label);
  if (severity === 'warning' && count > 0) return c.yellow(label);
  return c.dim(label);
}

function scoreColor(c: ChalkInstance, score: number): (value: string) => string {
  if (score >= 90) return c.green.bold;
  if (score >= 75) return c.yellow.bold;
  return c.red.bold;
}
