export const categories = [
  'instruction',
  'safety',
  'efficiency',
  'portability',
  'maintainability',
] as const;

export type Category = (typeof categories)[number];

export const severities = ['info', 'warning', 'error', 'critical'] as const;

export type Severity = (typeof severities)[number];

export type DocumentKind =
  | 'skill'
  | 'agents'
  | 'claude'
  | 'cursor-legacy'
  | 'cursor-rule'
  | 'gemini'
  | 'copilot'
  | 'copilot-path'
  | 'markdown';

export interface SourceRange {
  startLine: number;
  endLine: number;
}

export interface Paragraph extends SourceRange {
  text: string;
}

export interface Section extends SourceRange {
  depth: number;
  title: string;
  content: string;
}

export interface ParsedDocument {
  path: string;
  relativePath: string;
  fileName: string;
  kind: DocumentKind;
  content: string;
  body: string;
  bodyStartLine: number;
  lines: string[];
  frontmatter?: Readonly<Record<string, unknown>>;
  frontmatterRange?: SourceRange;
  paragraphs: Paragraph[];
  sections: Section[];
}

export interface Issue {
  ruleId: string;
  ruleName: string;
  category: Category;
  severity: Severity;
  message: string;
  description: string;
  path: string;
  line?: number;
  endLine?: number;
  evidence?: string;
  suggestion?: string;
}

export interface TokenMetrics {
  characters: number;
  words: number;
  cjkCharacters: number;
  estimatedTokens: number;
  duplicateTokens: number;
  redundancyRatio: number;
  estimatedSavings: number;
  instructionDensity: number;
}

export interface RuleContext {
  document: ParsedDocument;
  tokens: TokenMetrics;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: Category;
  defaultSeverity: Severity;
  weight: number;
  check(context: RuleContext): Issue[];
}

export type CompatibilityStatus = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED' | 'UNKNOWN';

export interface CompatibilityReason {
  code: string;
  message: string;
  path?: string;
}

export interface CompatibilityResult {
  agentId: string;
  agentName: string;
  status: CompatibilityStatus;
  confidence: 'high' | 'medium' | 'low';
  reasons: CompatibilityReason[];
}

export interface ScoreDeduction {
  ruleId: string;
  severity: Severity;
  points: number;
  reason: string;
}

export interface CategoryScore {
  score: number;
  weight: number;
  deductions: ScoreDeduction[];
}

export type CategoryScores = Record<Category, CategoryScore>;

export interface ScoreResult {
  overall: number;
  categories: CategoryScores;
  cap?: {
    maximum: number;
    reason: string;
  };
}

export interface FileAnalysis {
  path: string;
  kind: DocumentKind;
  tokens: TokenMetrics;
  issueCount: number;
}

export interface AnalysisReport {
  schemaVersion: '0.1';
  tool: { name: 'skillbench'; version: string };
  target: string;
  score: ScoreResult;
  summary: Record<Severity, number>;
  issues: Issue[];
  compatibility: Record<string, CompatibilityResult>;
  tokens: TokenMetrics;
  files: FileAnalysis[];
}
