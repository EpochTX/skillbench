import type { Issue, Rule, Severity } from '../../core/types.js';
import {
  lineHasConfirmation,
  lineHasProhibition,
  normalizeDashes,
  redactSecretValue,
  truncate,
} from '../../utils/text.js';
import { issue } from '../types.js';

interface DangerousPattern {
  label: string;
  pattern: RegExp;
  severity: Severity;
}

const dangerousShellPatterns: DangerousPattern[] = [
  {
    label: 'recursive deletion',
    pattern: /\brm\s+-[^\n]*r[^\n]*f\b/iu,
    severity: 'error',
  },
  { label: 'privileged deletion', pattern: /\bsudo\s+rm\b/iu, severity: 'critical' },
  {
    label: 'filesystem formatting',
    pattern: /\bmkfs(?:\.[a-z0-9]+)?\b/iu,
    severity: 'critical',
  },
  { label: 'raw disk write', pattern: /\bdd\s+if\s*=/iu, severity: 'critical' },
  {
    label: 'world-writable permissions',
    pattern: /\bchmod\s+-R\s+777\b/iu,
    severity: 'error',
  },
  {
    label: 'download piped to shell',
    pattern: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/iu,
    severity: 'error',
  },
];

export const dangerousShellRule: Rule = {
  id: 'SB100',
  name: 'Dangerous shell operation',
  description:
    'Detects destructive shell primitives and grades them using surrounding prohibition or execution context.',
  category: 'safety',
  defaultSeverity: 'error',
  weight: 1.1,
  check(context) {
    const findings: Issue[] = [];
    context.document.lines.forEach((originalLine, index) => {
      const line = normalizeDashes(originalLine);
      for (const entry of dangerousShellPatterns) {
        if (!entry.pattern.test(line)) continue;
        const prohibited = lineHasProhibition(line);
        const rootDeletion =
          /\brm\s+-[^\n]*r[^\n]*f[^\n]*(?:\s\/\s*$|--no-preserve-root)/iu.test(line);
        findings.push(
          issue(this, context, {
            message: `${entry.label[0]?.toUpperCase() ?? ''}${entry.label.slice(1)} appears in an instruction.`,
            severity: prohibited ? 'info' : rootDeletion ? 'critical' : entry.severity,
            line: index + 1,
            evidence: truncate(originalLine),
            suggestion: prohibited
              ? 'Keep defensive examples clearly marked as commands that must never run.'
              : 'Constrain the target, require confirmation, and prefer a reversible operation.',
          }),
        );
      }
    });
    return findings;
  },
};

interface SecretPattern {
  label: string;
  pattern: RegExp;
  valueGroup?: number;
}

const secretPatterns: SecretPattern[] = [
  {
    label: 'OpenAI API key',
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b/gu,
  },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/gu },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/gu },
  {
    label: 'assigned credential',
    pattern:
      /\b(?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|client[_ -]?secret)\b\s*[:=]\s*["']?([A-Za-z0-9_./+=-]{20,})/giu,
    valueGroup: 1,
  },
];

export const potentialSecretRule: Rule = {
  id: 'SB101',
  name: 'Potential embedded secret',
  description:
    'Detects common credential formats and always redacts matched values from reports.',
  category: 'safety',
  defaultSeverity: 'critical',
  weight: 1.25,
  check(context) {
    const findings: Issue[] = [];
    context.document.lines.forEach((line, index) => {
      for (const entry of secretPatterns) {
        for (const match of line.matchAll(entry.pattern)) {
          const value = match[entry.valueGroup ?? 0] ?? '';
          if (/^(?:YOUR|EXAMPLE|PLACEHOLDER|REDACTED)[_-]/iu.test(value)) continue;
          findings.push(
            issue(this, context, {
              message: `${entry.label} may be embedded in the instruction.`,
              line: index + 1,
              evidence: redactSecretValue(value),
              suggestion:
                'Remove the value, revoke it if real, and refer to a secret manager or environment variable instead.',
            }),
          );
        }
      }
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(line)) {
        findings.push(
          issue(this, context, {
            message: 'A private-key block may be embedded in the instruction.',
            line: index + 1,
            evidence: '<redacted-private-key>',
            suggestion:
              'Remove and rotate the key. Never place credential material in agent instructions.',
          }),
        );
      }
    });
    return findings;
  },
};

