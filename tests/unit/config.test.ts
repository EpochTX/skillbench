import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeConfig } from '../../src/config/init.js';
import { ConfigError, loadConfig } from '../../src/config/loader.js';
import { analyzeTarget } from '../../src/core/analyze.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-'));
  temporaryDirectories.push(directory);
  return directory;
}

describe('configuration', () => {
  it('loads overrides, weights, and ignore patterns', async () => {
    const directory = await temporaryDirectory();
    await writeFile(
      path.join(directory, '.skillbench.yml'),
      `extends: recommended\nrules:\n  SB002: off\n  SB100: warning\nscore:\n  safety: 40\nignore:\n  - vendor/**\n`,
    );
    const config = await loadConfig(directory);
    expect(config.rules).toMatchObject({ SB002: 'off', SB100: 'warning' });
    expect(config.score.safety).toBe(40);
    expect(config.score.instruction).toBe(30);
    expect(config.ignore).toEqual(['vendor/**']);
  });

  it('rejects unknown keys and invalid severities', async () => {
    const directory = await temporaryDirectory();
    await writeFile(
      path.join(directory, '.skillbench.yml'),
      `rules:\n  SB100: catastrophic\nunknown: true\n`,
    );
    await expect(loadConfig(directory)).rejects.toBeInstanceOf(ConfigError);
  });

  it('rejects unknown rule IDs instead of silently ignoring typos', async () => {
    const directory = await temporaryDirectory();
    const configPath = path.join(directory, '.skillbench.yml');
    await writeFile(configPath, 'rules:\n  SB999: off\n');
    await expect(
      analyzeTarget(path.resolve('tests/fixtures/good-skill/SKILL.md'), {
        configPath,
      }),
    ).rejects.toThrow('Unknown SkillBench rule id: SB999');
  });

  it('initializes a valid config without overwriting', async () => {
    const directory = await temporaryDirectory();
    const configPath = await initializeConfig(directory);
    expect(await readFile(configPath, 'utf8')).toContain('extends: recommended');
    await expect(loadConfig(directory)).resolves.toMatchObject({
      extends: 'recommended',
    });
    await expect(initializeConfig(directory)).rejects.toThrow('already exists');
  });

  it('creates missing nested init directories including Unicode and spaces', async () => {
    const parent = await temporaryDirectory();
    const directory = path.join(parent, 'Agent 指令 空格', 'nested repo');
    const configPath = await initializeConfig(directory);

    expect(configPath).toBe(path.join(directory, '.skillbench.yml'));
    expect(await readFile(configPath, 'utf8')).toContain('extends: recommended');
  });

  it('finds config inside a directory whose name contains a dot', async () => {
    const parent = await temporaryDirectory();
    const directory = path.join(parent, 'repo.v1');
    await mkdir(directory);
    await writeFile(path.join(directory, '.skillbench.yml'), 'rules: {}\n');
    await expect(loadConfig(directory)).resolves.toMatchObject({
      configPath: path.join(directory, '.skillbench.yml'),
    });
  });
});
