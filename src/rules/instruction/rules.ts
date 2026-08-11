import type { Rule } from '../../core/types.js';
import { findDuplicateParagraphs } from '../../core/token-analyzer.js';
import { countMatches, lexicalUnits, normalizeText } from '../../utils/text.js';
import { issue } from '../types.js';

export const shortInstructionRule: Rule = {
  id: 'SB001',
  name: 'Instruction is too short',
  description:
    'Detects instruction files that are unlikely to define a usable task, boundary, and expected behavior.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 1,
  check(context) {
    const units = lexicalUnits(context.document.body).length;
    const nonEmptyLines = context.document.body
      .split('\n')
      .filter((line) => line.trim()).length;
    if (context.tokens.estimatedTokens >= 45 && units >= 30 && nonEmptyLines >= 4) {
      return [];
    }
    return [
      issue(this, context, {
        message: 'Instruction content is too short to define reliable behavior.',
        severity: context.tokens.estimatedTokens < 15 ? 'error' : 'warning',
        suggestion:
          'Add the task purpose, triggering conditions, expected output, and explicit boundaries.',
      }),
    ];
  },
};

export const longInstructionRule: Rule = {
  id: 'SB002',
  name: 'Instruction is unusually long',
  description:
    'Flags large always-loaded instructions that may increase context cost or reduce adherence.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 0.8,
  check(context) {
    const lineCount = context.document.body.split('\n').length;
    if (context.tokens.estimatedTokens <= 5000 && lineCount <= 500) return [];
    return [
      issue(this, context, {
        message: `Large instruction (${context.tokens.estimatedTokens.toLocaleString()} estimated tokens, ${lineCount.toLocaleString()} lines).`,
        severity:
          context.tokens.estimatedTokens > 9000 || lineCount > 900
            ? 'error'
            : 'warning',
        suggestion:
          'Keep core instructions focused and move detailed reference material into on-demand files.',
      }),
    ];
  },
};

export const duplicateParagraphRule: Rule = {
  id: 'SB003',
  name: 'Duplicated instruction paragraphs',
  description:
    'Finds exact and highly similar paragraphs using normalized text and n-gram Jaccard similarity.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 0.7,
  check(context) {
    return findDuplicateParagraphs(context.document.paragraphs)
      .slice(0, 10)
      .map((match) =>
        issue(this, context, {
          message: `Paragraph is ${Math.round(match.similarity * 100)}% similar to line ${match.original.startLine}.`,
          line: match.duplicate.startLine,
          endLine: match.duplicate.endLine,
          suggestion:
            'Keep one canonical instruction and remove or link to the duplicate.',
        }),
      );
  },
};

interface ConflictPattern {
  topic: string;
  positive: RegExp;
  negative: RegExp;
}

