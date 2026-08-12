import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const cliPath = path.join(root, 'dist', 'cli.js');
const ansiControlSequencePrefix = `${String.fromCharCode(27)}[`;
const duplicateParagraph =
  'Keep this exact plain prose instruction because it is intentionally long enough for duplicate detection.';

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

main();

function main(): void {
  assertSuccess(run('--version'), 'version');

  const directory = mkdtempSync(path.join(os.tmpdir(), 'skillbench-built-cli-'));
  try {
    const unicodeDirectory = path.join(directory, 'Agent 指令 空格');
    const target = path.join(unicodeDirectory, 'SKILL.md');
    const outputPath = path.join(directory, '输出 报告', 'report.json');
    const fixTarget = path.join(directory, 'Fix 空格', 'SKILL.md');

    writeFixture(target, goodSkillSource('\r\n'));
    writeFixture(fixTarget, fixableSkillSource());

    verifyJsonScan(target, outputPath);
    verifyHumanViews(target);
    verifyFixFlow(fixTarget);
    verifyRules();
    verifyCompare(target);
    verifyBenchmark();
    verifyInitAndBadge(directory, target);
    verifyExitCodes(target);

    process.stdout.write('Built CLI contract verification passed.\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function verifyJsonScan(target: string, outputPath: string): void {
  const direct = assertSuccess(
    run('scan', target, '--format', 'json', '--no-color'),
    'scan JSON',
  );
  const report = parseJson(direct.stdout) as { schemaVersion?: string; target?: string };
  assert(report.schemaVersion === '0.1', 'scan JSON schemaVersion mismatch');
  assertNoAnsi(direct.stdout, 'scan --no-color');

  const written = assertSuccess(
    run('scan', target, '--format', 'json', '--output', outputPath, '--no-color'),
    'scan --output',
  );
  assert(existsSync(outputPath), '--output did not create the report file');
  const fileReport = parseJson(readFileSync(outputPath, 'utf8')) as {
    schemaVersion?: string;
  };
  assert(fileReport.schemaVersion === '0.1', '--output report schema mismatch');
  assert(written.stdout.startsWith('Wrote '), '--output did not report the written path');
}

function verifyHumanViews(target: string): void {
  const checks: [string, string][] = [
    ['score', 'Overall Score:'],
    ['lint', 'Lint Report'],
    ['compat', 'Compatibility Report'],
    ['token', 'Token Efficiency'],
  ];
  for (const [command, expected] of checks) {
    const result = assertSuccess(run(command, target, '--no-color'), command);
    assert(result.stdout.includes(expected), `${command} output contract mismatch`);
    assertNoAnsi(result.stdout, `${command} --no-color`);
  }

  const security = assertSuccess(
    run('security', 'tests/fixtures/dangerous-skill/SKILL.md', '--no-color'),
    'security',
  );
  assert(security.stdout.includes('Security Report'), 'security output contract mismatch');
}

function verifyFixFlow(target: string): void {
  const before = readFileSync(target, 'utf8');
  const preview = assertSuccess(run('fix', target, '--no-color'), 'fix preview');
  assert(preview.stdout.includes('No files were changed'), 'fix preview must stay read-only');
  assert(readFileSync(target, 'utf8') === before, 'fix preview modified the target');

  const applied = assertSuccess(
    run('fix', target, '--write', '--backup', '--no-color'),
    'fix --write',
  );
  assert(applied.stdout.includes('Applied 1 safe fix'), 'fix --write did not apply the safe fix');
  assert(existsSync(`${target}.skillbench.bak`), 'fix --backup did not create a backup');
}

function verifyRules(): void {
  const listed = assertSuccess(run('rules', '--format', 'json', '--no-color'), 'rules JSON');
  const rules = parseJson(listed.stdout) as unknown[];
  assert(rules.length === 24, `rules JSON returned ${rules.length} rules`);

  const explained = assertSuccess(run('rules', 'SB102', '--no-color'), 'rules SB102');
  assert(explained.stdout.includes('SB102'), 'rule detail output mismatch');
}

function verifyCompare(target: string): void {
  const comparison = assertStatus(
    run(
      'compare',
      target,
      'tests/fixtures/dangerous-skill/SKILL.md',
      '--format',
      'json',
      '--ci',
      '--fail-on',
      'error',
      '--no-color',
    ),
    1,
    'compare CI regression',
  );
  const report = parseJson(comparison.stdout) as {
    issues?: { introduced?: unknown[] };
  };
  assert((report.issues?.introduced?.length ?? 0) > 0, 'compare did not report introduced issues');
}

function verifyBenchmark(): void {
  const result = assertSuccess(
    run(
      'benchmark',
      'tests/corpus/rules.yml',
      '--ci',
      '--format',
      'json',
      '--no-color',
    ),
    'benchmark',
  );
  const report = parseJson(result.stdout) as {
    passed?: boolean;
    totals?: { coveredRules?: number };
  };
  assert(report.passed === true, 'built benchmark did not pass');
  assert(report.totals?.coveredRules === 24, 'built benchmark did not cover 24 rules');
}

function verifyInitAndBadge(directory: string, target: string): void {
  const initDirectory = path.join(directory, '初始化 配置');
  const initialized = assertSuccess(run('init', initDirectory), 'init');
  assert(initialized.stdout.includes('Created'), 'init output mismatch');
  assert(existsSync(path.join(initDirectory, '.skillbench.yml')), 'init did not create config');

  const badge = assertSuccess(run('badge', target), 'badge');
  assert(badge.stdout.includes('https://img.shields.io/badge/SkillBench-'), 'badge output mismatch');
}

function verifyExitCodes(target: string): void {
  assertStatus(run('rules', 'SB999', '--no-color'), 2, 'unknown rule exit code');
  assertStatus(
    run(
      'scan',
      'tests/fixtures/dangerous-skill/SKILL.md',
      '--ci',
      '--fail-on',
      'critical',
      '--no-color',
    ),
    1,
    'policy failure exit code',
  );
  assertStatus(run('scan', target, '--no-color'), 0, 'success exit code');
}

function run(...arguments_: string[]): CommandResult {
  const result = spawnSync(process.execPath, [cliPath, ...arguments_], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function assertSuccess(result: CommandResult, label: string): CommandResult {
  return assertStatus(result, 0, label);
}

function assertStatus(
  result: CommandResult,
  expected: number,
  label: string,
): CommandResult {
  if (result.status !== expected) {
    throw new Error(
      `${label} exited ${result.status}; expected ${expected}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function assertNoAnsi(value: string, label: string): void {
  assert(!value.includes(ansiControlSequencePrefix), `${label} emitted ANSI escapes`);
}

function writeFixture(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function goodSkillSource(newline: string): string {
  return [
    '---',
    'name: built-cli-unicode',
    'description: Verify the production CLI against Unicode and spaced paths without executing repository content.',
    '---',
    '# Purpose',
    '',
    'Review local agent instructions using deterministic evidence and preserve the requested task scope.',
    '',
    '# Workflow',
    '',
    'Inspect relevant files, verify findings, and report only behavior supported by observed evidence.',
    '',
    '# Output',
    '',
    'Return concise findings, verification status, and any remaining uncertainty.',
    '',
  ].join(newline);
}

function fixableSkillSource(): string {
  return [
    '---',
    'name: built-cli-fix',
    'description: Verify deterministic safe fixes through the production SkillBench CLI.',
    '---',
    '# Purpose',
    '',
    duplicateParagraph,
    '',
    duplicateParagraph,
    '',
    'Keep this distinct final instruction unchanged.',
    '',
  ].join('\n');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
