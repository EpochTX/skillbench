import { constants } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
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
  const configPath = path.resolve(directory, '.skillbench.yml');
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
