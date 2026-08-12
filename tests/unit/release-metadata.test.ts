import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROJECT_URL, VERSION } from '../../src/version.js';

const root = path.resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const packageJson = JSON.parse(read('package.json')) as {
  version: string;
  repository: { url: string };
  scripts: Record<string, string>;
};

describe('release metadata', () => {
  it('keeps package and runtime versions aligned', () => {
    expect(packageJson.version).toBe(VERSION);
  });

  it('keeps user-visible version labels aligned', () => {
    const chineseReadme = read('README.md');
    const englishReadme = read('README_EN.md');
    const demo = read('docs/demo.svg');
    const changelog = read('CHANGELOG.md');

    expect(chineseReadme).toContain(`version-${VERSION}`);
    expect(englishReadme).toContain(`version-${VERSION}`);
    expect(demo).toContain(`SkillBench ${VERSION}`);
    expect(changelog).toContain(`## ${VERSION} —`);
  });

  it('keeps canonical repository and release checks configured', () => {
    expect(PROJECT_URL).toBe('https://github.com/EpochTX/skillbench');
    expect(packageJson.repository.url).toBe(`git+${PROJECT_URL}.git`);

    const releaseCheck = packageJson.scripts['release:check'] ?? '';
    expect(releaseCheck).toContain('pnpm verify');
    expect(releaseCheck).toContain('pnpm run audit:prod');
    expect(releaseCheck).toContain('pnpm run package:smoke');
    expect(releaseCheck).toContain('pnpm pack:check');

    const prepublish = packageJson.scripts.prepublishOnly ?? '';
    expect(prepublish).toContain('pnpm verify');
    expect(prepublish).toContain('pnpm run audit:prod');
  });
});
