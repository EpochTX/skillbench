import path from 'node:path';

import { analyzeCompatibility, builtInAdapters } from '../adapters/index.js';
import { loadConfig } from '../config/loader.js';
import type { ResolvedConfig } from '../config/schema.js';
import { discoverDocuments } from '../parser/discovery.js';
import { builtInRules } from '../rules/registry.js';
import { SCHEMA_VERSION, VERSION } from '../version.js';
import { RuleEngine } from './rule-engine.js';
import { calculateScore } from './scoring.js';
import { TokenEfficiencyAnalyzer } from './token-analyzer.js';
import type {
  AnalysisReport,
  ParsedDocument,
  Severity,
  TokenMetrics,
} from './types.js';

export interface AnalyzeOptions {
  configPath?: string;
  config?: ResolvedConfig;
}

export async function analyzeTarget(
  target: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisReport> {
  const config = options.config ?? (await loadConfig(target, options.configPath));
  const documents = await discoverDocuments(target, config.ignore);
  return analyzeDocuments(documents, path.resolve(target), config);
}

export function analyzeDocuments(
  documents: readonly ParsedDocument[],
  target: string,
  config: ResolvedConfig,
): AnalysisReport {
  const tokenAnalyzer = new TokenEfficiencyAnalyzer();
  const contexts = documents.map((document) => ({
    document,
    tokens: tokenAnalyzer.analyze(document),
  }));
  const issues = new RuleEngine(builtInRules, config).run(contexts);
  const compatibilityList = analyzeCompatibility(documents, builtInAdapters);
  const score = calculateScore(issues, builtInRules, compatibilityList, config.score);
  const summary: Record<Severity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  };
  for (const entry of issues) summary[entry.severity] += 1;

  return {
    schemaVersion: SCHEMA_VERSION,
    tool: { name: 'skillbench', version: VERSION },
    target,
    score,
    summary,
    issues,
    compatibility: Object.fromEntries(
      compatibilityList.map((entry) => [entry.agentId, entry]),
    ),
    tokens: aggregateTokens(contexts.map((context) => context.tokens)),
    files: contexts.map((context) => ({
      path: context.document.relativePath,
      kind: context.document.kind,
      tokens: context.tokens,
      issueCount: issues.filter((entry) => entry.path === context.document.relativePath)
        .length,
    })),
  };
}

function aggregateTokens(metrics: readonly TokenMetrics[]): TokenMetrics {
  const total = metrics.reduce(
    (result, entry) => ({
      characters: result.characters + entry.characters,
      words: result.words + entry.words,
      cjkCharacters: result.cjkCharacters + entry.cjkCharacters,
      estimatedTokens: result.estimatedTokens + entry.estimatedTokens,
      duplicateTokens: result.duplicateTokens + entry.duplicateTokens,
      estimatedSavings: result.estimatedSavings + entry.estimatedSavings,
      weightedDensity:
        result.weightedDensity + entry.instructionDensity * entry.estimatedTokens,
    }),
    {
      characters: 0,
      words: 0,
      cjkCharacters: 0,
      estimatedTokens: 0,
      duplicateTokens: 0,
      estimatedSavings: 0,
      weightedDensity: 0,
    },
  );
  return {
    characters: total.characters,
    words: total.words,
    cjkCharacters: total.cjkCharacters,
    estimatedTokens: total.estimatedTokens,
    duplicateTokens: total.duplicateTokens,
    redundancyRatio: round(
      total.estimatedTokens === 0 ? 0 : total.duplicateTokens / total.estimatedTokens,
      4,
    ),
    estimatedSavings: total.estimatedSavings,
    instructionDensity: round(
      total.estimatedTokens === 0 ? 0 : total.weightedDensity / total.estimatedTokens,
      4,
    ),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
