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
  <img alt="SkillBench version 0.2.0" src="https://img.shields.io/badge/version-0.2.0-blue?style=flat-square">
</p>

![SkillBench terminal demo](docs/demo.svg)

> The `skillbench-ai` npm package has not been formally published yet. Run v0.2.0 from source for now; `npx skillbench-ai` and global-install instructions will be added after publication.

## What is SkillBench?

Agent Skills, `AGENTS.md`, `CLAUDE.md`, Cursor Rules, and similar instruction files are becoming part of AI engineering projects. Unlike source code, they often lack repeatable quality checks, security rules, regression analysis, CI gates, and machine-readable reports.

SkillBench provides deterministic local static analysis for these files:

- **Quality checks:** detect unclear scope, vague wording, duplication, conflicting instructions, and priority overuse.
- **Security checks:** detect credential access, prompt injection, dangerous shell patterns, arbitrary execution, and destructive Git/database operations.
- **Token efficiency:** estimate token usage, duplicated tokens, reduction opportunities, and instruction density.
- **Cross-agent compatibility:** evaluate instructions for OpenAI Codex, Claude Code, Cursor, Gemini CLI, and GitHub Copilot.
- **Explainable scoring:** every deduction is tied to a rule ID, severity, and reason.
- **Regression analysis:** compare two revisions and separate introduced, resolved, and unchanged findings.
- **CI / SARIF:** emit JSON, SARIF 2.1.0, GitHub Actions annotations, and stable exit codes.

The default analyzer runs locally, **never executes scanned instructions, and does not send source text to a network service**.

## Quick start

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

After npm publication, the package name will be `skillbench-ai` and the installed executable will remain `skillbench`.

## Discovered files

Directory scans automatically discover:

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

SkillBench supports Linux, macOS, and Windows on Node.js 20 or newer.

## CLI

| Command                               | Purpose                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `skillbench scan [target]`            | Full score, issue, token, and compatibility analysis          |
| `skillbench score [target]`           | Overall and per-category scores                               |
| `skillbench lint [target]`            | Rule findings with locations and remediation                  |
| `skillbench security [target]`        | Security-focused findings                                     |
| `skillbench token [target]`           | Token estimate, duplication, savings, and density             |
| `skillbench compat [target]`          | Five-agent compatibility analysis                             |
| `skillbench compare <before> <after>` | Score, token, issue, and compatibility regression comparison  |
| `skillbench diff <before> <after>`    | Alias of `compare`                                            |
| `skillbench rules [ruleId]`           | List rules or inspect one rule                                |
| `skillbench fix [target] --dry-run`   | Show remediation suggestions; v0.2 does not modify the target |
| `skillbench init [directory]`         | Create `.skillbench.yml`                                      |
| `skillbench badge [target]`           | Generate a shields.io Markdown badge                          |

Analysis commands support `terminal`, `json`, `sarif`, and `github` output formats.

```bash
skillbench scan . --format json --output skillbench-report.json
skillbench lint . --format github --ci --fail-on error
skillbench scan . --format sarif --output skillbench.sarif
skillbench compare ./before ./after --ci --fail-on error
```

Stable exit codes:

| Code | Meaning                                                    |
| ---: | ---------------------------------------------------------- |
|  `0` | Analysis completed and the CI threshold was not reached    |
|  `1` | The configured `--ci` severity threshold was reached       |
|  `2` | Invalid arguments, configuration, target, or parse failure |

`--fail-on` accepts `warning`, `error`, or `critical`.

## Scoring

The default score is a weighted combination of five categories:

| Category            | Weight | What it measures                                                                |
| ------------------- | -----: | ------------------------------------------------------------------------------- |
| Instruction quality |    30% | Scope, clarity, contradictions, vague language, priority hierarchy              |
| Safety              |    25% | Destructive actions, secrets, credential access, injection, arbitrary execution |
| Token efficiency    |    15% | Estimated tokens, repeated paragraphs, directive repetition, oversized examples |
| Portability         |    20% | Agent Skills metadata, native entry points, vendor extensions                   |
| Maintainability     |    10% | Document structure, section size, paragraph density, navigation                 |

Repeated findings from the same rule use diminishing deductions (`100% → 50% → 25%`) so repeated ordinary warnings do not collapse the score. Critical safety findings apply explicit overall caps: one or two cap the score at `59.9`; three or more cap it at `39.9`.

All deductions are present in the machine-readable report.

## Rules

The v0.2 recommended profile contains **24 deterministic rules**:

| Range           | Category            | Focus                                                                     |
| --------------- | ------------------- | ------------------------------------------------------------------------- |
| `SB001`–`SB007` | Instruction quality | Length, duplication, conflicts, vague language, purpose, priority markers |
| `SB100`–`SB106` | Safety              | Dangerous commands, secrets, credential paths, execution, injection       |
| `SB200`–`SB203` | Token efficiency    | Duplicate tokens, repeated directives, Markdown noise, oversized examples |
| `SB300`–`SB302` | Maintainability     | Missing structure, oversized sections, oversized paragraphs               |
| `SB400`–`SB402` | Portability         | Skill metadata, vendor-specific fields, Cursor/Copilot scope metadata     |

```bash
skillbench rules
skillbench rules SB102
```

Rules can be disabled or have their severity overridden in `.skillbench.yml`.

## Token analysis

v0.2 uses a local, language-aware token estimate. Latin text, numbers, CJK characters, and punctuation use separate approximate coefficients. It is an engineering estimate, not a claim about a specific model tokenizer.

```text
Estimated Tokens           2,841
Duplicate Tokens             318
Potential Reduction         11.2%
Instruction Density         46.8%
```

