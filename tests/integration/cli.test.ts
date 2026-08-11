import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');

function runCli(...arguments_: string[]) {
  return spawnSync(process.execPath, ['--import=tsx', 'src/cli.ts', ...arguments_], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

describe('CLI smoke tests', () => {
  it('scans a file and emits stable JSON', () => {
    const result = runCli(
      'scan',
      'tests/fixtures/good-skill/SKILL.md',
      '--format',
      'json',
      '--no-color',
    );
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      schemaVersion: string;
      score: { overall: number };
    };
    expect(report.schemaVersion).toBe('0.1');
    expect(report.score.overall).toBeGreaterThanOrEqual(95);
  });

  it('returns exit code 1 for critical findings in CI mode', () => {
    const result = runCli(
      'scan',
      'tests/fixtures/dangerous-skill/SKILL.md',
      '--ci',
      '--no-color',
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('CRITICAL');
    expect(result.stdout).not.toContain('sk-proj-1234567890abcdefghijklmnopqrstuv');
  });

  it('keeps fix mode read-only', () => {
    const result = runCli(
      'fix',
      'tests/fixtures/bad-skill/SKILL.md',
      '--dry-run',
      '--no-color',
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No files were changed');
  });

  it('supports stricter configurable CI thresholds', () => {
    const result = runCli(
      'lint',
      'tests/fixtures/bloated-skill/SKILL.md',
      '--ci',
      '--fail-on',
      'warning',
      '--no-color',
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('SB003');
  });

  it('emits SARIF and GitHub annotation formats', () => {
    const sarif = runCli(
      'lint',
      'tests/fixtures/bad-skill/SKILL.md',
      '--format',
      'sarif',
      '--no-color',
    );
    expect(sarif.status).toBe(0);
    expect(JSON.parse(sarif.stdout)).toMatchObject({ version: '2.1.0' });

    const github = runCli(
      'lint',
      'tests/fixtures/dangerous-skill/SKILL.md',
      '--format',
      'github',
      '--no-color',
    );
    expect(github.status).toBe(0);
    expect(github.stdout).toContain('::error');
  });

  it('lists and explains built-in rules', () => {
    const listed = runCli('rules', '--format', 'json', '--no-color');
    expect(listed.status).toBe(0);
    expect(JSON.parse(listed.stdout)).toHaveLength(24);

    const explained = runCli('rules', 'SB102', '--no-color');
    expect(explained.status).toBe(0);
    expect(explained.stdout).toContain('SB102');
    expect(explained.stdout).toContain('safety');
  });

  it('compares two targets and fails CI only on introduced findings', () => {
    const result = runCli(
      'compare',
      'tests/fixtures/good-skill/SKILL.md',
      'tests/fixtures/dangerous-skill/SKILL.md',
      '--ci',
      '--fail-on',
      'error',
      '--no-color',
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('introduced');
  });
});
