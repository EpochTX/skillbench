import { describe, expect, it } from 'vitest';

import * as api from '../../src/index.js';

const publicRuntimeExports = [
  'BenchmarkError',
  'FixConflictError',
  'GitHubReporter',
  'JsonReporter',
  'PROJECT_URL',
  'SCHEMA_VERSION',
  'SarifReporter',
  'TokenEfficiencyAnalyzer',
  'VERSION',
  'analyzeDocuments',
  'analyzeTarget',
  'applyFixPlan',
  'builtInAdapters',
  'builtInRules',
  'calculateScore',
  'compareReports',
  'detectDocumentKind',
  'discoverDocuments',
  'estimateTokens',
  'findDuplicateParagraphs',
  'issueFingerprint',
  'issueIdentity',
  'parseDocument',
  'planSafeFixes',
  'runRuleBenchmark',
  'scoringPolicy',
].sort();

describe('public API', () => {
  it('exports exactly the supported runtime surface', () => {
    expect(Object.keys(api).sort()).toEqual(publicRuntimeExports);
  });

  it('keeps core registries and metadata canonical', () => {
    expect(api.builtInRules).toHaveLength(24);
    expect(api.builtInAdapters).toHaveLength(5);
    expect(api.VERSION).toBe('1.0.0');
    expect(api.SCHEMA_VERSION).toBe('0.1');
    expect(api.PROJECT_URL).toBe('https://github.com/EpochTX/skillbench');
  });
});
