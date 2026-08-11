import type { Rule } from '../../core/types.js';
import { estimateTokens } from '../../core/token-analyzer.js';
import { countMatches } from '../../utils/text.js';
import { issue } from '../types.js';

export const redundantTokensRule: Rule = {
  id: 'SB200',
  name: 'High duplicated-token ratio',
  description:
    'Uses paragraph similarity to estimate tokens that can likely be removed without losing instructions.',
  category: 'efficiency',
  defaultSeverity: 'warning',
  weight: 0.9,
  check(context) {
    if (context.tokens.duplicateTokens < 50 || context.tokens.redundancyRatio < 0.08) {
      return [];
    }
    return [
      issue(this, context, {
        message: `${context.tokens.duplicateTokens.toLocaleString()} estimated tokens repeat earlier paragraphs.`,
        evidence: `Potential reduction: ${(context.tokens.redundancyRatio * 100).toFixed(1)}%.`,
        severity: context.tokens.redundancyRatio >= 0.25 ? 'error' : 'warning',
        suggestion: 'Consolidate repeated guidance into one canonical section.',
      }),
    ];
  },
};

export const repeatedDirectiveRule: Rule = {
  id: 'SB201',
  name: 'Repeated directive markers',
  description:
    'Finds inefficient repetition of modal directives and safety slogans across an instruction.',
  category: 'efficiency',
  defaultSeverity: 'warning',
  weight: 0.6,
  check(context) {
    const count = countMatches(
      context.document.body,
      /\b(?:must|always|never|do not|ensure that|make sure)\b|(?:必须|始终|永远不要|确保|务必)/giu,
    );
    if (count < 16 || count / Math.max(1, context.tokens.estimatedTokens) < 0.018) {
      return [];
    }
    return [
      issue(this, context, {
        message: `${count} directive markers create repetitive instruction overhead.`,
        suggestion:
          'Group related invariants once and use scoped subsections for exceptions.',
      }),
    ];
  },
};

export const markdownNoiseRule: Rule = {
  id: 'SB202',
  name: 'Excessive Markdown noise',
  description:
    'Detects decorative separators, empty headings, and markup-heavy structure with little instructional value.',
  category: 'efficiency',
  defaultSeverity: 'warning',
  weight: 0.5,
  check(context) {
    const horizontalRules = countMatches(
      context.document.body,
      /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gmu,
    );
    const emptyHeadings = countMatches(
      context.document.body,
      /^#{1,6}\s*(?:<!--.*-->)?\s*$/gmu,
    );
    const decorativeEmoji = countMatches(
      context.document.body,
      /[✅❌⚠🚨🔥⭐💡🎯📌]/gu,
    );
    const noise = horizontalRules + emptyHeadings + Math.max(0, decorativeEmoji - 6);
    if (noise < 10) return [];
    return [
      issue(this, context, {
        message: `${noise} decorative or empty Markdown elements add context noise.`,
        suggestion:
          'Use headings only for navigation and remove repeated separators or decorative markers.',
      }),
    ];
  },
};

export const oversizedExamplesRule: Rule = {
  id: 'SB203',
  name: 'Examples dominate the instruction',
  description:
    'Flags large fenced examples that consume most of an always-loaded instruction context.',
  category: 'efficiency',
  defaultSeverity: 'warning',
  weight: 0.7,
  check(context) {
    const fencedBlocks = [
      ...context.document.body.matchAll(/^```[^\n]*\n([\s\S]*?)^```\s*$/gmu),
    ];
    const exampleTokens = fencedBlocks.reduce(
      (sum, match) => sum + estimateTokens(match[1] ?? ''),
      0,
    );
    const ratio = exampleTokens / Math.max(1, context.tokens.estimatedTokens);
    if (exampleTokens < 500 || ratio < 0.5) return [];
    return [
      issue(this, context, {
        message: `Fenced examples use about ${(ratio * 100).toFixed(1)}% of estimated tokens.`,
        suggestion:
          'Keep one representative example and move the rest into an on-demand reference file.',
      }),
    ];
  },
};

export const efficiencyRules = [
  redundantTokensRule,
  repeatedDirectiveRule,
  markdownNoiseRule,
  oversizedExamplesRule,
] satisfies Rule[];
