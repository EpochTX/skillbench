import { describe, expect, it } from 'vitest';

import type { AnalysisReport } from '../../src/core/types.js';
import { GitHubReporter } from '../../src/reporters/github.js';
import { SarifReporter } from '../../src/reporters/sarif.js';

const report: AnalysisReport = {
  schemaVersion: '0.1',
  tool: { name: 'skillbench', version: '0.2.0' },
  target: '/repo/SKILL.md',
  score: {
    overall: 92,
    categories: {
      instruction: { score: 100, weight: 30, deductions: [] },
      safety: {
        score: 68,
        weight: 25,
        deductions: [
          {
            ruleId: 'SB102',
            severity: 'error',
            points: 8,
            reason: 'Credential path access.',
          },
        ],
      },
      efficiency: { score: 100, weight: 15, deductions: [] },
      portability: { score: 100, weight: 20, deductions: [] },
      maintainability: { score: 100, weight: 10, deductions: [] },
    },
  },
  summary: { info: 0, warning: 0, error: 1, critical: 0 },
  issues: [
    {
      ruleId: 'SB102',
      ruleName: 'Credential-bearing path access',
      category: 'safety',
      severity: 'error',
      message: 'The agent is instructed to access a credential-bearing path.',
      description: 'Detects directed access to credential-bearing paths.',
      path: 'SKILL.md',
      line: 12,
      endLine: 12,
      evidence: '~/.ssh/id_…',
      suggestion: 'Remove the credential access instruction.',
    },
  ],
  compatibility: {},
  tokens: {
    characters: 100,
    words: 20,
    cjkCharacters: 0,
    estimatedTokens: 25,
    duplicateTokens: 0,
    redundancyRatio: 0,
    estimatedSavings: 0,
    instructionDensity: 0.4,
  },
  files: [],
};

describe('machine reporters', () => {
  it('renders SARIF 2.1.0 with locations and fingerprints', () => {
    const rendered = JSON.parse(new SarifReporter().render(report)) as {
      version: string;
      runs: Array<{
        results: Array<{
          ruleId: string;
          partialFingerprints: Record<string, string>;
          locations: Array<{
            physicalLocation: { region: { startLine: number } };
          }>;
        }>;
      }>;
    };
    expect(rendered.version).toBe('2.1.0');
    expect(rendered.runs[0]?.results[0]?.ruleId).toBe('SB102');
    expect(
      rendered.runs[0]?.results[0]?.partialFingerprints.skillbenchIssueFingerprint,
    ).toHaveLength(32);
    expect(
      rendered.runs[0]?.results[0]?.locations[0]?.physicalLocation.region.startLine,
    ).toBe(12);
  });

  it('renders native GitHub Actions annotations', () => {
    const rendered = new GitHubReporter().render(report);
    expect(rendered).toContain('::error file=SKILL.md,line=12');
    expect(rendered).toContain('title=SkillBench SB102');
    expect(rendered).toContain('Remediation:');
  });
});
