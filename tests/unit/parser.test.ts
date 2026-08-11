import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DocumentParseError, parseDocument } from '../../src/parser/parser.js';

describe('parseDocument', () => {
  it('parses frontmatter, paragraphs, sections, and source lines', () => {
    const filePath = path.join('/repo', 'review-skill', 'SKILL.md');
    const document = parseDocument(
      filePath,
      `---\nname: review-skill\ndescription: Review changes\n---\n\n# Review\n\nFirst paragraph.\n\n## Output\n\nReturn findings.\n`,
      '/repo',
    );

    expect(document.kind).toBe('skill');
    expect(document.relativePath).toBe('review-skill/SKILL.md');
    expect(document.frontmatter).toMatchObject({ name: 'review-skill' });
    expect(document.bodyStartLine).toBe(5);
    expect(document.sections.map((section) => section.title)).toEqual([
      'Review',
      'Output',
    ]);
    expect(document.paragraphs.some((paragraph) => paragraph.startLine === 8)).toBe(
      true,
    );
  });

  it('normalizes Windows newlines', () => {
    const document = parseDocument(
      'C:\\repo\\AGENTS.md',
      '# Project\r\n\r\nUse TypeScript.\r\n',
      'C:\\repo',
    );
    expect(document.content).not.toContain('\r');
    expect(document.kind).toBe('agents');
  });

  it('handles empty files without inventing content', () => {
    const document = parseDocument('/repo/SKILL.md', '', '/repo');
    expect(document.body).toBe('');
    expect(document.paragraphs).toEqual([]);
    expect(document.sections).toEqual([]);
  });

  it('preserves Unicode content and section titles', () => {
    const document = parseDocument(
      '/repo/SKILL.md',
      '# 说明\n\n检查中文、한글、かな和 emoji ✅。\n',
      '/repo',
    );
    expect(document.content).toContain('中文、한글、かな和 emoji ✅');
    expect(document.sections[0]?.title).toBe('说明');
  });

  it('rejects malformed or unclosed frontmatter', () => {
    expect(() => parseDocument('/repo/SKILL.md', '---\nname: [\n---\nBody')).toThrow(
      DocumentParseError,
    );
    expect(() => parseDocument('/repo/SKILL.md', '---\nname: test')).toThrow(
      'Unclosed YAML frontmatter',
    );
  });
});
