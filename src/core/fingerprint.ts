import { createHash } from 'node:crypto';

import type { Issue } from './types.js';

export function issueIdentity(issue: Issue): string {
  return [
    issue.ruleId,
    normalizePath(issue.path),
    issue.severity,
    issue.message.trim(),
  ].join('|');
}

export function issueFingerprint(issue: Issue): string {
  return createHash('sha256').update(issueIdentity(issue)).digest('hex').slice(0, 32);
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}
