import { Chalk } from 'chalk';

import type { Rule } from '../core/types.js';

export function renderRules(
  rules: readonly Rule[],
  options: { format?: 'terminal' | 'json'; color?: boolean; ruleId?: string } = {},
): string {
  const selected = options.ruleId
    ? rules.filter((rule) => rule.id.toLowerCase() === options.ruleId?.toLowerCase())
    : [...rules];
  if (options.ruleId && selected.length === 0) {
    throw new Error(`Unknown rule: ${options.ruleId}`);
  }
  if (options.format === 'json') return JSON.stringify(selected, null, 2);

  const c = new Chalk({ level: options.color === false ? 0 : 1 });
  if (selected.length === 1) {
    const rule = selected[0];
    if (!rule) throw new Error('Rule selection unexpectedly returned no result.');
    return [
      c.bold(`${rule.id} — ${rule.name}`),
      '',
      `Category          ${rule.category}`,
      `Default severity ${rule.defaultSeverity}`,
      `Score multiplier ${rule.weight}`,
      '',
      rule.description,
    ].join('\n');
  }

  return [
    c.bold(`SkillBench Rules (${selected.length})`),
    '',
    ...selected.map(
      (rule) =>
        `${rule.id.padEnd(6)} ${rule.category.padEnd(16)} ${rule.defaultSeverity.padEnd(9)} ×${rule.weight.toFixed(2).padEnd(5)} ${rule.name}`,
    ),
    '',
    c.dim('Run `skillbench rules SB102` to inspect one rule.'),
  ].join('\n');
}
