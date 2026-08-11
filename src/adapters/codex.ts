import type { AgentAdapter } from './types.js';
import type { CompatibilityResult, ParsedDocument } from '../core/types.js';
import { portableSkillResult, result } from './shared.js';

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex';
  readonly name = 'OpenAI Codex';

  detect(document: ParsedDocument): boolean {
    return document.kind === 'skill' || document.kind === 'agents';
  }

  analyze(document: ParsedDocument): CompatibilityResult {
    if (document.kind === 'skill') {
      return portableSkillResult(document, this.id, this.name);
    }
    if (document.kind === 'agents') {
      return result(
        document,
        this.id,
        this.name,
        'SUPPORTED',
        'CODEX_AGENTS_MD',
        'AGENTS.md is a native Codex project-instruction file.',
      );
    }
    if (document.kind === 'markdown') {
      return result(
        document,
        this.id,
        this.name,
        'UNKNOWN',
        'CODEX_GENERIC_MARKDOWN',
        'Generic Markdown has no guaranteed Codex discovery behavior.',
        'low',
      );
    }
    return result(
      document,
      this.id,
      this.name,
      'UNSUPPORTED',
      'CODEX_FILENAME',
      'This platform-specific filename is not a native Codex instruction entry.',
    );
  }
}
