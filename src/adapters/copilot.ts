import type { AgentAdapter } from './types.js';
import type { CompatibilityResult, ParsedDocument } from '../core/types.js';
import { portableSkillResult, result } from './shared.js';

export class CopilotAdapter implements AgentAdapter {
  readonly id = 'copilot';
  readonly name = 'GitHub Copilot';

  detect(document: ParsedDocument): boolean {
    return ['skill', 'copilot', 'copilot-path', 'agents', 'claude', 'gemini'].includes(
      document.kind,
    );
  }

  analyze(document: ParsedDocument): CompatibilityResult {
    if (document.kind === 'skill') {
      return portableSkillResult(document, this.id, this.name);
    }
    if (document.kind === 'copilot') {
      return result(
        document,
        this.id,
        this.name,
        'SUPPORTED',
        'COPILOT_REPOSITORY_INSTRUCTIONS',
        '.github/copilot-instructions.md is the native repository-wide format.',
      );
    }
    if (document.kind === 'copilot-path') {
      const applyTo = document.frontmatter?.applyTo;
      return result(
        document,
        this.id,
        this.name,
        typeof applyTo === 'string' && applyTo.trim() ? 'SUPPORTED' : 'PARTIAL',
        'COPILOT_PATH_INSTRUCTIONS',
        typeof applyTo === 'string' && applyTo.trim()
          ? 'Path-specific instructions declare an applyTo scope.'
          : 'Path-specific instructions require an applyTo frontmatter glob.',
      );
    }
    if (['agents', 'claude', 'gemini'].includes(document.kind)) {
      return result(
        document,
        this.id,
        this.name,
        'PARTIAL',
        'COPILOT_AGENT_INSTRUCTIONS',
        'Copilot supports this agent-instruction filename only in selected features and clients.',
        'medium',
      );
    }
    if (document.kind === 'markdown') {
      return result(
        document,
        this.id,
        this.name,
        'UNKNOWN',
        'COPILOT_GENERIC_MARKDOWN',
        'Generic Markdown has no guaranteed Copilot instruction discovery.',
        'low',
      );
    }
    return result(
      document,
      this.id,
      this.name,
      'UNSUPPORTED',
      'COPILOT_FILENAME',
      'This filename is not a native GitHub Copilot instruction entry.',
    );
  }
}
