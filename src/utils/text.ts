const cjkPattern =
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/u;

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[“”‘’`*_>#|~-]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function normalizeDashes(value: string): string {
  return value.replace(/[‐‑‒–—―−]/gu, '-');
}

export function lexicalUnits(value: string): string[] {
  const normalized = normalizeText(value);
  const units: string[] = [];
  let latinBuffer = '';

  for (const character of normalized) {
    if (cjkPattern.test(character)) {
      if (latinBuffer.trim()) units.push(...latinBuffer.trim().split(/\s+/u));
      latinBuffer = '';
      units.push(character);
    } else {
      latinBuffer += character;
    }
  }

  if (latinBuffer.trim()) units.push(...latinBuffer.trim().split(/\s+/u));
  return units.filter(Boolean);
}

export function ngrams(value: string, size = 3): Set<string> {
  const normalized = normalizeText(value).replace(/\s+/gu, ' ');
  if (normalized.length <= size) return new Set([normalized]);
  const result = new Set<string>();
  for (let index = 0; index <= normalized.length - size; index += 1) {
    result.add(normalized.slice(index, index + size));
  }
  return result;
}

export function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function truncate(value: string, limit = 100): string {
  const oneLine = value.replace(/\s+/gu, ' ').trim();
  return oneLine.length <= limit ? oneLine : `${oneLine.slice(0, limit - 1)}…`;
}

export function lineHasProhibition(value: string): boolean {
  return /\b(?:do not|don't|never|must not|avoid|forbid(?:den)?)\b|(?:不要|不得|禁止|切勿)/iu.test(
    value,
  );
}

export function lineHasConfirmation(value: string): boolean {
  return /\b(?:confirm|confirmation|approval|consent|ask (?:the )?user)\b|(?:确认|批准|同意|询问用户)/iu.test(
    value,
  );
}

export function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

export function redactPotentialSecrets(value: string): string {
  return value
    .replace(/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b/gu, redactSecretValue)
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,})\b/gu, redactSecretValue)
    .replace(/\bAKIA[0-9A-Z]{16}\b/gu, redactSecretValue)
    .replace(
      /(\b(?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|client[_ -]?secret)\b\s*[:=]\s*["']?)([A-Za-z0-9_./+=-]{20,})/giu,
      (_match, prefix: string, secret: string) =>
        `${prefix}${redactSecretValue(secret)}`,
    )
    .replace(
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
      '<redacted-private-key>',
    );
}

export function redactSecretValue(value: string): string {
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(value)) {
    return '<redacted-private-key>';
  }
  if (value.length <= 10) return '<redacted-secret>';
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
}
