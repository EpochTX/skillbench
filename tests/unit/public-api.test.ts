import { describe, expect, it } from 'vitest';

import * as api from '../../src/index.js';

describe('public API', () => {
  it('exports the supported analysis and reporter surface', () => {
    expect(typeof api.analyzeTarget).toBe('function');
    expect(typeof api.analyzeDocuments).toBe('function');
    expect(typeof api.runRuleBenchmark).toBe('function');
    expect(api.BenchmarkError).toBeTypeOf('function');
    expect(typeof api.compareReports).toBe('function');
    expect(typeof api.planSafeFixes).toBe('function');
    expect(typeof api.applyFixPlan).toBe('function');
    expect(api.FixConflictError).toBeTypeOf('function');
    expect(typeof api.issueFingerprint).toBe('function');
    expect(typeof api.issueIdentity).toBe('function');
    expect(typeof api.calculateScore).toBe('function');
    expect(typeof api.estimateTokens).toBe('function');
    expect(typeof api.discoverDocuments).toBe('function');
    expect(typeof api.parseDocument).toBe('function');
    expect(api.GitHubReporter).toBeTypeOf('function');
    expect(api.JsonReporter).toBeTypeOf('function');
    expect(api.SarifReporter).toBeTypeOf('function');
    expect(api.builtInRules).toHaveLength(24);
    expect(api.builtInAdapters).toHaveLength(5);
  });

  it('exports canonical tool and schema metadata', () => {
    expect(api.VERSION).toBe('0.2.0');
    expect(api.SCHEMA_VERSION).toBe('0.1');
    expect(api.PROJECT_URL).toBe('https://github.com/EpochTX/skillbench');
  });
});
