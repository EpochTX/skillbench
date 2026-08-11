import { readFileSync } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const actionReferencePaths = [
  '.github/workflows/ci.yml',
  'examples/github-actions/skillbench-sarif.yml',
  'README.md',
  'README_EN.md',
];

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('workflow supply-chain policy', () => {
  it('pins every third-party action in workflows and copy-paste examples', () => {
    for (const filePath of actionReferencePaths) {
      const content = read(filePath);
      const references = [...content.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/gu)].map(
        (match) => match[1] ?? '',
      );

      expect(references.length, `${filePath} should use actions`).toBeGreaterThan(0);
      for (const reference of references) {
        expect(reference, `${filePath} contains an unpinned action`).toMatch(
          /^[0-9a-f]{40}$/u,
        );
      }
    }
  });

  it('does not persist checkout credentials in project CI', () => {
    const workflow = read('.github/workflows/ci.yml');
    const checkoutCount = [...workflow.matchAll(/uses:\s+actions\/checkout@/gu)].length;
    const disabledCredentialCount = [
      ...workflow.matchAll(/persist-credentials:\s+false/gu),
    ].length;

    expect(checkoutCount).toBeGreaterThan(0);
    expect(disabledCredentialCount).toBe(checkoutCount);
  });

  it('configures weekly dependency updates and preserves Node 20 majors', () => {
    const config = YAML.parse(read('.github/dependabot.yml')) as {
      version: number;
      updates: {
        'package-ecosystem': string;
        schedule: { interval: string };
        ignore?: {
          'dependency-name': string;
          'update-types': string[];
        }[];
      }[];
    };

    expect(config.version).toBe(2);
    expect(config.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'package-ecosystem': 'npm',
          schedule: { interval: 'weekly' },
          ignore: expect.arrayContaining([
            {
              'dependency-name': 'chalk',
              'update-types': ['version-update:semver-major'],
            },
            {
              'dependency-name': 'commander',
              'update-types': ['version-update:semver-major'],
            },
          ]),
        }),
        expect.objectContaining({
          'package-ecosystem': 'github-actions',
          schedule: { interval: 'weekly' },
        }),
      ]),
    );
  });
});