const credentialPathPattern =
  /(?:^|[\s"'`])(?:\.env(?:\.[\w.-]+)?|~\/\.ssh(?:\/|\b)|~\/\.aws(?:\/|\b)|~\/\.config(?:\/|\b)|(?:browser\s+)?cookies?(?:\s|$)|credentials?(?:\.json)?(?:\s|$))/iu;
const accessVerbPattern =
  /\b(?:read|open|load|cat|inspect|access|search|scan|copy|upload|collect|exfiltrate)\b|(?:读取|打开|加载|查看|访问|搜索|扫描|复制|上传|收集)/iu;

export const credentialAccessRule: Rule = {
  id: 'SB102',
  name: 'Credential file access',
  description:
    'Detects instructions that direct an agent to read environment files, SSH/AWS configuration, credentials, or browser cookies.',
  category: 'safety',
  defaultSeverity: 'error',
  weight: 1,
  check(context) {
    return context.document.lines.flatMap((line, index) => {
      if (!credentialPathPattern.test(line) || !accessVerbPattern.test(line)) return [];
      const defensive = lineHasProhibition(line);
      return [
        issue(this, context, {
          message: defensive
            ? 'A credential path is referenced in a defensive instruction.'
            : 'The agent is instructed to access a credential-bearing path.',
          severity: defensive ? 'info' : 'error',
          line: index + 1,
          evidence: truncate(line),
          suggestion: defensive
            ? 'Keep the prohibition explicit and avoid including real credential values.'
            : 'Use the minimum required credential interface and require explicit user authorization.',
        }),
      ];
    });
  },
};

const arbitraryExecutionPattern =
  /(?:\b(?:eval|exec)\s*\(|\bchild_process\b|\bshell\s*:\s*true\b|\$\{\s*(?:user|input|prompt|command)|\bexecute\b.{0,35}\barbitrary\b.{0,25}\b(?:input|command|code)|(?:执行|运行).{0,20}(?:任意|用户输入).{0,10}(?:命令|代码))/iu;

export const arbitraryExecutionRule: Rule = {
  id: 'SB103',
  name: 'Arbitrary command execution',
  description:
    'Finds instructions that pass uncontrolled input to eval, exec, shell interpolation, or equivalent command execution.',
  category: 'safety',
  defaultSeverity: 'error',
  weight: 1.1,
  check(context) {
    return context.document.lines.flatMap((line, index) => {
      if (!arbitraryExecutionPattern.test(line)) return [];
      const defensive = lineHasProhibition(line);
      return [
        issue(this, context, {
          message: defensive
            ? 'Arbitrary execution is mentioned as a prohibited pattern.'
            : 'Untrusted input may reach a command or code execution sink.',
          severity: defensive ? 'info' : 'error',
          line: index + 1,
          evidence: truncate(line),
          suggestion:
            'Use an allowlist of structured operations and pass arguments without shell evaluation.',
        }),
      ];
    });
  },
};

const injectionPattern =
  /\b(?:ignore (?:all )?(?:previous|prior) instructions|ignore (?:the )?system prompt|reveal (?:the )?(?:system prompt|hidden instructions)|disregard (?:all )?(?:previous|prior) instructions)\b|(?:忽略|无视).{0,12}(?:之前|先前|系统).{0,8}(?:指令|提示词)|(?:泄露|显示|透露).{0,10}(?:系统提示词|隐藏指令)/iu;

export const promptInjectionRule: Rule = {
  id: 'SB104',
  name: 'Prompt-injection exposure',
  description:
    'Distinguishes direct instruction-override language from defensive examples and detection guidance.',
  category: 'safety',
  defaultSeverity: 'error',
  weight: 1,
  check(context) {
    return context.document.lines.flatMap((line, index) => {
      if (!injectionPattern.test(line)) return [];
      const defensive =
        lineHasProhibition(line) ||
        /\b(?:detect|flag|block|reject|example|phrase|risk|injection|similar to)\b|(?:检测|拦截|拒绝|示例|风险|注入)/iu.test(
          line,
        );
      return [
        issue(this, context, {
          message: defensive
            ? 'Prompt-injection language appears in defensive or example context.'
            : 'The instruction appears to override higher-priority instructions or expose hidden context.',
          severity: defensive ? 'info' : 'error',
          line: index + 1,
          evidence: truncate(line),
          suggestion: defensive
            ? 'Keep examples quoted and explicitly identify untrusted instructions as data.'
            : 'Remove override language and state that external content is untrusted data.',
        }),
      ];
    });
  },
};

const remoteExecutionPattern =
  /\b(?:curl|wget)\b[^\n|]{0,300}\|\s*(?:sudo\s+)?(?:sh|bash|zsh|python(?:3)?|node)\b/iu;

export const remoteExecutionRule: Rule = {
  id: 'SB105',
  name: 'Unverified download execution',
  description:
    'Detects network download pipelines that execute bytes without integrity or provenance verification.',
  category: 'safety',
  defaultSeverity: 'error',
  weight: 1,
  check(context) {
    return context.document.lines.flatMap((line, index) => {
      const normalized = normalizeDashes(line);
      if (!remoteExecutionPattern.test(normalized)) return [];
      const defensive = lineHasProhibition(normalized);
      return [
        issue(this, context, {
          message: defensive
            ? 'Download-and-execute is shown as a prohibited pattern.'
            : 'Downloaded content is piped directly into an interpreter.',
          severity: defensive ? 'info' : 'error',
          line: index + 1,
          evidence: truncate(line),
          suggestion:
            'Download separately, pin a version, verify its checksum or signature, then execute explicitly.',
        }),
      ];
    });
  },
};

const destructivePatterns = [
  /\bgit\s+push\b[^\n]*\s--force(?:-with-lease)?\b/iu,
  /\bgit\s+reset\s+--hard\b/iu,
  /\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b/u,
  /\bDELETE\b.{0,40}\bproduction\b/iu,
  /\b(?:delete|destroy|remove)\b.{0,40}\bproduction\b.{0,30}\b(?:resource|database|cluster|deployment|data)\b/iu,
  /(?:删除|销毁).{0,20}(?:生产|线上).{0,20}(?:资源|数据库|数据|集群)/u,
];

export const unconfirmedDestructiveRule: Rule = {
  id: 'SB106',
  name: 'Unconfirmed destructive action',
  description:
    'Detects force pushes, hard resets, destructive database statements, and production deletion without an explicit confirmation gate.',
  category: 'safety',
  defaultSeverity: 'critical',
  weight: 1.25,
  check(context) {
    return context.document.lines.flatMap((line, index) => {
      const normalized = normalizeDashes(line);
      if (!destructivePatterns.some((pattern) => pattern.test(normalized))) return [];
      const surrounding = context.document.lines
        .slice(Math.max(0, index - 1), index + 2)
        .join(' ');
      const defensive = lineHasProhibition(normalized);
      const confirmed = lineHasConfirmation(surrounding);
      return [
        issue(this, context, {
          message: defensive
            ? 'A destructive action is explicitly prohibited.'
            : confirmed
              ? 'A destructive action is gated by confirmation but remains high risk.'
              : 'A destructive action can run without an explicit confirmation gate.',
          severity: defensive ? 'info' : confirmed ? 'warning' : 'critical',
          line: index + 1,
          evidence: truncate(line),
          suggestion:
            'Require explicit confirmation, resolve the exact target, and prefer a recoverable alternative.',
        }),
      ];
    });
  },
};

export const safetyRules = [
  dangerousShellRule,
  potentialSecretRule,
  credentialAccessRule,
  arbitraryExecutionRule,
  promptInjectionRule,
  remoteExecutionRule,
  unconfirmedDestructiveRule,
] satisfies Rule[];
