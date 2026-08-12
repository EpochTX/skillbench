import { readFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';
import { z, ZodError } from 'zod';

import { defaultConfig } from '../config/schema.js';
import { discoverDocuments } from '../parser/discovery.js';
import { builtInRules } from '../rules/registry.js';
import { analyzeDocuments } from './analyze.js';
import type { AnalysisReport } from './types.js';

const benchmarkCaseSchema = z
  .object({
    id: z.string().min(1),
    target: z.string().min(1),
    expectedRules: z.array(z.string().regex(/^SB\d{3}$/u)).default([]),
  })
  .strict();

const benchmarkManifestSchema = z
  .object({
    version: z.literal(1),
    thresholds: z
      .object({
        minPrecision: z.number().min(0).max(1).default(1),
        minRecall: z.number().min(0).max(1).default(1),
        minRuleCoverage: z.number().min(0).max(1).default(0),
      })
      .strict()
      .default({ minPrecision: 1, minRecall: 1, minRuleCoverage: 0 }),
    cases: z.array(benchmarkCaseSchema).min(1),
  })
  .strict();

export interface RuleBenchmarkThresholds {
  minPrecision: number;
  minRecall: number;
  minRuleCoverage: number;
}

export interface RuleBenchmarkCaseResult {
  id: string;
  target: string;
  expectedRules: string[];
  actualRules: string[];
  truePositives: string[];
  falsePositives: string[];
  falseNegatives: string[];
}

export interface RuleBenchmarkReport {
  version: 1;
  manifestPath: string;
  cases: RuleBenchmarkCaseResult[];
  totals: {
    cases: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    ruleCoverage: number;
    coveredRules: number;
    totalRules: number;
  };
  thresholds: RuleBenchmarkThresholds;
  passed: boolean;
}

export class BenchmarkError extends Error {
  override readonly name = 'BenchmarkError';
}

export async function runRuleBenchmark(manifestPath: string): Promise<RuleBenchmarkReport> {
  const absoluteManifest = path.resolve(manifestPath);
  const manifest = await loadManifest(absoluteManifest);
  validateManifestSemantics(manifest);
  const manifestDirectory = path.dirname(absoluteManifest);
  const caseResults: RuleBenchmarkCaseResult[] = [];

  for (const benchmarkCase of manifest.cases) {
    const resolvedTarget = path.resolve(manifestDirectory, benchmarkCase.target);
    const report = await analyzeBenchmarkTarget(benchmarkCase.id, resolvedTarget);
    const expected = uniqueSorted(benchmarkCase.expectedRules);
    const actual = uniqueSorted(report.issues.map((issue) => issue.ruleId));
    const expectedSet = new Set(expected);
    const actualSet = new Set(actual);
    caseResults.push({
      id: benchmarkCase.id,
      target: normalizeReportPath(benchmarkCase.target),
      expectedRules: expected,
      actualRules: actual,
      truePositives: expected.filter((ruleId) => actualSet.has(ruleId)),
      falsePositives: actual.filter((ruleId) => !expectedSet.has(ruleId)),
      falseNegatives: expected.filter((ruleId) => !actualSet.has(ruleId)),
    });
  }

  const truePositives = sum(caseResults, (entry) => entry.truePositives.length);
  const falsePositives = sum(caseResults, (entry) => entry.falsePositives.length);
  const falseNegatives = sum(caseResults, (entry) => entry.falseNegatives.length);
  const coveredRuleIds = new Set(caseResults.flatMap((entry) => entry.expectedRules));
  const precision = ratio(truePositives, truePositives + falsePositives);
  const recall = ratio(truePositives, truePositives + falseNegatives);
  const ruleCoverage = ratio(coveredRuleIds.size, builtInRules.length);
  const thresholds = manifest.thresholds;

  return {
    version: 1,
    manifestPath: normalizeReportPath(manifestPath),
    cases: caseResults,
    totals: {
      cases: caseResults.length,
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      ruleCoverage,
      coveredRules: coveredRuleIds.size,
      totalRules: builtInRules.length,
    },
    thresholds,
    passed:
      precision >= thresholds.minPrecision &&
      recall >= thresholds.minRecall &&
      ruleCoverage >= thresholds.minRuleCoverage,
  };
}

async function analyzeBenchmarkTarget(
  caseId: string,
  target: string,
): Promise<AnalysisReport> {
  try {
    const documents = await discoverDocuments(target);
    return analyzeDocuments(documents, target, {
      ...defaultConfig,
      rules: {},
      score: { ...defaultConfig.score },
      ignore: [],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BenchmarkError(`Benchmark case ${caseId} could not be analyzed: ${detail}`);
  }
}

async function loadManifest(
  manifestPath: string,
): Promise<z.infer<typeof benchmarkManifestSchema>> {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed: unknown = YAML.parse(raw);
    return benchmarkManifestSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((entry) => `${entry.path.join('.') || '<root>'}: ${entry.message}`)
        .join('; ');
      throw new BenchmarkError(`Invalid benchmark manifest at ${manifestPath}: ${details}`);
    }
    if (error instanceof BenchmarkError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new BenchmarkError(`Cannot read benchmark manifest at ${manifestPath}: ${detail}`);
  }
}

function validateManifestSemantics(
  manifest: z.infer<typeof benchmarkManifestSchema>,
): void {
  const knownRules = new Set(builtInRules.map((rule) => rule.id));
  const caseIds = new Set<string>();

  for (const benchmarkCase of manifest.cases) {
    if (caseIds.has(benchmarkCase.id)) {
      throw new BenchmarkError(`Duplicate benchmark case id: ${benchmarkCase.id}`);
    }
    caseIds.add(benchmarkCase.id);

    const duplicateRules = benchmarkCase.expectedRules.filter(
      (ruleId, index, entries) => entries.indexOf(ruleId) !== index,
    );
    if (duplicateRules.length > 0) {
      throw new BenchmarkError(
        `Benchmark case ${benchmarkCase.id} repeats expected rule(s): ${uniqueSorted(duplicateRules).join(', ')}`,
      );
    }
    const unknownRules = benchmarkCase.expectedRules.filter((ruleId) => !knownRules.has(ruleId));
    if (unknownRules.length > 0) {
      throw new BenchmarkError(
        `Benchmark case ${benchmarkCase.id} references unknown rule(s): ${uniqueSorted(unknownRules).join(', ')}`,
      );
    }
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeReportPath(value: string): string {
  return value.replaceAll('\\', '/');
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : round(numerator / denominator, 4);
}

function sum<T>(entries: readonly T[], selector: (entry: T) => number): number {
  return entries.reduce((total, entry) => total + selector(entry), 0);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
