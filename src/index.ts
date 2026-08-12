export { analyzeDocuments, analyzeTarget } from './core/analyze.js';
export { compareReports } from './core/compare.js';
export type {
  ComparisonReport,
  CompatibilityChange,
  ReportSnapshot,
} from './core/compare.js';
export {
  applyFixPlan,
  FixConflictError,
  planSafeFixes,
} from './core/fix.js';
export type {
  ApplyFixOptions,
  ApplyFixResult,
  FileFixPlan,
  FixPlan,
  PlanFixOptions,
  SafeFix,
  SafeFixKind,
} from './core/fix.js';
export { issueFingerprint, issueIdentity } from './core/fingerprint.js';
export { calculateScore, scoringPolicy } from './core/scoring.js';
export {
  estimateTokens,
  findDuplicateParagraphs,
  TokenEfficiencyAnalyzer,
} from './core/token-analyzer.js';
export { discoverDocuments } from './parser/discovery.js';
export { detectDocumentKind, parseDocument } from './parser/parser.js';
export { builtInRules } from './rules/registry.js';
export { builtInAdapters } from './adapters/index.js';
export { GitHubReporter } from './reporters/github.js';
export { JsonReporter } from './reporters/json.js';
export { SarifReporter } from './reporters/sarif.js';
export type { Reporter } from './reporters/types.js';
export type { AgentAdapter } from './adapters/index.js';
export type {
  AnalysisReport,
  Category,
  CompatibilityResult,
  CompatibilityStatus,
  Issue,
  ParsedDocument,
  Rule,
  Severity,
  TokenMetrics,
} from './core/types.js';
export { PROJECT_URL, SCHEMA_VERSION, VERSION } from './version.js';
