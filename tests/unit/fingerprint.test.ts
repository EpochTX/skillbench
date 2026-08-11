import { describe, expect, it } from 'vitest';

import { issueFingerprint, issueIdentity } from '../../src/core/fingerprint.js';
import type { Issue } from '../../src/core/types.js';

const issue: Issue = {
  ruleId: 'SB102',
  ruleName: 'Credential-bearing path access',
  category: 'safety',
  severity: 'error',
  message: 'Credential path access.',
  description: 'Detects credential-bearing path access.',
  path: 'nested\\SKILL.md',
  line: 8,
};

describe('issue fingerprinting', () => {
  it('normalizes path separators and ignores source line movement', () => {
    const moved = { ...issue, path: 'nested/SKILL.md', line: 80 };

    expect(issueIdentity(moved)).toBe(issueIdentity(issue));
    expect(issueFingerprint(moved)).toBe(issueFingerprint(issue));
  });

  it('keeps identity stable when configuration changes severity', () => {
    const overridden = { ...issue, severity: 'critical' as const };

    expect(issueIdentity(overridden)).toBe(issueIdentity(issue));
    expect(issueFingerprint(overridden)).toBe(issueFingerprint(issue));
  });
});
