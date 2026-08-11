import type { AgentAdapter } from './types.js';
import type { CompatibilityResult, ParsedDocument } from '../core/types.js';
import { portableSkillResult, result } from './shared.js';

const claudeSkillExtensions = new Set([
  'disable-model-invocation',
  'user-invocable',
  'argument-hint',
  'model',
  'context',
  'agent',
  'hooks',
]);

export class ClaudeAdapter implements AgentAdapter {
  readonly id = 'claude';
  readonly name = 'Claude Code';

  detect(document: ParsedDocument): boolean {
    return document.kind === 'skill' || document.kind === 'claude';
  }

  analyze(document: ParsedDocument): CompatibilityResult {
    if (document.kind === 'skill') {
      return portableSkillResult(document, this.id, this.name, claudeSkillExtensions);
    }
    if (document.kind === 'claude') {
      return result(
        document,
        this.id,
        this.name,
        'SUPPORTED',
        'CLAUDE_MD',
        'CLAUDE.md is a native Claude Code project-memory file.',
      );
    }
    if (document.kind === 'markdown') {
      return result(
        document,
        this.id,
        this.name,
        'UNKNOWN',
        'CLAUDE_GENERIC_MARKDOWN',
        'Generic Markdown has no guaranteed Claude Code discovery behavior.',
        'low',
      );
    }
    return result(
      document,
      this.id,
      this.name,
      'UNSUPPORTED',
      'CLAUDE_FILENAME',
      'This filename is not a native Claude Code instruction entry.',
    );
  }
}
