import type { AnalysisReport } from '../core/types.js';

export function renderBadge(report: AnalysisReport): string {
  const score = report.score.overall.toFixed(1);
  const color =
    report.score.overall >= 90
      ? 'brightgreen'
      : report.score.overall >= 75
        ? 'yellow'
        : report.score.overall >= 60
          ? 'orange'
          : 'red';
  const message = encodeURIComponent(`${score}/100`).replace(/%2F/giu, '%2F');
  return `![SkillBench Score](https://img.shields.io/badge/SkillBench-${message}-${color})`;
}
