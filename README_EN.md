<p align="right">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <img src="assets/logo.svg" width="104" alt="SkillBench logo">
</p>

<h1 align="center">SkillBench</h1>

<p align="center"><strong>The open benchmark, linter and compatibility checker for AI Agent Skills.</strong></p>

<p align="center">SkillBench gives agent instructions a test suite.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/skillbench-ai"><img alt="npm" src="https://img.shields.io/npm/v/skillbench-ai?style=flat-square"></a>
  <a href="https://github.com/EpochTX/skillbench/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/EpochTX/skillbench/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-black?style=flat-square"></a>
  <img alt="Node 20 or newer" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="SkillBench score 100 out of 100" src="https://img.shields.io/badge/SkillBench-100%2F100-brightgreen?style=flat-square">
</p>

```console
$ npx skillbench-ai scan SKILL.md
```

![SkillBench terminal demo](docs/demo.svg)

> The demo score is illustrative. Every real score includes exact deductions and rule IDs.

## Why SkillBench?

Agent Skills are becoming part of the software stack. But today there is no simple answer to: Is this skill safe? Is it portable? Is it bloated? Does it work across agents? Is it actually well written?

SkillBench answers those questions in seconds with deterministic static analysis—no paid API, no hidden model judge, and no execution of the files it scans.

- **Useful:** one command checks quality, safety, token cost, portability, and maintainability.
- **Trustworthy:** every deduction points to a rule, severity, location, evidence, and remediation.
- **Shareable:** terminal, stable JSON, SARIF, GitHub Actions annotations, CI exit codes, and shields.io Markdown badges are built in.

## Quick start

```bash
# No installation
npx skillbench-ai scan SKILL.md

# Or install globally
npm install -g skillbench-ai
skillbench scan .
```

The npm package is `skillbench-ai`; the installed executable remains `skillbench`. The unscoped npm name `skillbench` is owned by an unrelated existing package.

Directory scans automatically discover:

- `SKILL.md`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.cursorrules`
- `.cursor/rules/**/*.mdc`
- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`

SkillBench supports Linux, macOS, and Windows on Node.js 20 or newer.

## CLI

| Command                               | Purpose                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `skillbench scan [target]`            | Full score, compatibility, token, and issue report            |
| `skillbench score [target]`           | Overall and per-category scores only                          |
| `skillbench lint [target]`            | Every rule finding with location and suggestion               |
| `skillbench fix [target] --dry-run`   | Suggested fixes; v0.2 never writes the target                 |
| `skillbench compat [target]`          | Five-agent compatibility report with reasons                  |
| `skillbench token [target]`           | Characters, words, estimated tokens, duplication, and density |
| `skillbench security [target]`        | Security-focused findings                                     |
| `skillbench compare <before> <after>` | Score, token, issue, and compatibility regression diff        |
| `skillbench rules [ruleId]`           | List rules or explain one rule                                |
| `skillbench init [directory]`         | Create `.skillbench.yml`                                      |
| `skillbench badge [target]`           | Generate a static shields.io Markdown badge                   |

Analysis commands support `--format terminal`, `json`, `sarif`, or `github`. Use `--output path` to write a rendered report directly to a file, `--config path/to/config.yml` to select a config explicitly, and `--no-color` for plain terminal output.

```bash
skillbench scan . --format json --output skillbench-report.json
skillbench lint . --format github --ci --fail-on error
skillbench scan . --format sarif --output skillbench.sarif
skillbench compare ./before ./after --ci --fail-on error
```

Exit codes are stable:

| Code | Meaning                                                    |
| ---- | ---------------------------------------------------------- |
| `0`  | Analysis completed and the CI threshold was not reached    |
| `1`  | `--ci` threshold reached (`critical` by default)           |
| `2`  | Invalid arguments, configuration, target, or parse failure |

## Scoring

The default score is weighted to keep ordinary warnings proportionate:

| Category            | Weight | What it measures                                                                |
| ------------------- | -----: | ------------------------------------------------------------------------------- |
| Instruction Quality |    30% | Scope, clarity, contradictions, vague language, priority hierarchy              |
| Safety              |    25% | Destructive actions, secrets, credential access, injection, arbitrary execution |
| Token Efficiency    |    15% | Estimated tokens, repeated paragraphs, directive repetition, oversized examples |
| Portability         |    20% | Open Skill metadata, platform-native discovery, vendor extensions               |
| Maintainability     |    10% | Navigable structure, section size, paragraph density                            |

