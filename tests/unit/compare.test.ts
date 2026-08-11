import { describe, expect, it } from 'vitest';

import { compareReports } from '../../src/core/compare.js';
import type { AnalysisReport, Issue } from '../../src/core/types.js';

function makeReport(
  score: number,
  issues: Issue[],
  estimatedTokens: number,
): AnalysisReport {
  return {
    schemaVersion: '0.1',
    tool: { name: 'skillbench', version: '0.2.0' },
    target: '/repo',
    score: {
      overall: score,
      categories: {
        instruction: { score, weight: 30, deductions: [] },
        safety: { score: 100, weight: 25, deductions: [] },
        efficiency: { score: 100, weight: 15, deductions: [] },
        portability: { score: 100, weight: 20, deductions: [] },
        maintainability: { score: 100, weight: 10, deductions: [] },
      },
    },
    summary: {
      info: issues.filter((issue) => issue.severity === 'info').length,
      warning: issues.filter((issue) => issue.severity === 'warning').length,
      error: issues.filter((issue) => issue.severity === 'error').length,
      critical: issues.filter((issue) => issue.severity === 'critical').length,
    },
    issues,
    compatibility: {
      codex: {
        agentId: 'codex',
        agentName: 'OpenAI Codex',
        status: 'SUPPORTED',
        confidence: 'high',
        reasons: [],
      },
    },
    tokens: {
      characters: estimatedTokens * 4,
      words: estimatedTokens,
      cjkCharacters: 0,
      estimatedTokens,
      duplicateTokens: 0,
      redundancyRatio: 0,
      estimatedSavings: 0,
      instructionDensity: 0.5,
    },
    files: [],
  };
}

const warning: Issue = {
  ruleId: 'SB001',
  ruleName: 'Instruction is too short',
  category: 'instruction',
  severity: 'warning',
  message: 'Instruction content is too short to define reliable behavior.',
  description: 'Short instruction.',
  path: 'SKILL.md',
  line: 3,
};

const error: Issue = {
  ...warning,
  ruleId: 'SB102',
  ruleName: 'Credential-bearing path access',
  category: 'safety',
  severity: 'error',
  message: 'Credential path access.',
  line: 8,
};

describe('compareReports', () => {
  it('separates introduced, resolved, and unchanged findings', () => {
    const before = makeReport(90, [warning], 100);
    const after = makeReport(82, [warning, error], 130);
    const comparison = compareReports(before, after);

    expect(comparison.delta.overallScore).toBe(-8);
    expect(comparison.delta.estimatedTokens).toBe(30);
    expect(comparison.issues.unchanged).toBe(1);
    expect(comparison.issues.introduced).toEqual([error]);
    expect(comparison.issues.resolved).toEqual([]);
  });

  it('reports resolved findings', () => {
    const before = makeReport(80, [warning, error], 130);
    const after = makeReport(95, [warning], 90);
    const comparison = compareReports(before, after);

    expect(comparison.issues.resolved).toEqual([error]);
    expect(comparison.issues.introduced).toEqual([]);
  });

  it('keeps issue identity stable when only the source line changes', () => {
    const moved = { ...warning, line: 40 };
    const comparison = compareReports(
      makeReport(90, [warning], 100),
      makeReport(90, [moved], 100),
    );

    expect(comparison.issues.unchanged).toBe(1);
    expect(comparison.issues.introduced).toEqual([]);
    expect(comparison.issues.resolved).toEqual([]);
  });

  it('normalizes Windows and POSIX separators for issue identity', () => {
    const windowsIssue = { ...warning, path: 'nested\\SKILL.md' };
    const posixIssue = { ...warning, path: 'nested/SKILL.md' };
    const comparison = compareReports(
      makeReport(90, [windowsIssue], 100),
      makeReport(90, [posixIssue], 100),
    );

    expect(comparison.issues.unchanged).toBe(1);
    expect(comparison.issues.introduced).toEqual([]);
    expect(comparison.issues.resolved).toEqual([]);
  });

  it('treats a severity escalation as resolved old severity and introduced new severity', () => {
    const escalated = { ...warning, severity: 'error' as const };
    const comparison = compareReports(
      makeReport(90, [warning], 100),
      makeReport(85, [escalated], 100),
    );

    expect(comparison.issues.unchanged).toBe(0);
    expect(comparison.issues.resolved).toEqual([warning]);
    expect(comparison.issues.introduced).toEqual([escalated]);
  });

  it('preserves duplicate multiplicity instead of collapsing findings', () => {
    const duplicate = { ...warning, line: 40 };
    const comparison = compareReports(
      makeReport(90, [warning], 100),
      makeReport(90, [warning, duplicate], 100),
    );

    expect(comparison.issues.unchanged).toBe(1);
    expect(comparison.issues.introduced).toEqual([duplicate]);
    expect(comparison.issues.resolved).toEqual([]);
  });
});
