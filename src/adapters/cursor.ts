import type { AgentAdapter } from './types.js';
import type { CompatibilityResult, ParsedDocument } from '../core/types.js';
import { portableSkillResult, result } from './shared.js';

export class CursorAdapter implements AgentAdapter {
  readonly id = 'cursor';
  readonly name = 'Cursor';

  detect(document: ParsedDocument): boolean {
    return ['skill', 'agents', 'claude', 'cursor-rule', 'cursor-legacy'].includes(
      document.kind,
    );
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
        'CURSOR_AGENTS_MD',
        'Cursor supports root and nested AGENTS.md files.',
      );
    }
    if (document.kind === 'cursor-rule') {
      const metadata = document.frontmatter;
      const hasActivationMetadata =
        metadata !== undefined &&
        ('description' in metadata || 'globs' in metadata || 'alwaysApply' in metadata);
      return result(
        document,
        this.id,
        this.name,
        hasActivationMetadata ? 'SUPPORTED' : 'PARTIAL',
        hasActivationMetadata ? 'CURSOR_MDC' : 'CURSOR_MDC_METADATA',
        hasActivationMetadata
          ? '.cursor/rules/*.mdc is Cursor’s native scoped-rule format.'
          : 'The MDC file is discoverable but lacks clear activation metadata.',
      );
    }
    if (document.kind === 'cursor-legacy') {
      return result(
        document,
        this.id,
        this.name,
        'PARTIAL',
        'CURSOR_LEGACY_RULES',
        '.cursorrules is a legacy format; prefer .cursor/rules/*.mdc or AGENTS.md.',
      );
    }
    if (document.kind === 'claude') {
      return result(
        document,
        this.id,
        this.name,
        'PARTIAL',
        'CURSOR_CLI_CLAUDE_MD',
        'Cursor CLI reads root CLAUDE.md, but support may differ across Cursor surfaces.',
        'medium',
      );
    }
    if (document.kind === 'markdown') {
      return result(
        document,
        this.id,
        this.name,
        'UNKNOWN',
        'CURSOR_GENERIC_MARKDOWN',
        'Generic Markdown has no guaranteed Cursor rule activation.',
        'low',
      );
    }
    return result(
      document,
      this.id,
      this.name,
      'UNSUPPORTED',
      'CURSOR_FILENAME',
      'This filename is not a native Cursor instruction entry.',
    );
  }
}
