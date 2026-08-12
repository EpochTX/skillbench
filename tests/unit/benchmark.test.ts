import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BenchmarkError, runRuleBenchmark } from '../../src/core/benchmark.js';

const corpus = path.resolve('tests/corpus/rules.yml');

describe('rule benchmark', () => {
  it('holds the repository corpus at perfect precision and recall', async () => {
    const report = await runRuleBenchmark(corpus);

    expect(report.passed).toBe(true);
    expect(report.totals.cases).toBe(6);
    expect(report.totals.truePositives).toBe(13);
    expect(report.totals.falsePositives).toBe(0);
    expect(report.totals.falseNegatives).toBe(0);
    expect(report.totals.precision).toBe(1);
    expect(report.totals.recall).toBe(1);
    expect(report.totals.coveredRules).toBe(13);
    expect(report.totals.totalRules).toBe(24);
    expect(report.totals.ruleCoverage).toBeGreaterThan(0.5);
  });

  it('rejects unknown rule IDs before analyzing targets', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-benchmark-'));
    const manifestPath = path.join(directory, 'benchmark.yml');
    try {
      await writeFile(
        manifestPath,
        `version: 1\ncases:\n  - id: unknown-rule\n    target: missing.md\n    expectedRules:\n      - SB999\n`,
        'utf8',
      );

      await expect(runRuleBenchmark(manifestPath)).rejects.toBeInstanceOf(BenchmarkError);
      await expect(runRuleBenchmark(manifestPath)).rejects.toThrow('unknown rule');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects duplicate corpus case IDs', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-benchmark-'));
    const manifestPath = path.join(directory, 'benchmark.yml');
    try {
      await writeFile(
        manifestPath,
        `version: 1\ncases:\n  - id: duplicate\n    target: first.md\n    expectedRules: []\n  - id: duplicate\n    target: second.md\n    expectedRules: []\n`,
        'utf8',
      );

      await expect(runRuleBenchmark(manifestPath)).rejects.toThrow(
        'Duplicate benchmark case id: duplicate',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
