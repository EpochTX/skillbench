import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyFixPlan, FixConflictError, planSafeFixes } from '../../src/core/fix.js';

const duplicateParagraph =
  'Keep this exact plain prose instruction because it is intentionally long enough for duplicate detection.';

function skillSource(newline = '\n'): string {
  return [
    '---',
    'name: safe-fix-test',
    'description: A deterministic fixture used to verify conservative SkillBench safe fixes.',
    '---',
    '# Purpose',
    '',
    duplicateParagraph,
    '',
    duplicateParagraph,
    '',
    'Keep this distinct final instruction unchanged.',
    '',
  ].join(newline);
}

describe('safe fix planning', () => {
  it('removes exact duplicate prose, preserves CRLF, creates a backup, and is idempotent', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-fix-'));
    const filePath = path.join(directory, 'SKILL.md');
    const original = skillSource('\r\n');
    try {
      await writeFile(filePath, original, 'utf8');
      const plan = await planSafeFixes(filePath);

      expect(plan.fixes).toHaveLength(1);
      expect(plan.fixes[0]).toMatchObject({
        kind: 'remove-exact-duplicate-paragraph',
        ruleId: 'SB003',
        path: 'SKILL.md',
      });

      const result = await applyFixPlan(plan, { backup: true });
      expect(result.filesChanged).toBe(1);
      expect(result.fixesApplied).toBe(1);
      expect(result.backups).toEqual([`${filePath}.skillbench.bak`]);
      expect(await readFile(`${filePath}.skillbench.bak`, 'utf8')).toBe(original);

      const updated = await readFile(filePath, 'utf8');
      expect(updated).toContain('\r\n');
      expect(updated.split(duplicateParagraph)).toHaveLength(2);
      expect(updated).toContain('Keep this distinct final instruction unchanged.');
      expect(
        (await readdir(directory)).some((name) => name.includes('.skillbench-')),
      ).toBe(false);

      const secondPlan = await planSafeFixes(filePath);
      expect(secondPlan.fixes).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite a file changed after planning', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-fix-conflict-'));
    const filePath = path.join(directory, 'SKILL.md');
    try {
      await writeFile(filePath, skillSource(), 'utf8');
      const plan = await planSafeFixes(filePath);
      await writeFile(filePath, `${skillSource()}External edit.\n`, 'utf8');

      await expect(applyFixPlan(plan)).rejects.toBeInstanceOf(FixConflictError);
      expect(await readFile(filePath, 'utf8')).toContain('External edit.');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('preflights every backup path before modifying any source file', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-fix-backups-'));
    const firstDirectory = path.join(directory, 'a');
    const secondDirectory = path.join(directory, 'b');
    const firstPath = path.join(firstDirectory, 'SKILL.md');
    const secondPath = path.join(secondDirectory, 'SKILL.md');
    const firstSource = skillSource();
    const secondSource = skillSource();
    const existingBackup = `${secondPath}.skillbench.bak`;
    try {
      await Promise.all([
        mkdir(firstDirectory, { recursive: true }),
        mkdir(secondDirectory, { recursive: true }),
      ]);
      await Promise.all([
        writeFile(firstPath, firstSource, 'utf8'),
        writeFile(secondPath, secondSource, 'utf8'),
        writeFile(existingBackup, 'existing backup', 'utf8'),
      ]);
      const plan = await planSafeFixes(directory);
      expect(plan.files).toHaveLength(2);

      await expect(applyFixPlan(plan, { backup: true })).rejects.toBeInstanceOf(
        FixConflictError,
      );

      expect(await readFile(firstPath, 'utf8')).toBe(firstSource);
      expect(await readFile(secondPath, 'utf8')).toBe(secondSource);
      expect(await readFile(existingBackup, 'utf8')).toBe('existing backup');
      await expect(
        readFile(`${firstPath}.skillbench.bak`, 'utf8'),
      ).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('preserves file permission bits when replacing a file', async () => {
    if (process.platform === 'win32') return;
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-fix-mode-'));
    const filePath = path.join(directory, 'SKILL.md');
    try {
      await writeFile(filePath, skillSource(), 'utf8');
      await chmod(filePath, 0o640);
      const plan = await planSafeFixes(filePath);
      await applyFixPlan(plan);

      expect((await stat(filePath)).mode & 0o777).toBe(0o640);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('does not auto-fix exact duplicates inside fenced code blocks', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-fix-fence-'));
    const filePath = path.join(directory, 'SKILL.md');
    const source = [
      '---',
      'name: safe-fix-test',
      'description: A deterministic fixture used to verify conservative SkillBench safe fixes.',
      '---',
      '# Example',
      '',
      '```text',
      duplicateParagraph,
      '',
      duplicateParagraph,
      '```',
      '',
    ].join('\n');
    try {
      await writeFile(filePath, source, 'utf8');
      const plan = await planSafeFixes(filePath);
      expect(plan.fixes).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