## Agent compatibility

Platform-specific behavior is isolated in adapters instead of being scattered across the parser and rule engine.

| Agent          | Portable Skill | Native instruction inputs                                    |
| -------------- | -------------- | ------------------------------------------------------------ |
| OpenAI Codex   | `SKILL.md`     | `AGENTS.md`                                                  |
| Claude Code    | `SKILL.md`     | `CLAUDE.md`                                                  |
| Cursor         | `SKILL.md`     | `AGENTS.md`, `.cursor/rules/*.mdc`; `.cursorrules` is legacy |
| Gemini CLI     | `SKILL.md`     | `GEMINI.md`                                                  |
| GitHub Copilot | `SKILL.md`     | `.github/copilot-instructions.md`, scoped `.instructions.md` |

Compatibility states are `SUPPORTED`, `PARTIAL`, `UNSUPPORTED`, and `UNKNOWN`.

## Compare / diff

`compare` and `diff` analyze two targets with the same configuration and report:

- overall and per-category score changes;
- token and file-count changes;
- introduced findings;
- resolved findings;
- unchanged finding count;
- agent compatibility changes.

```bash
skillbench compare ./baseline ./candidate
skillbench diff ./baseline ./candidate --format json
skillbench compare ./baseline ./candidate --ci --fail-on error
```

In CI mode, only **introduced findings** are evaluated against the failure threshold.

## SARIF and GitHub Actions annotations

SARIF output follows SARIF 2.1.0 and includes rule metadata, source locations, stable fingerprints, severity, category, and remediation text.

```bash
skillbench scan . --format sarif --output skillbench.sarif
```

The `github` reporter emits native `::error`, `::warning`, and `::notice` workflow commands:

```bash
skillbench lint . --format github --ci --fail-on error
```

## GitHub Actions

Until the npm package is published, CI can run SkillBench directly from source. The example below installs the tool outside the target workspace so the tool repository is not included in discovery:

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
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
        with:
          version: 10.34.5
      - uses: actions/setup-node@v6
        with:
          node-version: 20
      - name: Install SkillBench from source
        run: |
          git clone --depth 1 https://github.com/EpochTX/skillbench.git "$RUNNER_TEMP/skillbench"
          pnpm --dir "$RUNNER_TEMP/skillbench" install --frozen-lockfile
      - name: Check agent instructions
        run: pnpm --dir "$RUNNER_TEMP/skillbench" dev -- scan "$GITHUB_WORKSPACE" --ci --fail-on critical
```

SkillBench's own CI validates Node.js 20 and 22 on Ubuntu and runs tests/builds on macOS and Windows.

## Configuration

Initialize a config file:

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

Weights may use any non-negative scale and are normalized for the overall score. Unknown keys, unknown rule IDs, and invalid severities fail with a configuration error instead of being silently ignored.

## JSON report and schema

The v0.2.0 report schema version is currently `0.1`:

```json
{
  "schemaVersion": "0.1",
  "tool": { "name": "skillbench", "version": "0.2.0" },
  "target": "/repo/SKILL.md",
  "score": { "overall": 91.4, "categories": {} },
  "summary": { "info": 0, "warning": 2, "error": 0, "critical": 0 },
  "issues": [],
  "compatibility": {},
  "tokens": {},
  "files": []
}
```

Reporters are separate from the analysis core, so new output formats do not require changes to rules or scoring.

## Security model

- Static analysis only. SkillBench does not execute shell, Python, JavaScript, hooks, or scripts from scanned files.
- Input is treated as untrusted UTF-8 text and capped at 2 MiB per instruction file.
- Directory discovery does not follow symbolic links.
- Credential-like evidence passes through central redaction before output.
- Defensive examples and direct execution instructions may receive different severity when context can be determined safely.
- Source text is not sent to a network service by the default analyzer.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never include a real credential in a report.

## Architecture

| Module       | Responsibility                                                    | Extension point                   |
| ------------ | ----------------------------------------------------------------- | --------------------------------- |
| `parser/`    | Frontmatter, paragraph, section, and source-location parsing      | New text formats                  |
| `rules/`     | Deterministic findings grouped by category                        | New rules                         |
| `core/`      | Analysis, tokens, rule engine, scoring, and regression comparison | New analyzers or scoring profiles |
| `adapters/`  | Native-entry detection and compatibility reasoning                | New coding-agent adapters         |
| `reporters/` | Terminal, JSON, SARIF, GitHub annotations, and badge output       | New report formats                |
| `cli/`       | Commands, options, CI policy, and user-facing errors              | New workflows                     |

Typed public APIs are exported from `src/index.ts`.

## Project structure

```text
skillbench/
├── src/
│   ├── adapters/
│   ├── cli/
│   ├── core/
│   ├── parser/
│   ├── reporters/
│   └── rules/
├── tests/
├── examples/
├── docs/
├── assets/
├── .github/
└── .skillbench.yml
```

## Development

```bash
corepack enable
pnpm install --frozen-lockfile

pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Roadmap

- **v0.1:** static analysis, safety rules, token analysis, five-agent compatibility, CLI, JSON, CI, badges.
- **v0.2:** SARIF 2.1.0, GitHub Actions annotations, `compare` / `diff`, rule introspection, report file output.
- **v0.3:** opt-in safe auto-fix, sandboxed execution benchmarks, optional LLM judge, Skill regression tests.
- **v0.4:** SkillBench Registry, public leaderboard, shareable hosted reports.

Planned commands include `skillbench test` and corpus-level `benchmark`. Execution benchmarks will run only inside an explicit sandbox.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Before opening a pull request, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

[MIT](LICENSE) © SkillBench contributors.
