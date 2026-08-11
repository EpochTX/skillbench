import type { CompatibilityResult, ParsedDocument } from '../core/types.js';

export interface AgentAdapter {
  id: string;
  name: string;
  detect(document: ParsedDocument): boolean;
  analyze(document: ParsedDocument): CompatibilityResult;
}