Severity supplies the base deduction, while each rule supplies a documented multiplier. Repeated findings from the same rule use diminishing deductions (`100%`, `50%`, then `25%`) so a repeated ordinary warning cannot collapse the score. Category scores never fall below zero; the overall score is their configured weighted mean. A critical safety result also applies an explicit overall gate: one or two critical findings cap the score at `59.9`, while three or more cap it at `39.9`. The cap and reason are included in JSON instead of being hidden inside the formula.

Every deduction is present in JSON:

```json
{
  "ruleId": "SB102",
  "severity": "error",
  "points": 8,
  "reason": "The agent is instructed to access a credential-bearing path."
}
```

## Rules

The recommended profile contains 24 deterministic rules.

| ID      | Category        | Check                                                                         |
| ------- | --------------- | ----------------------------------------------------------------------------- |
| `SB001` | Instruction     | Instruction is too short to define reliable behavior                          |
| `SB002` | Instruction     | Instruction exceeds evidence-based line/token guidance                        |
| `SB003` | Instruction     | Exact or highly similar paragraphs using normalized n-gram Jaccard similarity |
| `SB004` | Instruction     | Known mutually incompatible directive pairs                                   |
| `SB005` | Instruction     | High density—not isolated use—of vague qualifiers                             |
| `SB006` | Instruction     | Missing task purpose or triggering condition                                  |
| `SB007` | Instruction     | Excessive `MUST` / `ALWAYS` / `NEVER` priority markers                        |
| `SB100` | Safety          | Destructive shell primitives with context-sensitive severity                  |
| `SB101` | Safety          | API keys, tokens, access keys, and private-key blocks; evidence is redacted   |
| `SB102` | Safety          | Directed access to environment, SSH, cloud credential, or cookie stores       |
| `SB103` | Safety          | Arbitrary input reaching eval, exec, or shell interpolation                   |
| `SB104` | Safety          | Direct prompt override versus quoted defensive examples                       |
| `SB105` | Safety          | Unverified network download piped to an interpreter                           |
| `SB106` | Safety          | Force push, hard reset, database drop, or production deletion without a gate  |
| `SB200` | Efficiency      | High duplicated-token ratio                                                   |
| `SB201` | Efficiency      | Repeated modal directives and safety slogans                                  |
| `SB202` | Efficiency      | Decorative or empty Markdown noise                                            |
| `SB203` | Efficiency      | Fenced examples dominate loaded context                                       |
| `SB300` | Maintainability | Long instruction lacks navigable sections                                     |
| `SB301` | Maintainability | Oversized section                                                             |
| `SB302` | Maintainability | Oversized paragraph                                                           |
| `SB400` | Portability     | Invalid open Agent Skills metadata                                            |
| `SB401` | Portability     | Vendor-specific Skill frontmatter                                             |
| `SB402` | Portability     | Missing Cursor MDC or Copilot path-scope metadata                             |

Rules can be disabled or have their severity overridden independently.

## Token analysis

Version 0.2 uses a local, language-aware estimate: Latin letters and numbers are approximated near four characters per token; CJK text and punctuation receive separate coefficients. It is an estimate, not a claim about a specific model tokenizer.

Duplicate tokens are measured from later exact or highly similar paragraphs. SkillBench reports the algorithm and reduction estimate instead of pretending that every repeated token can be removed safely.

```text
Estimated Tokens           2,841
Duplicate Tokens             318
Potential Reduction         11.2%
Instruction Density         46.8%
```

## Compatibility

Adapters isolate platform behavior from the rule engine. `SUPPORTED` means the platform has a documented native or open-standard path; `PARTIAL` names a known limitation; `UNSUPPORTED` means the current filename or metadata is not a native entry; `UNKNOWN` is used when SkillBench cannot establish behavior reliably.

| Agent          | Portable Skill | Native instruction inputs in v0.2                                                                         |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| OpenAI Codex   | `SKILL.md`     | `AGENTS.md`                                                                                               |
| Claude Code    | `SKILL.md`     | `CLAUDE.md`                                                                                               |
| Cursor         | `SKILL.md`     | `AGENTS.md`, `.cursor/rules/*.mdc`; `.cursorrules` is reported as legacy                                  |
| Gemini CLI     | `SKILL.md`     | `GEMINI.md`                                                                                               |
| GitHub Copilot | `SKILL.md`     | `.github/copilot-instructions.md`, scoped `.instructions.md`; agent instruction support varies by surface |

