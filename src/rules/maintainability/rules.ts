import type { Rule } from '../../core/types.js';
import { estimateTokens } from '../../core/token-analyzer.js';
import { issue } from '../types.js';

export const weakStructureRule: Rule = {
  id: 'SB300',
  name: 'Long instruction lacks structure',
  description:
    'Checks whether a sizeable instruction is divided into navigable, scoped sections.',
  category: 'maintainability',
  defaultSeverity: 'warning',
  weight: 0.7,
  check(context) {
    const lines = context.document.body.split('\n').length;
    if (lines < 80 || context.document.sections.length >= 3) return [];
    return [
      issue(this, context, {
        message: `${lines} lines are organized under fewer than three headings.`,
        suggestion:
          'Separate purpose, workflow, constraints, and output requirements into named sections.',
      }),
    ];
  },
};

export const oversizedSectionRule: Rule = {
  id: 'SB301',
  name: 'Oversized section',
  description:
    'Finds individual sections that are difficult to review, reuse, or update independently.',
  category: 'maintainability',
  defaultSeverity: 'warning',
  weight: 0.6,
  check(context) {
    return context.document.sections.flatMap((section) => {
      const tokens = estimateTokens(section.content);
      const lines = section.endLine - section.startLine + 1;
      if (tokens < 1500 && lines < 200) return [];
      return [
        issue(this, context, {
          message: `Section “${section.title}” is unusually large (${tokens.toLocaleString()} estimated tokens).`,
          line: section.startLine,
          endLine: section.endLine,
          suggestion:
            'Split the section by responsibility or move reference material to a linked file.',
        }),
      ];
    });
  },
};

export const oversizedParagraphRule: Rule = {
  id: 'SB302',
  name: 'Oversized paragraph',
  description:
    'Detects dense instruction blocks that are difficult to review and apply selectively.',
  category: 'maintainability',
  defaultSeverity: 'warning',
  weight: 0.5,
  check(context) {
    return context.document.paragraphs.flatMap((paragraph) => {
      const tokens = estimateTokens(paragraph.text);
      if (tokens < 700) return [];
      return [
        issue(this, context, {
          message: `A single paragraph contains about ${tokens.toLocaleString()} tokens.`,
          line: paragraph.startLine,
          endLine: paragraph.endLine,
          suggestion:
            'Break the block into short directives, conditions, and examples with clear labels.',
        }),
      ];
    });
  },
};

export const maintainabilityRules = [
  weakStructureRule,
  oversizedSectionRule,
  oversizedParagraphRule,
] satisfies Rule[];
