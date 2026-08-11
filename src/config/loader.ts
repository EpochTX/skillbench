import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { ZodError } from 'zod';

import { configFileSchema, defaultConfig, defaultScoreWeights } from './schema.js';
import type { ResolvedConfig } from './schema.js';
import { categories } from '../core/types.js';

const configNames = ['.skillbench.yml', '.skillbench.yaml'];

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

export async function loadConfig(
  startPath: string,
  explicitPath?: string,
): Promise<ResolvedConfig> {
  const configPath = explicitPath
    ? path.resolve(explicitPath)
    : await findConfig(startPath);
  if (!configPath) return cloneDefaultConfig();

  try {
    const source = await readFile(configPath, 'utf8');
    const raw: unknown = YAML.parse(source);
    const parsed = configFileSchema.parse(raw ?? {});
    const score = Object.fromEntries(
      categories.map((category) => [
        category,
        parsed.score[category] ?? defaultScoreWeights[category],
      ]),
    ) as ResolvedConfig['score'];
    if (Object.values(score).every((weight) => weight === 0)) {
      throw new ConfigError('At least one score weight must be greater than zero');
    }
    return {
      extends: parsed.extends,
      rules: parsed.rules,
      score,
      ignore: parsed.ignore,
      configPath,
    };
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    if (error instanceof ZodError) {
      const details = error.issues
        .map((entry) => `${entry.path.join('.') || '<root>'}: ${entry.message}`)
        .join('; ');
      throw new ConfigError(`Invalid SkillBench config at ${configPath}: ${details}`);
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Cannot read SkillBench config at ${configPath}: ${detail}`);
  }
}

async function findConfig(startPath: string): Promise<string | undefined> {
  const absolute = path.resolve(startPath);
  const startStats = await stat(absolute).catch(() => undefined);
  let directory = startStats?.isFile() ? path.dirname(absolute) : absolute;

  while (true) {
    for (const name of configNames) {
      const candidate = path.join(directory, name);
      try {
        await access(candidate);
        return candidate;
      } catch {
        // Continue searching toward the filesystem root.
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function cloneDefaultConfig(): ResolvedConfig {
  return {
    ...defaultConfig,
    rules: {},
    score: { ...defaultConfig.score },
    ignore: [],
  };
}
