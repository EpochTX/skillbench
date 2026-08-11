import type { Issue, Severity } from '../core/types.js';
import { issueFingerprint } from '../core/fingerprint.js';
import { builtInRules } from '../rules/registry.js';
import { PROJECT_URL } from '../version.js';
import type { AnalysisReport } from '../core/types.js';
import type { Reporter } from './types.js';

export class SarifReporter implements Reporter {
  readonly id = 'sarif';

  render(report: AnalysisReport): string {
    const ruleIndex = new Map(builtInRules.map((rule, index) => [rule.id, index]));
    const sarif = {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'SkillBench',
              fullName: 'SkillBench AI Agent Skill linter',
              version: report.tool.version,
              informationUri: PROJECT_URL,
              rules: builtInRules.map((rule) => ({
                id: rule.id,
                name: rule.name,
                shortDescription: { text: rule.description },
                helpUri: `${PROJECT_URL}#rules`,
                defaultConfiguration: { level: sarifLevel(rule.defaultSeverity) },
                properties: {
                  category: rule.category,
                  defaultSeverity: rule.defaultSeverity,
                  weight: rule.weight,
                },
              })),
            },
          },
          results: report.issues.map((issue) => ({
            ruleId: issue.ruleId,
            ...(ruleIndex.has(issue.ruleId)
              ? { ruleIndex: ruleIndex.get(issue.ruleId) }
              : {}),
            level: sarifLevel(issue.severity),
            message: { text: resultMessage(issue) },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: artifactUri(issue.path) },
                  ...(issue.line
                    ? {
                        region: {
                          startLine: issue.line,
                          ...(issue.endLine ? { endLine: issue.endLine } : {}),
                        },
                      }
                    : {}),
                },
              },
            ],
            partialFingerprints: {
              skillbenchIssueFingerprint: issueFingerprint(issue),
            },
            properties: {
              category: issue.category,
              severity: issue.severity,
              ...(issue.evidence ? { evidence: issue.evidence } : {}),
              ...(issue.suggestion ? { suggestion: issue.suggestion } : {}),
            },
          })),
          properties: {
            skillbenchScore: report.score.overall,
            target: report.target,
          },
        },
      ],
    };
    return JSON.stringify(sarif, null, 2);
  }
}

function sarifLevel(severity: Severity): 'none' | 'note' | 'warning' | 'error' {
  if (severity === 'critical' || severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'note';
}

function resultMessage(issue: Issue): string {
  return issue.suggestion
    ? `${issue.message} Remediation: ${issue.suggestion}`
    : issue.message;
}

function artifactUri(filePath: string): string {
  return filePath
    .replaceAll('\\', '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
