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

  it('requires an explicit authenticated retry for the validated 1.0 candidate', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain(
      'default: 365533eb2feb60467336ce1faca2df96a4ad1d78',
    );
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('EXPECTED_RELEASE_SHA: 365533eb2feb60467336ce1faca2df96a4ad1d78');
    expect(workflow).toContain('npm publish --access public --provenance');
    expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
  });

  it('keeps version-tag publishing and fail-safe release creation', () => {
    expect(workflow).toContain("startsWith(github.ref, 'refs/tags/v')");
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('GH_TOKEN: ${{ github.token }}');
    expect(workflow).toContain('gh release create');
    expect(workflow).toContain('git/refs');
    expect(workflow).toContain('Verify published package');
  });
});
