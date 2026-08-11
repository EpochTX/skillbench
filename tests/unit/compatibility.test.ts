import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeCompatibility, builtInAdapters } from '../../src/adapters/index.js';
import { CursorAdapter } from '../../src/adapters/cursor.js';
import { discoverDocuments } from '../../src/parser/discovery.js';
import { parseDocument } from '../../src/parser/parser.js';

describe('compatibility adapters', () => {
  it('recognizes a portable standard Skill across all five adapters', () => {
    const document = parseDocument(
      '/repo/sample-skill/SKILL.md',
      `---\nname: sample-skill\ndescription: Run a focused review when a user asks for one.\n---\n\n# Review\n\nReturn findings.`,
      '/repo',
    );
    const results = analyzeCompatibility([document], builtInAdapters);
    expect(results).toHaveLength(5);
    expect(results.every((entry) => entry.status === 'SUPPORTED')).toBe(true);
  });

  it('marks legacy Cursor rules as partial, not unsupported', () => {
    const document = parseDocument(
      '/repo/.cursorrules',
      '# Rules\n\nUse TypeScript.',
      '/repo',
    );
    expect(new CursorAdapter().analyze(document).status).toBe('PARTIAL');
  });

  it('aggregates a repository with native files for every platform', async () => {
    const root = path.resolve('tests/fixtures/multiplatform-skill');
    const documents = await discoverDocuments(root);
    const results = analyzeCompatibility(documents, builtInAdapters);
    expect(results.every((entry) => entry.status === 'SUPPORTED')).toBe(true);
  });
});
