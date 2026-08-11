import path from 'node:path';

import type { Rule } from '../../core/types.js';
import { issue } from '../types.js';

const skillNamePattern = /^(?!-)(?!.*--)[a-z0-9]+(?:-[a-z0-9]+)*(?<!-)$/u;

export const skillFrontmatterRule: Rule = {
  id: 'SB400',
  name: 'Invalid Agent Skills metadata',
  description:
    'Validates portable SKILL.md metadata against the open Agent Skills frontmatter requirements.',
  category: 'portability',
  defaultSeverity: 'error',
  weight: 0.9,
  check(context) {
    if (context.document.kind !== 'skill') return [];
    const findings = [];
    const metadata = context.document.frontmatter;
    if (!metadata) {
      return [
        issue(this, context, {
          message: 'SKILL.md is missing YAML frontmatter.',
          line: 1,
          suggestion:
            'Add required name and description fields using portable Agent Skills frontmatter.',
        }),
      ];
    }

    const name = metadata.name;
    if (typeof name !== 'string' || !name.trim()) {
      findings.push(
        issue(this, context, {
          message: 'SKILL.md frontmatter requires a non-empty name.',
          line: 1,
          suggestion:
            'Use a lowercase, hyphen-separated name of at most 64 characters.',
        }),
      );
    } else {
      if (name.length > 64 || !skillNamePattern.test(name)) {
        findings.push(
          issue(this, context, {
            message: 'Skill name does not follow the portable naming format.',
            line: 1,
            evidence: name,
            suggestion: 'Use 1–64 lowercase ASCII letters, digits, and single hyphens.',
          }),
        );
      }
      const parentName = path.basename(path.dirname(context.document.path));
      if (parentName !== name) {
        findings.push(
          issue(this, context, {
            message: `Skill name “${name}” does not match parent directory “${parentName}”.`,
            severity: 'warning',
            line: 1,
            suggestion: 'Rename the directory or metadata so the names match.',
          }),
        );
      }
    }

    const description = metadata.description;
    if (typeof description !== 'string' || !description.trim()) {
      findings.push(
        issue(this, context, {
          message: 'SKILL.md frontmatter requires a non-empty description.',
          line: 1,
          suggestion: 'Describe what the skill does and when an agent should use it.',
        }),
      );
    } else if (description.length > 1024) {
      findings.push(
        issue(this, context, {
          message: 'Skill description exceeds the 1,024-character portable limit.',
          line: 1,
          suggestion: 'Keep discovery metadata concise and move detail into the body.',
        }),
      );
    }
    return findings;
  },
};

const platformExtensionFields = new Set([
  'disable-model-invocation',
  'user-invocable',
  'argument-hint',
  'model',
  'context',
  'agent',
  'hooks',
]);

export const platformMetadataRule: Rule = {
  id: 'SB401',
  name: 'Platform-specific Skill metadata',
  description:
    'Identifies known vendor extensions that may not preserve their behavior across Agent Skills implementations.',
  category: 'portability',
  defaultSeverity: 'warning',
  weight: 0.5,
  check(context) {
    if (context.document.kind !== 'skill' || !context.document.frontmatter) return [];
    const fields = Object.keys(context.document.frontmatter).filter((field) =>
      platformExtensionFields.has(field),
    );
    if (fields.length === 0) return [];
    return [
      issue(this, context, {
        message: `Platform-specific frontmatter may not be portable: ${fields.join(', ')}.`,
        line: 1,
        suggestion:
          'Keep core behavior in standard fields and document optional vendor extensions explicitly.',
      }),
    ];
  },
};

export const scopedMetadataRule: Rule = {
  id: 'SB402',
  name: 'Invalid scoped-instruction metadata',
  description:
    'Checks metadata needed for Cursor MDC rules and GitHub Copilot path-specific instructions.',
  category: 'portability',
  defaultSeverity: 'error',
  weight: 0.7,
  check(context) {
    if (context.document.kind === 'cursor-rule') {
      const metadata = context.document.frontmatter;
      if (!metadata) {
        return [
          issue(this, context, {
            message: 'Cursor .mdc rule is missing frontmatter.',
            line: 1,
            suggestion:
              'Add description, globs, and alwaysApply metadata appropriate to the rule scope.',
          }),
        ];
      }
      if (
        !('description' in metadata) &&
        !('globs' in metadata) &&
        !('alwaysApply' in metadata)
      ) {
        return [
          issue(this, context, {
            message: 'Cursor .mdc frontmatter does not declare activation metadata.',
            line: 1,
            suggestion:
              'Declare description, globs, or alwaysApply so Cursor can activate the rule predictably.',
          }),
        ];
      }
    }

    if (context.document.kind === 'copilot-path') {
      const applyTo = context.document.frontmatter?.applyTo;
      if (typeof applyTo !== 'string' || !applyTo.trim()) {
        return [
          issue(this, context, {
            message: 'Copilot path-specific instruction is missing applyTo.',
            line: 1,
            suggestion: 'Add an applyTo glob in YAML frontmatter.',
          }),
        ];
      }
    }
    return [];
  },
};

export const portabilityRules = [
  skillFrontmatterRule,
  platformMetadataRule,
  scopedMetadataRule,
] satisfies Rule[];
