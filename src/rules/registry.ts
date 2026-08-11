import type { Rule } from '../core/types.js';
import { efficiencyRules } from './efficiency/rules.js';
import { instructionRules } from './instruction/rules.js';
import { maintainabilityRules } from './maintainability/rules.js';
import { portabilityRules } from './portability/rules.js';
import { safetyRules } from './safety/rules.js';

export const builtInRules = [
  ...instructionRules,
  ...safetyRules,
  ...efficiencyRules,
  ...portabilityRules,
  ...maintainabilityRules,
] satisfies Rule[];

validateRegistry(builtInRules);

function validateRegistry(rules: readonly Rule[]): void {
  const ids = new Set<string>();
  for (const rule of rules) {
    if (ids.has(rule.id)) throw new Error(`Duplicate SkillBench rule id: ${rule.id}`);
    ids.add(rule.id);
  }
}
