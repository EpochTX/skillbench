import { describe, expect, it } from 'vitest';

import {
  TokenEfficiencyAnalyzer,
  estimateTokens,
} from '../../src/core/token-analyzer.js';
import { parseDocument } from '../../src/parser/parser.js';

describe('TokenEfficiencyAnalyzer', () => {
  it('uses a language-aware estimate for English and CJK text', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100);
    expect(estimateTokens('这是一个中文指令')).toBeGreaterThan(4);
  });

  it('counts later similar paragraphs as duplicate tokens', () => {
    const repeated =
      'Verify the version, run every test, inspect the package contents, and record reproducible evidence for the release manager.';
    const document = parseDocument(
      '/repo/skill/SKILL.md',
      `# Release\n\n${repeated}\n\n${repeated}\n`,
      '/repo',
    );
    const metrics = new TokenEfficiencyAnalyzer().analyze(document);
    expect(metrics.duplicateTokens).toBeGreaterThan(0);
    expect(metrics.redundancyRatio).toBeGreaterThan(0.3);
  });
});
