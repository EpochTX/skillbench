import type {
  AgentAdapter,
  AnalysisReport,
  ApplyFixOptions,
  ApplyFixResult,
  Category,
  ComparisonReport,
  CompatibilityChange,
  CompatibilityResult,
  CompatibilityStatus,
  FileFixPlan,
  FixPlan,
  Issue,
  ParsedDocument,
  PlanFixOptions,
  Reporter,
  ReportSnapshot,
  Rule,
  RuleBenchmarkCaseResult,
  RuleBenchmarkReport,
  RuleBenchmarkThresholds,
  SafeFix,
  SafeFixKind,
  Severity,
  TokenMetrics,
} from '../../src/index.js';

export interface PublicTypeContract {
  agentAdapter: AgentAdapter;
  analysisReport: AnalysisReport;
  applyFixOptions: ApplyFixOptions;
  applyFixResult: ApplyFixResult;
  category: Category;
  comparisonReport: ComparisonReport;
  compatibilityChange: CompatibilityChange;
  compatibilityResult: CompatibilityResult;
  compatibilityStatus: CompatibilityStatus;
  fileFixPlan: FileFixPlan;
  fixPlan: FixPlan;
  issue: Issue;
  parsedDocument: ParsedDocument;
  planFixOptions: PlanFixOptions;
  reporter: Reporter;
  reportSnapshot: ReportSnapshot;
  rule: Rule;
  ruleBenchmarkCaseResult: RuleBenchmarkCaseResult;
  ruleBenchmarkReport: RuleBenchmarkReport;
  ruleBenchmarkThresholds: RuleBenchmarkThresholds;
  safeFix: SafeFix;
  safeFixKind: SafeFixKind;
  severity: Severity;
  tokenMetrics: TokenMetrics;
}
