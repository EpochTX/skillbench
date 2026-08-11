import type { Issue, Rule, RuleContext } from './types.js';
import { ConfigError } from '../config/loader.js';
import type { ResolvedConfig } from '../config/schema.js';

export class RuleEngine {
  constructor(
    private readonly rules: readonly Rule[],
    private readonly config: ResolvedConfig,
  ) {}

  run(contexts: readonly RuleContext[]): Issue[] {
    const knownRuleIds = new Set(this.rules.map((rule) => rule.id));
    const unknownRuleIds = Object.keys(this.config.rules).filter(
      (ruleId) => !knownRuleIds.has(ruleId),
    );
    if (unknownRuleIds.length > 0) {
      throw new ConfigError(
        `Unknown SkillBench rule id${unknownRuleIds.length === 1 ? '' : 's'}: ${unknownRuleIds.join(', ')}`,
      );
    }

    const issues: Issue[] = [];
    for (const rule of this.rules) {
      const setting = this.config.rules[rule.id];
      if (setting === 'off') continue;

      for (const context of contexts) {
        const detected = rule.check(context);
        issues.push(
          ...detected.map((entry) =>
            setting === undefined
              ? entry
              : {
                  ...entry,
                  severity: setting,
                },
          ),
        );
      }
    }

    return issues.sort(compareIssues);
  }
}

const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 } as const;

function compareIssues(left: Issue, right: Issue): number {
  return (
    severityOrder[left.severity] - severityOrder[right.severity] ||
    left.path.localeCompare(right.path) ||
    (left.line ?? 0) - (right.line ?? 0) ||
    left.ruleId.localeCompare(right.ruleId)
  );
}
