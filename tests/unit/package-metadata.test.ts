import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const packageJson = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8'),
) as {
  bin: Record<string, string>;
  engines: Record<string, string>;
  files: string[];
  packageManager: string;
  repository: { url: string };
  scripts: Record<string, string>;
};

describe('package metadata', () => {
  it('ships documentation assets referenced by the npm README', () => {
    const requiredFiles = [
      'README_EN.md',
      'CONTRIBUTING.md',
      'SECURITY.md',
      'assets/logo.svg',
      'docs/demo.svg',
    ];

    expect(packageJson.files).toEqual(expect.arrayContaining(requiredFiles));
    for (const file of requiredFiles) {
      expect(existsSync(path.join(root, file)), `${file} should exist`).toBe(true);
    }
  });

  it('keeps release metadata and built-CLI verification aligned', () => {
    expect(packageJson.bin.skillbench).toBe('dist/cli.js');
    expect(packageJson.engines.node).toBe('>=20');
    expect(packageJson.packageManager).toBe('pnpm@10.34.5');
    expect(packageJson.repository.url).toBe(
      'git+https://github.com/EpochTX/skillbench.git',
    );
    expect(packageJson.scripts['test:dist']).toContain('dist/cli.js');
    expect(packageJson.scripts.prepublishOnly).toContain('pnpm test');
  });

  it('does not advertise the unpublished npm command in the terminal demo', () => {
    const demo = readFileSync(path.join(root, 'docs/demo.svg'), 'utf8');
    expect(demo).toContain('node dist/cli.js scan SKILL.md');
    expect(demo).not.toContain('npx skillbench-ai');
  });
});
