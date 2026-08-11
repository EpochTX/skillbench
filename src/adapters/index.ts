import type { CompatibilityResult, ParsedDocument } from '../core/types.js';
import { ClaudeAdapter } from './claude.js';
import { CodexAdapter } from './codex.js';
import { CopilotAdapter } from './copilot.js';
import { CursorAdapter } from './cursor.js';
import { GeminiAdapter } from './gemini.js';
import type { AgentAdapter } from './types.js';

export const builtInAdapters = [
  new CodexAdapter(),
  new ClaudeAdapter(),
  new CursorAdapter(),
  new GeminiAdapter(),
  new CopilotAdapter(),
] satisfies AgentAdapter[];

export function analyzeCompatibility(
  documents: readonly ParsedDocument[],
  adapters: readonly AgentAdapter[] = builtInAdapters,
): CompatibilityResult[] {
  return adapters.map((adapter) => {
    const results = documents.map((document) => adapter.analyze(document));
    return aggregate(adapter, results);
  });
}

function aggregate(
  adapter: AgentAdapter,
  results: readonly CompatibilityResult[],
): CompatibilityResult {
  if (results.length === 1 && results[0]) return results[0];

  const supported = results.filter((entry) => entry.status === 'SUPPORTED');
  if (supported.length > 0) {
    return {
      agentId: adapter.id,
      agentName: adapter.name,
      status: 'SUPPORTED',
      confidence: supported.every((entry) => entry.confidence === 'high')
        ? 'high'
        : 'medium',
      reasons: supported.flatMap((entry) => entry.reasons),
    };
  }

  const partial = results.filter((entry) => entry.status === 'PARTIAL');
  if (partial.length > 0) {
    return {
      agentId: adapter.id,
      agentName: adapter.name,
      status: 'PARTIAL',
      confidence: 'medium',
      reasons: partial.flatMap((entry) => entry.reasons),
    };
  }

  const unknown = results.filter((entry) => entry.status === 'UNKNOWN');
  if (unknown.length > 0) {
    return {
      agentId: adapter.id,
      agentName: adapter.name,
      status: 'UNKNOWN',
      confidence: 'low',
      reasons: unknown.flatMap((entry) => entry.reasons),
    };
  }

  return {
    agentId: adapter.id,
    agentName: adapter.name,
    status: 'UNSUPPORTED',
    confidence: 'high',
    reasons: results.flatMap((entry) => entry.reasons).slice(0, 5),
  };
}

export type { AgentAdapter } from './types.js';
export { ClaudeAdapter } from './claude.js';
export { CodexAdapter } from './codex.js';
export { CopilotAdapter } from './copilot.js';
export { CursorAdapter } from './cursor.js';
export { GeminiAdapter } from './gemini.js';
