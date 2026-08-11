import type { AgentAdapter } from './types.js';
import type { CompatibilityResult, ParsedDocument } from '../core/types.js';
import { portableSkillResult, result } from './shared.js';

export class GeminiAdapter implements AgentAdapter {
  readonly id = 'gemini';
  readonly name = 'Gemini CLI';

  detect(document: ParsedDocument): boolean {
    return document.kind === 'skill' || document.kind === 'gemini';
  }

  analyze(document: ParsedDocument): CompatibilityResult {
    if (document.kind === 'skill') {
      return portableSkillResult(document, this.id, this.name);
    }
    if (document.kind === 'gemini') {
      return result(
        document,
        this.id,
        this.name,
        'SUPPORTED',
        'GEMINI_MD',
        'GEMINI.md is Gemini CLI’s native hierarchical context format.',
      );
    }
    if (document.kind === 'markdown') {
      return result(
        document,
        this.id,
        this.name,
        'UNKNOWN',
        'GEMINI_GENERIC_MARKDOWN',
        'Generic Markdown has no guaranteed Gemini CLI context discovery.',
        'low',
      );
    }
    return result(
      document,
      this.id,
      this.name,
      'UNSUPPORTED',
      'GEMINI_FILENAME',
      'This filename is not a native Gemini CLI instruction entry.',
    );
  }
}
