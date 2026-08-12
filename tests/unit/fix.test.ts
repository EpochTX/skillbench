import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
