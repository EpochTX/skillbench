import type { Issue, Rule, RuleContext, Severity } from '../core/types.js';
import { redactPotentialSecrets } from '../utils/text.js';

export type { Rule, RuleContext };

export function issue(
  rule: Pick<Rule, 'id' | 'name' | 'description' | 'category' | 'defaultSeverity'>,
  context: RuleContext,
  details: {
    message: string;
    severity?: Severity;
    line?: number;
    endLine?: number;
    evidence?: string;
    suggestion?: string;
  },
): Issue {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: details.severity ?? rule.defaultSeverity,
    message: details.message,
    description: rule.description,
    path: context.document.relativePath,
    ...(details.line === undefined ? {} : { line: details.line }),
    ...(details.endLine === undefined ? {} : { endLine: details.endLine }),
    ...(details.evidence === undefined
      ? {}
      : { evidence: redactPotentialSecrets(details.evidence) }),
    ...(details.suggestion === undefined ? {} : { suggestion: details.suggestion }),
  };
}
