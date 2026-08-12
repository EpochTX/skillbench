import { constants } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const defaultConfigSource = `# SkillBench configuration
extends: recommended

# Override individual rules when needed:
# rules:
#   SB002: off
#   SB100: warning
rules: {}

score:
  instruction: 30
  safety: 25
  efficiency: 15
  portability: 20
  maintainability: 10

ignore:
  - examples/**
  - vendor/**
`;

export async function initializeConfig(directory = process.cwd()): Promise<string> {
  const resolvedDirectory = path.resolve(directory);
  const configPath = path.join(resolvedDirectory, '.skillbench.yml');

  await mkdir(resolvedDirectory, { recursive: true });

  try {
    await access(configPath, constants.F_OK);
    throw new Error(`Config already exists: ${configPath}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Config already exists')) {
      throw error;
    }
  }
  await writeFile(configPath, defaultConfigSource, { encoding: 'utf8', flag: 'wx' });
  return configPath;
}
