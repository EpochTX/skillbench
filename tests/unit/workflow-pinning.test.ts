import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const workflowsDirectory = path.join(root, '.github', 'workflows');

function workflowFiles(): string[] {
  return readdirSync(workflowsDirectory)
    .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
    .sort();
}

describe('all GitHub workflows', () => {
  it('pins every action reference to a full immutable commit SHA', () => {
    const files = workflowFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(path.join(workflowsDirectory, file), 'utf8');
      const references = [...content.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/gu)].map(
        (match) => match[1] ?? '',
      );
      expect(references.length, `${file} should use at least one pinned action`).toBeGreaterThan(
        0,
      );
      for (const reference of references) {
        expect(reference, `${file} contains an unpinned action`).toMatch(/^[0-9a-f]{40}$/u);
      }
    }
  });

  it('disables checkout credential persistence in every workflow checkout step', () => {
    for (const file of workflowFiles()) {
      const content = readFileSync(path.join(workflowsDirectory, file), 'utf8');
      const checkoutCount = [...content.matchAll(/uses:\s+actions\/checkout@/gu)].length;
      const disabledCount = [...content.matchAll(/persist-credentials:\s+false/gu)].length;
      expect(disabledCount, `${file} must disable checkout credential persistence`).toBe(
        checkoutCount,
      );
    }
  });
});
