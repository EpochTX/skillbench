import { z } from 'zod';

import { categories, severities } from '../core/types.js';
import type { Category, Severity } from '../core/types.js';

export const ruleSettingSchema = z.union([z.literal('off'), z.enum(severities)]);

const scoreSchema = z
  .object({
    instruction: z.number().nonnegative().optional(),
    safety: z.number().nonnegative().optional(),
    efficiency: z.number().nonnegative().optional(),
    portability: z.number().nonnegative().optional(),
    maintainability: z.number().nonnegative().optional(),
  })
  .strict();

export const configFileSchema = z
  .object({
    extends: z.literal('recommended').default('recommended'),
    rules: z.record(z.string(), ruleSettingSchema).default({}),
    score: scoreSchema.default({}),
    ignore: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type RuleSetting = 'off' | Severity;

export interface ResolvedConfig {
  extends: 'recommended';
  rules: Record<string, RuleSetting>;
  score: Record<Category, number>;
  ignore: string[];
  configPath?: string;
}

export const defaultScoreWeights: Record<Category, number> = {
  instruction: 30,
  safety: 25,
  efficiency: 15,
  portability: 20,
  maintainability: 10,
};

export const defaultConfig: ResolvedConfig = {
  extends: 'recommended',
  rules: {},
  score: { ...defaultScoreWeights },
  ignore: [],
};

export function isCategory(value: string): value is Category {
  return (categories as readonly string[]).includes(value);
}
