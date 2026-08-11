import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
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

  it('creates parent directories for --output', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'skillbench-cli-'));
    const outputPath = path.join(directory, 'nested', 'report.json');
    try {
      const result = runCli(
        'scan',
        'tests/fixtures/good-skill/SKILL.md',
        '--format',
        'json',
        '--output',
        outputPath,
        '--no-color',
      );
      expect(result.status).toBe(0);
      const report = JSON.parse(readFileSync(outputPath, 'utf8')) as {
        schemaVersion: string;
      };
      expect(report.schemaVersion).toBe('0.1');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
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

  it('runs score, compatibility, token, security, and badge commands', () => {
    const target = 'tests/fixtures/good-skill/SKILL.md';

    const score = runCli('score', target, '--no-color');
    expect(score.status).toBe(0);
    expect(score.stdout).toContain('Overall Score:');

    const compatibility = runCli('compat', target, '--no-color');
    expect(compatibility.status).toBe(0);
    expect(compatibility.stdout).toContain('Compatibility Report');
    expect(compatibility.stdout).toContain('OpenAI Codex');

    const token = runCli('token', target, '--no-color');
    expect(token.status).toBe(0);
    expect(token.stdout).toContain('Token Efficiency');
    expect(token.stdout).toContain('Estimated Tokens');

    const security = runCli(
      'security',
      'tests/fixtures/dangerous-skill/SKILL.md',
      '--no-color',
    );
    expect(security.status).toBe(0);
    expect(security.stdout).toContain('Security Report');

    const badge = runCli('badge', target);
    expect(badge.status).toBe(0);
    expect(badge.stdout).toContain('https://img.shields.io/badge/SkillBench-');
  });

  it('initializes a configuration through the CLI', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'skillbench-init-'));
    try {
      const result = runCli('init', directory);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Created');
      expect(readFileSync(path.join(directory, '.skillbench.yml'), 'utf8')).toContain(
        'extends: recommended',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
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

  it('returns exit code 2 for an unknown rule ID', () => {
    const result = runCli('rules', 'SB999', '--no-color');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown rule: SB999');
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
