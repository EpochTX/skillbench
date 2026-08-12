<p align="right">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <img src="assets/logo.svg" width="104" alt="SkillBench logo">
</p>

<h1 align="center">SkillBench</h1>

<p align="center"><strong>The open benchmark, linter, and compatibility checker for AI Agent Skills.</strong></p>

<p align="center">
  <a href="https://github.com/EpochTX/skillbench/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/EpochTX/skillbench/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-black?style=flat-square"></a>
  <img alt="Node 20 or newer" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="SkillBench version 1.0.0" src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square">
</p>

![SkillBench terminal demo](docs/demo.svg)

SkillBench 1.0 brings Agent Skills, `AGENTS.md`, `CLAUDE.md`, Cursor Rules, and similar instruction files into a repeatable engineering quality system: static checks, security rules, token efficiency, cross-agent compatibility, regression comparison, SARIF, CI gates, auditable safe fixes, and a human-labeled rule benchmark.

> **Release-integrity guarantee:** `v1.0.0` is created only after `skillbench-ai@1.0.0` has been successfully published and verified from the npm registry. If you are viewing an untagged release candidate, use the source workflow below.

## Quick start

### npm / npx

Run without a global install:

```bash
npx --yes skillbench-ai@1.0.0 scan SKILL.md
```

Or install the CLI globally:

```bash
npm install --global skillbench-ai@1.0.0
skillbench scan SKILL.md
```

The npm package is `skillbench-ai`; the installed executable is `skillbench`.

### Run from source

```bash
git clone https://github.com/EpochTX/skillbench.git
cd skillbench

corepack enable
pnpm install --frozen-lockfile
pnpm build

node dist/cli.js scan SKILL.md
```

Development mode:

```bash
pnpm dev -- scan SKILL.md
```

SkillBench supports Linux, macOS, and Windows on Node.js 20 or newer.

## Why SkillBench?

Agent instructions are becoming part of source repositories, but ordinary Markdown review does not reliably answer questions such as:

- Are instructions vague, duplicated, contradictory, or abusing priority language?
- Do they direct an agent toward credentials, dangerous shell commands, remote scripts, or destructive operations?
- Are instructions unnecessarily large or repetitive in token terms?
- Can the same instructions move between Codex, Claude Code, Cursor, Gemini CLI, and GitHub Copilot?
- Which findings are actually new after a change?
- Can an automatic edit be proven deterministic, safe, idempotent, and suitable for a real repository?

The default analyzer runs locally, **never executes scanned instructions, and does not send source text to a network service**.

## Core capabilities

- **24 deterministic rules** across instruction quality, safety, token efficiency, maintainability, and portability.
- **Explainable scoring** where every deduction has a rule ID, severity, and reason.
- **Security analysis** for dangerous commands, credential paths, secrets, prompt injection, arbitrary execution, and destructive Git/database behavior.
- **Token analysis** for estimated tokens, duplicate tokens, reduction opportunities, and instruction density.
- **Five-agent compatibility** for OpenAI Codex, Claude Code, Cursor, Gemini CLI, and GitHub Copilot.
- **Safe auto-fix** that is read-only by default and writes only after explicit `--write` opt-in.
- **Regression comparison** that separates introduced, resolved, and unchanged findings and preserves severity escalation.
- **Machine reports** in Terminal, JSON, SARIF 2.1.0, and GitHub Actions annotation formats.
- **Rule benchmark** with human-labeled case × rule TP/FP/FN, precision, recall, and coverage metrics.

## CLI

| Command                               | Purpose                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `skillbench scan [target]`            | Full score, issue, token, and compatibility analysis         |
| `skillbench score [target]`           | Overall and per-category scores                              |
| `skillbench lint [target]`            | Rule findings with locations and remediation                 |
| `skillbench security [target]`        | Security-focused findings                                    |
| `skillbench token [target]`           | Token estimate, duplication, savings, and density            |
| `skillbench compat [target]`          | Five-agent compatibility analysis                            |
| `skillbench compare <before> <after>` | Score, token, issue, and compatibility regression comparison |
| `skillbench diff <before> <after>`    | Alias of `compare`                                           |
| `skillbench rules [ruleId]`           | List rules or inspect one rule                               |
| `skillbench fix [target]`             | Read-only safe-fix preview                                   |
| `skillbench fix [target] --write`     | Explicitly apply deterministic SAFE fixes                    |
| `skillbench benchmark <manifest>`     | Run the human-labeled rule benchmark                         |
| `skillbench init [directory]`         | Create `.skillbench.yml`; missing directories are created    |
| `skillbench badge [target]`           | Generate a shields.io Markdown badge                         |

