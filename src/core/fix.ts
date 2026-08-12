import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadConfig } from '../config/loader.js';
import { discoverDocuments } from '../parser/discovery.js';
import type { Paragraph, ParsedDocument } from './types.js';
import { findDuplicateParagraphs } from './token-analyzer.js';

export type SafeFixKind = 'remove-exact-duplicate-paragraph';

export interface SafeFix {
  kind: SafeFixKind;
  ruleId: 'SB003';
  path: string;
  line: number;
  endLine: number;
  message: string;
}

export interface FileFixPlan {
  filePath: string;
  relativePath: string;
  sourceHash: string;
  sourceLineCount: number;
  removeLines: number[];
  fixes: SafeFix[];
}

export interface FixPlan {
  target: string;
  files: FileFixPlan[];
  fixes: SafeFix[];
}

export interface PlanFixOptions {
  configPath?: string;
}

export interface ApplyFixOptions {
  backup?: boolean;
}

export interface ApplyFixResult {
  filesChanged: number;
  fixesApplied: number;
  backups: string[];
}

export class FixConflictError extends Error {
  override readonly name = 'FixConflictError';
}

export async function planSafeFixes(
  target: string,
  options: PlanFixOptions = {},
): Promise<FixPlan> {
  const config = await loadConfig(target, options.configPath);
  const documents = await discoverDocuments(target, config.ignore);
  const files: FileFixPlan[] = [];

  for (const document of documents) {
    const planned = planDocumentFixes(document);
    if (planned.fixes.length === 0) continue;
    const raw = await readFile(document.path, 'utf8');
    files.push({
      filePath: document.path,
      relativePath: document.relativePath,
      sourceHash: hash(raw),
      sourceLineCount: raw.split(/\r\n|\n|\r/u).length,
      removeLines: [...planned.removeLines].sort((left, right) => left - right),
      fixes: planned.fixes,
    });
  }

  return {
    target: path.resolve(target),
    files,
    fixes: files.flatMap((file) => file.fixes),
  };
}

export async function applyFixPlan(
  plan: FixPlan,
  options: ApplyFixOptions = {},
): Promise<ApplyFixResult> {
  const prepared = await Promise.all(
    plan.files.map(async (file) => {
      const raw = await readFile(file.filePath, 'utf8');
      if (hash(raw) !== file.sourceHash) {
        throw new FixConflictError(
          `Refusing to modify ${file.relativePath}: file changed after fixes were planned.`,
        );
      }
      const lines = raw.split(/\r\n|\n|\r/u);
      if (lines.length !== file.sourceLineCount) {
        throw new FixConflictError(
          `Refusing to modify ${file.relativePath}: line structure changed after fixes were planned.`,
        );
      }
      const endings = raw.match(/\r\n|\n|\r/gu) ?? [];
      const removed = new Set(file.removeLines.map((line) => line - 1));
      let output = '';
      for (let index = 0; index < lines.length; index += 1) {
        if (removed.has(index)) continue;
        output += lines[index] ?? '';
        if (index < endings.length) output += endings[index] ?? '';
      }
      return { file, output };
    }),
  );

  const backups: string[] = [];
  if (options.backup) {
    for (const entry of prepared) {
      const backupPath = `${entry.file.filePath}.skillbench.bak`;
      await copyFile(entry.file.filePath, backupPath, fsConstants.COPYFILE_EXCL);
      backups.push(backupPath);
    }
  }

  for (const entry of prepared) {
    await writeFile(entry.file.filePath, entry.output, 'utf8');
  }

  return {
    filesChanged: prepared.length,
    fixesApplied: plan.fixes.length,
    backups,
  };
}

function planDocumentFixes(document: ParsedDocument): {
  fixes: SafeFix[];
  removeLines: Set<number>;
} {
  const fencedLines = findFencedLines(document.lines);
  const removeLines = new Set<number>();
  const fixes: SafeFix[] = [];

  for (const match of findDuplicateParagraphs(document.paragraphs)) {
    if (match.similarity !== 1) continue;
    if (!isPlainProse(match.duplicate, fencedLines)) continue;

    const lines = deletionLines(document, match.duplicate);
    if (lines.some((line) => removeLines.has(line))) continue;
    for (const line of lines) removeLines.add(line);
    fixes.push({
      kind: 'remove-exact-duplicate-paragraph',
      ruleId: 'SB003',
      path: document.relativePath,
      line: match.duplicate.startLine,
      endLine: match.duplicate.endLine,
      message: `Remove exact duplicate prose paragraph; canonical copy starts at line ${match.original.startLine}.`,
    });
  }

  return { fixes, removeLines };
}

function deletionLines(document: ParsedDocument, paragraph: Paragraph): number[] {
  let start = paragraph.startLine;
  let end = paragraph.endLine;
  const nextLine = document.lines[end];
  const previousLine = document.lines[start - 2];

  if (end < document.lines.length - 1 && nextLine?.trim() === '') {
    end += 1;
  } else if (start > 1 && previousLine?.trim() === '') {
    start -= 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isPlainProse(paragraph: Paragraph, fencedLines: ReadonlySet<number>): boolean {
  for (let line = paragraph.startLine; line <= paragraph.endLine; line += 1) {
    if (fencedLines.has(line)) return false;
  }
  return paragraph.text.split('\n').every((line) => {
    const trimmed = line.trimStart();
    if (!trimmed) return true;
    if (/^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|<|\|)/u.test(trimmed)) return false;
    return !/^(`{3,}|~{3,})/u.test(trimmed);
  });
}

function findFencedLines(lines: readonly string[]): Set<number> {
  const fenced = new Set<number>();
  let active: '`' | '~' | undefined;

  lines.forEach((line, index) => {
    const match = /^\s*(`{3,}|~{3,})/u.exec(line);
    const marker = match?.[1]?.[0] as '`' | '~' | undefined;
    if (active) fenced.add(index + 1);
    if (!marker) return;
    fenced.add(index + 1);
    if (!active) active = marker;
    else if (active === marker) active = undefined;
  });

  return fenced;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
