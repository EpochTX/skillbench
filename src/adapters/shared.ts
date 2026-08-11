import type {
  CompatibilityReason,
  CompatibilityResult,
  ParsedDocument,
} from '../core/types.js';

const standardSkillFields = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);

export function portableSkillResult(
  document: ParsedDocument,
  agentId: string,
  agentName: string,
  acceptedExtensions: ReadonlySet<string> = new Set(),
): CompatibilityResult {
  const metadata = document.frontmatter;
  const reasons: CompatibilityReason[] = [];
  if (!metadata) {
    reasons.push({
      code: 'SKILL_FRONTMATTER_MISSING',
      message: 'SKILL.md requires YAML frontmatter for reliable discovery.',
      path: document.relativePath,
    });
  } else {
    if (typeof metadata.name !== 'string' || typeof metadata.description !== 'string') {
      reasons.push({
        code: 'SKILL_REQUIRED_METADATA',
        message:
          'Portable Skill discovery requires string name and description fields.',
        path: document.relativePath,
      });
    }
    const unsupportedFields = Object.keys(metadata).filter(
      (field) => !standardSkillFields.has(field) && !acceptedExtensions.has(field),
    );
    if (unsupportedFields.length > 0) {
      reasons.push({
        code: 'SKILL_VENDOR_EXTENSION',
        message: `Vendor-specific fields may be ignored: ${unsupportedFields.join(', ')}.`,
        path: document.relativePath,
      });
    }
  }

  return {
    agentId,
    agentName,
    status: reasons.length === 0 ? 'SUPPORTED' : 'PARTIAL',
    confidence: 'high',
    reasons:
      reasons.length === 0
        ? [
            {
              code: 'AGENT_SKILLS_STANDARD',
              message: 'Uses the portable Agent Skills SKILL.md format.',
              path: document.relativePath,
            },
          ]
        : reasons,
  };
}

export function result(
  document: ParsedDocument,
  agentId: string,
  agentName: string,
  status: CompatibilityResult['status'],
  code: string,
  message: string,
  confidence: CompatibilityResult['confidence'] = 'high',
): CompatibilityResult {
  return {
    agentId,
    agentName,
    status,
    confidence,
    reasons: [{ code, message, path: document.relativePath }],
  };
}