Common examples:

```bash
# JSON report
skillbench scan . --format json --output skillbench-report.json

# SARIF 2.1.0
skillbench scan . --format sarif --output skillbench.sarif

# Native GitHub Actions annotations
skillbench lint . --format github --ci --fail-on error

# Fail only on introduced regressions
skillbench compare ./baseline ./candidate --ci --fail-on error

# Preview only; never writes by default
skillbench fix .

# Explicit write with non-overwriting backups
skillbench fix . --write --backup
```

Stable exit codes:

| Code | Meaning                                                           |
| ---: | ----------------------------------------------------------------- |
|  `0` | Command completed and its CI failure condition was not met        |
|  `1` | Analysis/comparison/benchmark threshold failed                    |
|  `2` | Invalid arguments, configuration, target, parse, or runtime error |

## Discovery

Directory scans automatically discover common agent-instruction inputs:

```text
SKILL.md
AGENTS.md
CLAUDE.md
GEMINI.md
.cursorrules
.cursor/rules/**/*.mdc
.github/copilot-instructions.md
.github/instructions/**/*.instructions.md
```

Inputs are treated as untrusted UTF-8 text, capped at 2 MiB per instruction file, and directory discovery does not follow symbolic links.

## Scoring and rules

The recommended profile contains **24 deterministic rules**:

| Range           | Category            | Focus                                                                     |
| --------------- | ------------------- | ------------------------------------------------------------------------- |
| `SB001`–`SB007` | Instruction quality | Length, duplication, conflicts, vague language, purpose, priority markers |
| `SB100`–`SB106` | Safety              | Dangerous commands, secrets, credential paths, execution, injection       |
| `SB200`–`SB203` | Token efficiency    | Duplicate tokens, repeated directives, Markdown noise, oversized examples |
| `SB300`–`SB302` | Maintainability     | Missing structure, oversized sections, oversized paragraphs               |
| `SB400`–`SB402` | Portability         | Skill metadata, vendor fields, Cursor/Copilot scope metadata              |

Default score weights are 30% instruction quality, 25% safety, 15% token efficiency, 20% portability, and 10% maintainability. Repeated findings use diminishing deductions; critical safety findings apply explicit overall-score caps.

```bash
skillbench rules
skillbench rules SB102
```

## Rule benchmark: the 1.0 quality gate

The repository maintains a human-labeled case × rule corpus. Labels are never regenerated from current analyzer output. The 1.0 release baseline is:

- **17 cases**
- **24/24 built-in rules covered**
- **TP 24 · FP 0 · FN 0**
- **Precision 100%**
- **Recall 100%**
- **Rule coverage 100%**

```bash
pnpm benchmark:rules
# or
skillbench benchmark tests/corpus/rules.yml --ci
```

Security-sensitive rules also have defensive/negative context regression tests so documentation such as “do not run this dangerous command” is not silently escalated into a high-severity direct instruction.

## Safe auto-fix

`skillbench fix` is **always read-only by default**. The current automatic writer deliberately supports only removal of exact duplicated plain-prose paragraphs associated with `SB003`. Near-duplicates, lists, tables, fenced code, structural Markdown, and security-sensitive remediation remain review-only.

Write protections include:

- explicit `--write` opt-in;
- SHA-256 source hashes and stale-plan rejection;
- symlink/non-regular-file rejection;
- same-directory staging plus rename-based replacement;
- non-overwriting `--backup` preflight for every target;
- CRLF/LF and relevant permission-bit preservation;
- best-effort rollback across multi-file failures with recovery material retained when rollback cannot complete.

This is **per-file atomic replacement plus best-effort multi-file rollback**, not a claim of filesystem-wide transactions.

## Agent compatibility