const conflictPatterns: ConflictPattern[] = [
  {
    topic: 'asking for confirmation',
    positive: /\b(?:always|must)\b.{0,50}\bask\b.{0,30}\bconfirm/iu,
    negative: /\b(?:never|do not|don't|must not)\b.{0,50}\bask\b.{0,30}\bconfirm/iu,
  },
  {
    topic: 'modifying files',
    positive: /\b(?:always|must)\b.{0,50}\b(?:modify|edit|write)\b.{0,30}\bfiles?\b/iu,
    negative:
      /\b(?:never|do not|don't|must not)\b.{0,50}\b(?:modify|edit|write)\b.{0,30}\bfiles?\b/iu,
  },
  {
    topic: 'running tests',
    positive: /\b(?:always|must)\b.{0,50}\b(?:run|execute)\b.{0,20}\btests?\b/iu,
    negative:
      /\b(?:never|do not|don't|must not)\b.{0,50}\b(?:run|execute)\b.{0,20}\btests?\b/iu,
  },
  {
    topic: 'using network access',
    positive: /\b(?:always|must|may)\b.{0,40}\b(?:browse|network|internet)\b/iu,
    negative:
      /\b(?:never|do not|don't|must not)\b.{0,40}\b(?:browse|network|internet)\b/iu,
  },
  {
    topic: 'requesting confirmation',
    positive: /(?:始终|必须).{0,20}(?:询问|请求).{0,12}确认/u,
    negative: /(?:不要|不得|禁止|切勿).{0,20}(?:询问|请求).{0,12}确认/u,
  },
];

export const conflictingInstructionRule: Rule = {
  id: 'SB004',
  name: 'Potentially conflicting instructions',
  description:
    'Detects deterministic pairs of directives that require mutually incompatible behavior.',
  category: 'instruction',
  defaultSeverity: 'error',
  weight: 1.1,
  check(context) {
    const findings = [];
    for (const pattern of conflictPatterns) {
      const positiveLine = context.document.lines.findIndex((line) =>
        pattern.positive.test(line),
      );
      const negativeLine = context.document.lines.findIndex((line) =>
        pattern.negative.test(line),
      );
      if (positiveLine === -1 || negativeLine === -1 || positiveLine === negativeLine) {
        continue;
      }
      findings.push(
        issue(this, context, {
          message: `Conflicting directives found for ${pattern.topic}.`,
          line: Math.max(positiveLine, negativeLine) + 1,
          evidence: `Conflicts with line ${Math.min(positiveLine, negativeLine) + 1}.`,
          suggestion:
            'Choose one behavior or state a precise condition that determines which directive wins.',
        }),
      );
    }
    return findings;
  },
};

export const vagueLanguageRule: Rule = {
  id: 'SB005',
  name: 'High density of vague language',
  description:
    'Measures repeated hedging language rather than flagging an isolated, legitimate qualifier.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 0.6,
  check(context) {
    const pattern =
      /\b(?:maybe|try to|if possible|generally|probably|usually|perhaps|ideally)\b|(?:也许|尽量|如果可以|一般来说|大概|可能的话)/giu;
    const count = countMatches(context.document.body, pattern);
    const density = count / Math.max(1, lexicalUnits(context.document.body).length);
    if (count < 5 || (density < 0.018 && count < 10)) return [];
    return [
      issue(this, context, {
        message: `${count} vague qualifiers make expected behavior difficult to predict.`,
        evidence: `Qualifier density: ${(density * 100).toFixed(1)}%.`,
        suggestion:
          'Replace repeated hedges with explicit conditions, defaults, or decision criteria.',
      }),
    ];
  },
};

export const missingTaskDescriptionRule: Rule = {
  id: 'SB006',
  name: 'Missing explicit task description',
  description:
    'Checks whether the document explains what the agent should accomplish and when the guidance applies.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 0.9,
  check(context) {
    const frontmatterDescription = context.document.frontmatter?.description;
    const hasFrontmatterDescription =
      typeof frontmatterDescription === 'string' &&
      frontmatterDescription.trim().length >= 20;
    const headingText = context.document.sections
      .map((section) => section.title)
      .join(' ');
    const hasPurposeHeading =
      /\b(?:purpose|goal|task|overview|responsibilit|when to use|scope)\b|(?:目标|任务|用途|适用|职责|范围)/iu.test(
        headingText,
      );
    const opening = normalizeText(context.document.body.slice(0, 1200));
    const hasExplicitPurpose =
      /\b(?:your task is|this skill|use (?:this|it) when|responsible for|helps? (?:you|the user)|designed to)\b|(?:你的任务|本技能|用于|负责|适用于)/iu.test(
        opening,
      );
    if (hasFrontmatterDescription || hasPurposeHeading || hasExplicitPurpose) return [];
    return [
      issue(this, context, {
        message: 'No clear task purpose or triggering condition was found.',
        suggestion:
          'State what the agent should accomplish, when this instruction applies, and what output is expected.',
      }),
    ];
  },
};

export const emphasisOveruseRule: Rule = {
  id: 'SB007',
  name: 'Instruction hierarchy is over-emphasized',
  description:
    'Flags excessive MUST, ALWAYS, NEVER, IMPORTANT, and CRITICAL markers that flatten instruction priority.',
  category: 'instruction',
  defaultSeverity: 'warning',
  weight: 0.8,
  check(context) {
    const count = countMatches(
      context.document.body,
      /\b(?:MUST|ALWAYS|NEVER|IMPORTANT|CRITICAL)\b/gu,
    );
    const perHundredTokens =
      (count / Math.max(1, context.tokens.estimatedTokens)) * 100;
    if (count < 9 || (perHundredTokens < 1.5 && count < 18)) return [];
    return [
      issue(this, context, {
        message: `${count} high-priority markers weaken the instruction hierarchy.`,
        evidence: `${perHundredTokens.toFixed(1)} markers per 100 estimated tokens.`,
        suggestion:
          'Reserve strong markers for true invariants and express ordinary guidance without escalation words.',
      }),
    ];
  },
};

export const instructionRules = [
  shortInstructionRule,
  longInstructionRule,
  duplicateParagraphRule,
  conflictingInstructionRule,
  vagueLanguageRule,
  missingTaskDescriptionRule,
  emphasisOveruseRule,
] satisfies Rule[];
