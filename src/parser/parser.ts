import path from 'node:path';

import YAML from 'yaml';
import { z } from 'zod';

import type {
  DocumentKind,
  Paragraph,
  ParsedDocument,
  Section,
} from '../core/types.js';

const frontmatterSchema = z.record(z.string(), z.unknown());

export class DocumentParseError extends Error {
  override readonly name = 'DocumentParseError';

  constructor(
    message: string,
    readonly filePath: string,
  ) {
    super(`${message}: ${filePath}`);
  }
}

export function detectDocumentKind(filePath: string): DocumentKind {
  const normalized = filePath.replaceAll('\\', '/').replaceAll(path.sep, '/');
  const baseName = path.posix.basename(normalized);

  if (baseName === 'SKILL.md') return 'skill';
  if (baseName === 'AGENTS.md') return 'agents';
  if (baseName === 'CLAUDE.md') return 'claude';
  if (baseName === 'GEMINI.md') return 'gemini';
  if (baseName === '.cursorrules') return 'cursor-legacy';
  if (/\/.cursor\/rules\/.+\.mdc$/u.test(`/${normalized}`)) return 'cursor-rule';
  if (`/${normalized}`.endsWith('/.github/copilot-instructions.md')) return 'copilot';
  if (/\/.github\/instructions\/.+\.instructions\.md$/u.test(`/${normalized}`)) {
    return 'copilot-path';
  }
  return 'markdown';
}

export function parseDocument(
  filePath: string,
  content: string,
  root = path.dirname(filePath),
): ParsedDocument {
  const normalizedContent = content.replace(/\r\n?/gu, '\n');
  const lines = normalizedContent.split('\n');
  const frontmatterResult = parseFrontmatter(lines, filePath);
  const bodyLines = lines.slice(frontmatterResult.bodyStartIndex);
  const body = bodyLines.join('\n');
  const bodyStartLine = frontmatterResult.bodyStartIndex + 1;
  const relativePath = path.relative(root, filePath).split(path.sep).join('/');

  return {
    path: filePath,
    relativePath: relativePath || path.basename(filePath),
    fileName: path.basename(filePath),
    kind: detectDocumentKind(filePath),
    content: normalizedContent,
    body,
    bodyStartLine,
    lines,
    ...(frontmatterResult.frontmatter === undefined
      ? {}
      : { frontmatter: frontmatterResult.frontmatter }),
    ...(frontmatterResult.range === undefined
      ? {}
      : { frontmatterRange: frontmatterResult.range }),
    paragraphs: parseParagraphs(bodyLines, bodyStartLine),
    sections: parseSections(bodyLines, bodyStartLine),
  };
}

interface FrontmatterResult {
  frontmatter?: Readonly<Record<string, unknown>>;
  range?: { startLine: number; endLine: number };
  bodyStartIndex: number;
}

function parseFrontmatter(lines: string[], filePath: string): FrontmatterResult {
  if (lines[0]?.trim() !== '---') return { bodyStartIndex: 0 };
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === '---',
  );
  if (closingIndex === -1) {
    throw new DocumentParseError('Unclosed YAML frontmatter', filePath);
  }

  try {
    const value: unknown = YAML.parse(lines.slice(1, closingIndex).join('\n'));
    const frontmatter = frontmatterSchema.parse(value ?? {});
    return {
      frontmatter,
      range: { startLine: 1, endLine: closingIndex + 1 },
      bodyStartIndex: closingIndex + 1,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown YAML error';
    throw new DocumentParseError(`Invalid YAML frontmatter (${detail})`, filePath);
  }
}

function parseParagraphs(lines: string[], startLine: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let buffer: string[] = [];
  let paragraphStart = startLine;

  const flush = (endLine: number): void => {
    const text = buffer.join('\n').trim();
    if (text) {
      paragraphs.push({ text, startLine: paragraphStart, endLine });
    }
    buffer = [];
  };

  lines.forEach((line, index) => {
    const lineNumber = startLine + index;
    if (!line.trim()) {
      flush(lineNumber - 1);
      paragraphStart = lineNumber + 1;
      return;
    }
    if (buffer.length === 0) paragraphStart = lineNumber;
    buffer.push(line);
  });
  flush(startLine + lines.length - 1);
  return paragraphs;
}

function parseSections(lines: string[], startLine: number): Section[] {
  const headings = lines.flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
    return match
      ? [
          {
            index,
            depth: match[1]?.length ?? 1,
            title: match[2]?.trim() ?? '',
          },
        ]
      : [];
  });

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const endIndex = (next?.index ?? lines.length) - 1;
    return {
      depth: heading.depth,
      title: heading.title,
      content: lines
        .slice(heading.index + 1, endIndex + 1)
        .join('\n')
        .trim(),
      startLine: startLine + heading.index,
      endLine: Math.max(startLine + heading.index, startLine + endIndex),
    };
  });
}