| Agent          | Portable Skill | Native instruction inputs                                    |
| -------------- | -------------- | ------------------------------------------------------------ |
| OpenAI Codex   | `SKILL.md`     | `AGENTS.md`                                                  |
| Claude Code    | `SKILL.md`     | `CLAUDE.md`                                                  |
| Cursor         | `SKILL.md`     | `AGENTS.md`, `.cursor/rules/*.mdc`; `.cursorrules` is legacy |
| Gemini CLI     | `SKILL.md`     | `GEMINI.md`                                                  |
| GitHub Copilot | `SKILL.md`     | `.github/copilot-instructions.md`, scoped `.instructions.md` |

Compatibility states are `SUPPORTED`, `PARTIAL`, `UNSUPPORTED`, and `UNKNOWN`.

## Configuration

```bash
skillbench init
```

Example `.skillbench.yml`:

```yaml
extends: recommended

rules:
  SB002: off
  SB100: warning

score:
  instruction: 30
  safety: 25
  efficiency: 15
  portability: 20
  maintainability: 10

ignore:
  - examples/**
  - vendor/**
```

Unknown keys, unknown rule IDs, and invalid severities fail explicitly rather than being silently ignored.

## JSON / SARIF / API stability

SkillBench 1.0.0 keeps JSON report `schemaVersion` at `0.1`; tool version and report schema version are separate compatibility dimensions.

```json
{
  "schemaVersion": "0.1",
  "tool": { "name": "skillbench", "version": "1.0.0" },
  "target": "/repo/SKILL.md",
  "score": { "overall": 91.4, "categories": {} },
  "summary": { "info": 0, "warning": 2, "error": 0, "critical": 0 },
  "issues": [],
  "compatibility": {},
  "tokens": {},
  "files": []
}
```

SARIF follows SARIF 2.1.0 and includes stable fingerprints, rule metadata, locations, severity, and remediation. The supported package-root TypeScript API and 1.x SemVer contract are documented in [docs/API.md](docs/API.md).

## GitHub Actions

After the 1.0 registry release, pin the npm version in CI:

```yaml
name: SkillBench

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  skillbench:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 20
          package-manager-cache: false
      - name: Check agent instructions
        run: npx --yes skillbench-ai@1.0.0 scan "$GITHUB_WORKSPACE" --ci --fail-on critical
```

A complete SARIF / Code Scanning example is available at [`examples/github-actions/skillbench-sarif.yml`](examples/github-actions/skillbench-sarif.yml).

## 1.0 release and supply-chain gates

The exact 1.0 candidate must pass on the same commit:

- **CI:** Node 20/22, macOS, Windows, including the production `dist/cli.js` contract;
- **Package Integrity:** real `.tgz` install in a clean consumer, ESM import, d.ts compile, installed bin, and scan;
- **Production audit:** known high/critical production dependency advisories block release;
- **Performance Guard:** deterministic 120-file repository-scale workload;
- **Publish preflight:** Node 24 + npm 11.18.0 running the complete `pnpm release:check` again.

The publish sequence verifies npm registry state before creating `v1.0.0` or the GitHub Release, preventing a failed npm publication from being presented as a completed release. See [docs/1.0-RELEASE-CRITERIA.md](docs/1.0-RELEASE-CRITERIA.md) and [RELEASING.md](RELEASING.md).

## Development

```bash
corepack enable
pnpm install --frozen-lockfile

pnpm lint
pnpm typecheck
pnpm test
pnpm benchmark:rules
pnpm build
pnpm test:dist
```

Complete release gate:

```bash
pnpm release:check
```

## Roadmap

- **v0.1:** static analysis, safety rules, token analysis, five-agent compatibility, CLI, JSON, CI, badges.
- **v0.2:** SARIF 2.1.0, GitHub Actions annotations, `compare` / `diff`, rule introspection, report file output.
- **v1.0:** stable CLI/API contracts, safe writer, 24/24 human-labeled benchmark, real package-install gate, performance baseline, production dependency audit, and a verifiable release chain.
- **1.x:** continue adding deterministic rules, agent adapters, provably safe fixers, and analysis capabilities under the compatibility promise.
- **Future exploration:** execution-style Skill benchmarks inside an explicit sandbox, optional LLM judging, and Registry/public leaderboards without weakening the deterministic 1.x default path.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE) © SkillBench contributors.
