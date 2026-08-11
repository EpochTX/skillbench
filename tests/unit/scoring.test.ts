import { describe, expect, it } from 'vitest';

import { defaultScoreWeights } from '../../src/config/schema.js';
import { calculateScore } from '../../src/core/scoring.js';
import type { Issue, Rule } from '../../src/core/types.js';

const rule: Rule = {
  id: 'TEST001',
  name: 'Test rule',
  description: 'A deterministic test rule.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 1,
  check: () => [],
};

const warning: Issue = {
  ruleId: rule.id,
  ruleName: rule.name,
  category: rule.category,
  severity: 'warning',
  message: 'First warning',
  description: rule.description,
  path: 'SKILL.md',
};

describe('calculateScore', () => {
  it('applies small, explainable deductions for warnings', () => {
    const score = calculateScore([warning], [rule], [], defaultScoreWeights);
    expect(score.categories.instruction.score).toBe(97);
    expect(score.categories.instruction.deductions[0]).toMatchObject({
      ruleId: 'TEST001',
      points: 3,
    });
    expect(score.overall).toBe(99.1);
  });

  it('uses diminishing deductions for repeated findings from one rule', () => {
    const score = calculateScore(
      [warning, { ...warning, message: 'Second warning', line: 2 }],
      [rule],
      [],
      defaultScoreWeights,
    );
    expect(score.categories.instruction.score).toBe(95.5);
  });

  it('does not penalize unknown compatibility as proven incompatibility', () => {
    const score = calculateScore(
      [],
      [],
      [
        {
          agentId: 'future',
          agentName: 'Future Agent',
          status: 'UNKNOWN',
          confidence: 'low',
          reasons: [],
        },
      ],
      defaultScoreWeights,
    );
    expect(score.categories.portability.score).toBe(100);
  });

  it('caps an otherwise high overall score when critical issues exist', () => {
    const criticalRule = {
      ...rule,
      id: 'TEST999',
      category: 'safety',
    } satisfies Rule;
    const critical = {
      ...warning,
      ruleId: criticalRule.id,
      ruleName: criticalRule.name,
      category: 'safety',
      severity: 'critical',
    } satisfies Issue;
    const score = calculateScore([critical], [criticalRule], [], defaultScoreWeights);
    expect(score.overall).toBe(59.9);
    expect(score.cap).toMatchObject({ maximum: 59.9 });
  });
});
