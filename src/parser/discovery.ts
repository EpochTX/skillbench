import { constants } from 'node:fs';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { minimatch } from 'minimatch';

import type { ParsedDocument } from '../core/types.js';
import { parseDocument } from './parser.js';

const exactNames = new Set([
  'SKILL.md',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.cursorrules',
]);

const defaultIgnores = [
  '.git/**',
  'node_modules/**',
  'dist/**',
  'coverage/**',
  'vendor/**',
];

const maxDocumentBytes = 2 * 1024 * 1024;

export class DiscoveryError extends Error {
  override readonly name = 'DiscoveryError';
}

export async function discoverDocuments(
  target: string,
  ignorePatterns: string[] = [],
): Promise<ParsedDocument[]> {
  const absoluteTarget = path.resolve(target);
  await ensureReadable(absoluteTarget);
  const targetStats = await stat(absoluteTarget);

  if (targetStats.isFile()) {
    return [await readDocument(absoluteTarget, path.dirname(absoluteTarget))];
  }
  if (!targetStats.isDirectory()) {
    throw new DiscoveryError(`Target is not a file or directory: ${target}`);
  }

  const paths: string[] = [];
  await walk(
    absoluteTarget,
    absoluteTarget,
    [...defaultIgnores, ...ignorePatterns],
    paths,
  );
  paths.sort((left, right) => left.localeCompare(right));
  if (paths.length === 0) {
    throw new DiscoveryError(
      `No supported agent instruction files found under ${target}`,
    );
  }
  return Promise.all(paths.map((filePath) => readDocument(filePath, absoluteTarget)));
}

async function walk(
  directory: string,
  root: string,
  ignorePatterns: string[],
  results: string[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    const matchPath = entry.isDirectory() ? `${relativePath}/` : relativePath;
    if (isIgnored(matchPath, ignorePatterns)) continue;

    if (entry.isDirectory()) {
      await walk(absolutePath, root, ignorePatterns, results);
    } else if (entry.isFile() && isSupportedPath(relativePath)) {
      results.push(absolutePath);
    }
  }
}

function isSupportedPath(relativePath: string): boolean {
  const fileName = path.posix.basename(relativePath);
  return (
    exactNames.has(fileName) ||
    /^\.cursor\/rules\/.+\.mdc$/u.test(relativePath) ||
    /^\.github\/instructions\/.+\.instructions\.md$/u.test(relativePath) ||
    relativePath === '.github/copilot-instructions.md'
  );
}

function isIgnored(relativePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const normalized = pattern.replaceAll('\\', '/').replace(/^\.\//u, '');
    return (
      minimatch(relativePath, normalized, { dot: true, matchBase: false }) ||
      minimatch(relativePath.replace(/\/$/u, ''), normalized, {
        dot: true,
        matchBase: false,
      })
    );
  });
}

async function readDocument(filePath: string, root: string): Promise<ParsedDocument> {
  const fileStats = await stat(filePath);
  if (fileStats.size > maxDocumentBytes) {
    throw new DiscoveryError(
      `Instruction file exceeds the 2 MiB static-analysis limit: ${filePath}`,
    );
  }
  const content = await readFile(filePath, 'utf8');
  return parseDocument(filePath, content, root);
}

async function ensureReadable(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new DiscoveryError(`Target does not exist or is not readable: ${filePath}`);
  }
}
