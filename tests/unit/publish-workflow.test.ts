import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const workflow = readFileSync(
  path.join(root, '.github', 'workflows', 'publish.yml'),
  'utf8',
);

describe('publish workflow', () => {
  it('uses a read-only pull request preflight on Node 24', () => {
    expect(workflow).toContain("if: github.event_name == 'pull_request'");
    expect(workflow).toContain('node-version: 24');
    expect(workflow).toContain('package-manager-cache: false');
    expect(workflow).toContain('npm install --global npm@11.18.0');
    expect(workflow).toContain('pnpm release:check');
  });

  it('publishes only from the guarded main bootstrap or version tags', () => {
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("startsWith(github.ref, 'refs/tags/v')");
    expect(workflow).toContain("version\" != '1.0.0'");
    expect(workflow).toContain('npm publish --access public --provenance');
    expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
  });

  it('grants OIDC and release write permissions only to publish jobs', () => {
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('GH_TOKEN: ${{ github.token }}');
    expect(workflow).toContain('gh release create');
    expect(workflow).toContain('git/refs');
  });
});
