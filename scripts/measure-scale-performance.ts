import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { analyzeTarget } from '../src/core/analyze.js';

interface PerformanceResult {
  version: 1;
  files: number;
  bytes: number;
  elapsedMs: number;
  rssMiB: number;
  issues: number;
  estimatedTokens: number;
  limits: {
    maxElapsedMs: number;
    maxRssMiB: number;
  };
  passed: boolean;
}

const fileCount = 120;
const maxElapsedMs = readPositiveLimit('SKILLBENCH_PERF_MAX_MS', 12_000);
const maxRssMiB = readPositiveLimit('SKILLBENCH_PERF_MAX_RSS_MIB', 512);

await main();

async function main(): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'skillbench-perf-'));
  try {
    const bytes = await generateRepository(directory);
    const started = performance.now();
    const report = await analyzeTarget(directory);
    const elapsedMs = round(performance.now() - started, 1);
    const rssMiB = round(process.memoryUsage().rss / 1024 / 1024, 1);

    if (report.files.length !== fileCount) {
      throw new Error(
        `Performance fixture discovery mismatch: expected ${fileCount} files, received ${report.files.length}.`,
      );
    }

    const result: PerformanceResult = {
      version: 1,
      files: report.files.length,
      bytes,
      elapsedMs,
      rssMiB,
      issues: report.issues.length,
      estimatedTokens: report.tokens.estimatedTokens,
      limits: {
        maxElapsedMs,
        maxRssMiB,
      },
      passed: elapsedMs <= maxElapsedMs && rssMiB <= maxRssMiB,
    };

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.passed) {
      process.stderr.write(
        `SkillBench performance guard failed: ${elapsedMs} ms / ${rssMiB} MiB exceeded ${maxElapsedMs} ms / ${maxRssMiB} MiB.\n`,
      );
      process.exitCode = 1;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function generateRepository(root: string): Promise<number> {
  let bytes = 0;
  for (let index = 0; index < fileCount; index += 1) {
    const directory = path.join(root, `package-${String(index + 1).padStart(3, '0')}`);
    await mkdir(directory, { recursive: true });
    const source = skillSource(index + 1);
    bytes += Buffer.byteLength(source, 'utf8');
    await writeFile(path.join(directory, 'SKILL.md'), source, 'utf8');
  }
  return bytes;
}

function skillSource(index: number): string {
  const checks = Array.from(
    { length: 18 },
    (_, checkIndex) =>
      `Check ${checkIndex + 1} for package ${index}: inspect the relevant repository evidence, preserve task scope, and record only verified behavior marker ${index}-${checkIndex + 1}.`,
  );
  return [
    '---',
    `name: performance-package-${String(index).padStart(3, '0')}`,
    `description: Deterministic performance fixture ${index} for measuring SkillBench repository-scale static analysis.`,
    '---',
    '# Purpose',
    '',
    `Review package ${index} instructions and produce deterministic evidence-based findings without executing repository content.`,
    '',
    '# Workflow',
    '',
    ...checks.flatMap((entry) => [entry, '']),
    '# Output',
    '',
    `Return a concise package ${index} report containing observed evidence, verification status, and any remaining uncertainty.`,
    '',
  ].join('\n');
}

function readPositiveLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number. Received: ${raw}`);
  }
  return value;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
