import { Chalk } from 'chalk';

import type { RuleBenchmarkReport } from '../core/benchmark.js';

export function renderRuleBenchmark(
  report: RuleBenchmarkReport,
  options: { format: 'terminal' | 'json'; color?: boolean },
): string {
  if (options.format === 'json') return JSON.stringify(report, null, 2);

  const c = new Chalk({ level: options.color === false ? 0 : 1 });
  const totals = report.totals;
  const lines = [
    c.bold('SkillBench Rule Benchmark'),
    '',
    `${statusLabel(c, report.passed)}  ${totals.cases} cases · ${totals.coveredRules}/${totals.totalRules} rules covered`,
    `Precision  ${(totals.precision * 100).toFixed(1)}%  (min ${(report.thresholds.minPrecision * 100).toFixed(1)}%)`,
    `Recall     ${(totals.recall * 100).toFixed(1)}%  (min ${(report.thresholds.minRecall * 100).toFixed(1)}%)`,
    `Coverage   ${(totals.ruleCoverage * 100).toFixed(1)}%  (min ${(report.thresholds.minRuleCoverage * 100).toFixed(1)}%)`,
    `TP ${totals.truePositives} · FP ${totals.falsePositives} · FN ${totals.falseNegatives}`,
  ];

  const failures = report.cases.filter(
    (entry) => entry.falsePositives.length > 0 || entry.falseNegatives.length > 0,
  );
  if (failures.length > 0) {
    lines.push('', c.bold('Mismatches'));
    for (const entry of failures) {
      lines.push(`- ${entry.id}`);
      if (entry.falsePositives.length > 0) {
        lines.push(c.red(`  FP: ${entry.falsePositives.join(', ')}`));
      }
      if (entry.falseNegatives.length > 0) {
        lines.push(c.red(`  FN: ${entry.falseNegatives.join(', ')}`));
      }
    }
  }

  return lines.join('\n');
}

function statusLabel(c: Chalk, passed: boolean): string {
  return passed ? c.green.bold('PASS') : c.red.bold('FAIL');
}