Compatibility behavior is grounded in the [Agent Skills specification](https://agentskills.io/specification), [Codex Skills and AGENTS.md documentation](https://developers.openai.com/codex/customization/overview), [Claude Code Skills documentation](https://docs.anthropic.com/en/docs/claude-code/skills), [Cursor Skills and Rules documentation](https://cursor.com/docs/skills), [Gemini CLI Skills documentation](https://geminicli.com/docs/cli/skills/), and [GitHub Copilot custom-instruction documentation](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot).

All platform-specific checks live in `src/adapters/`; the parser and rule engine contain no scattered agent branches.

## Configuration

Run `skillbench init`, then edit `.skillbench.yml`:

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

Weights may use any non-negative scale and are normalized when the overall score is calculated. Unknown keys and invalid severities fail with a configuration error instead of being silently ignored.

## JSON report

The versioned JSON shape is intended for CI and integrations:

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

Report formats implement the small `Reporter` interface. JSON remains the stable integration format; SARIF 2.1.0 maps deterministic findings to code-scanning locations, while the `github` format emits native GitHub Actions workflow annotations.

## Regression comparison

`skillbench compare` (alias: `diff`) analyzes two targets with the same configuration and reports score deltas, token deltas, introduced/resolved findings, and compatibility changes. In CI mode, only **introduced** findings are considered for the exit threshold, so existing debt does not block unrelated improvements.

```bash
skillbench compare ./baseline ./candidate
skillbench diff ./baseline ./candidate --format json
skillbench compare ./baseline ./candidate --ci --fail-on error
```

## SARIF and GitHub annotations

SARIF output is compatible with GitHub code scanning and other SARIF 2.1.0 consumers. Findings include rule metadata, source locations, stable fingerprints, SkillBench severity, category, and remediation text.

```bash
skillbench scan . --format sarif --output skillbench.sarif
```

For lightweight Actions integration without code scanning, `--format github` emits native `::error`, `::warning`, and `::notice` workflow commands:

```bash
skillbench lint . --format github --ci --fail-on error
```

## GitHub Actions

```yaml
name: SkillBench

on:
  pull_request:
  push:
    branches: [main]

jobs:
  skillbench:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install SkillBench
        run: npm install -g skillbench-ai
      - name: Check agent instructions
        run: skillbench scan . --ci --fail-on critical
```

Use `--fail-on warning`, `error`, or `critical` to match your repository's policy. The project itself tests Node.js 20 and 22 in `.github/workflows/ci.yml`.

## Security model

- Static analysis only. SkillBench never executes shell, Python, JavaScript, hooks, or scripts from scanned files.
- Input is treated as untrusted UTF-8 text and capped at 2 MiB per instruction file.
- Directory discovery does not follow symbolic links.
- Secret matches pass through central redaction before terminal or JSON output.
- Defensive examples receive different severity from direct execution instructions when context can be established deterministically.
- No source text is sent to a network service.

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never include a real credential in a report.

## Architecture

| Module       | Responsibility                                                    | Extension point                       |
| ------------ | ----------------------------------------------------------------- | ------------------------------------- |
| `parser/`    | Safe frontmatter, paragraph, section, and source-location parsing | New text formats                      |
| `rules/`     | Deterministic findings grouped by category                        | Add one typed rule and registry entry |
| `core/`      | Orchestration, tokens, rule engine, and explainable scoring       | Alternative profiles or analyzers     |
| `adapters/`  | Platform-native detection and compatibility reasoning             | New coding-agent adapter              |
| `reporters/` | Terminal, JSON, SARIF, GitHub annotations, and badge presentation | Hosted or third-party reports         |
| `cli/`       | Commands, options, CI policy, and user-facing errors              | New views and regression workflows    |

Public APIs are typed and exported from `src/index.ts`. The analyzer accepts parsed documents and a resolved config, which leaves room for optional future LLM judges without making them part of the trustworthy default score.

## Roadmap

- **v0.1:** static analysis, safety rules, token analysis, five-agent compatibility, CLI, JSON, CI, badges.
- **v0.2:** SARIF 2.1.0, GitHub Actions annotations, `compare`/`diff`, rule introspection, report file output.
- **v0.3:** opt-in safe auto-fix, sandboxed execution benchmarks, optional LLM-as-a-judge, Skill regression tests.
- **v0.4:** SkillBench Registry, public leaderboard, shareable hosted reports.

Planned commands include `skillbench test` and corpus-level `benchmark`. Real execution benchmarks will run only inside an explicit sandbox and will measure task success, tokens, elapsed time, tool calls, file changes, and test outcomes. They are not simulated in v0.2.

## Contributing

New rules and adapters are deliberately small extension points. Read [CONTRIBUTING.md](CONTRIBUTING.md), then use the dedicated **New rule** or **New agent** issue form. All changes must pass:

```bash
pnpm lint
pnpm test
pnpm build
```

## License

[MIT](LICENSE) © SkillBench contributors.
