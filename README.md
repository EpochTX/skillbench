<p align="right">
  <strong>简体中文</strong> · <a href="README_EN.md">English</a>
</p>

<p align="center">
  <img src="assets/logo.svg" width="104" alt="SkillBench logo">
</p>

<h1 align="center">SkillBench</h1>

<p align="center"><strong>面向 AI Agent Skills 的开源基准、Linter 与跨 Agent 兼容性检查器。</strong></p>

<p align="center">给 Agent 指令一套真正可重复、可解释、可接入 CI 的测试体系。</p>

<p align="center">
  <a href="https://github.com/EpochTX/skillbench/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/EpochTX/skillbench/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-black?style=flat-square"></a>
  <img alt="Node 20 or newer" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="SkillBench version 0.2.0" src="https://img.shields.io/badge/version-0.2.0-blue?style=flat-square">
</p>

```console
$ npx skillbench-ai scan SKILL.md
```

![SkillBench terminal demo](docs/demo.svg)

> 演示分数仅用于展示界面。真实分析中的每一次扣分都会给出规则 ID、严重级别、位置、证据与修复建议。

## SkillBench 是什么？

Agent Skills、`AGENTS.md`、`CLAUDE.md`、Cursor Rules 等指令文件正在逐渐成为 AI 工程项目的一部分，但它们通常缺少传统代码已经拥有的质量保障：静态检查、回归对比、安全规则、CI 门禁与可机器读取的报告。

SkillBench 为这类文件提供一套确定性的静态分析工具链：

- **质量检查**：发现范围不清、表述模糊、重复内容、冲突指令与优先级滥用。
- **安全检查**：检测凭据访问、Prompt Injection、危险 Shell、任意代码执行、破坏性 Git/数据库操作等风险。
- **Token 效率分析**：估算 Token、重复 Token、潜在压缩空间与指令密度。
- **跨 Agent 兼容性**：分析同一套指令在 Codex、Claude Code、Cursor、Gemini CLI、GitHub Copilot 中的可用程度。
- **可解释评分**：每一分的扣除都有明确规则和依据，不依赖隐藏模型判断。
- **回归检测**：对比两个版本，区分新增问题、已解决问题与兼容性变化。
- **CI / SARIF**：支持 JSON、SARIF 2.1.0、GitHub Actions 原生注解与稳定退出码。

默认分析完全在本地完成，**不会执行被扫描文件中的脚本，也不会把源文本发送到网络服务**。

## 快速开始

### 从源码运行

```bash
git clone https://github.com/EpochTX/skillbench.git
cd skillbench

corepack enable
pnpm install
pnpm build

node dist/cli.js scan SKILL.md
```

开发模式：

```bash
pnpm dev -- scan SKILL.md
```

项目的 npm 包名为 `skillbench-ai`，CLI 可执行文件名为 `skillbench`。发布到 npm 后可以直接使用：

```bash
npx skillbench-ai scan SKILL.md
```

## 自动发现的文件

当目标是一个目录时，SkillBench 会自动发现常见 Agent 指令入口：

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

支持 Linux、macOS 与 Windows，要求 Node.js 20 或更高版本。

## CLI

| 命令 | 用途 |
| --- | --- |
| `skillbench scan [target]` | 完整分析：评分、问题、Token 与兼容性 |
| `skillbench score [target]` | 仅输出总分与分类分数 |
| `skillbench lint [target]` | 输出全部规则命中、位置与修复建议 |
| `skillbench security [target]` | 仅查看安全相关问题 |
| `skillbench token [target]` | Token、重复度与指令密度分析 |
| `skillbench compat [target]` | 五类 Agent 兼容性分析 |
| `skillbench compare <before> <after>` | 对比两个版本的评分、Token、问题与兼容性变化 |
| `skillbench diff <before> <after>` | `compare` 的别名 |
| `skillbench rules [ruleId]` | 列出全部规则，或查看某条规则详情 |
| `skillbench fix [target] --dry-run` | 输出修复建议；v0.2 不修改目标文件 |
| `skillbench init [directory]` | 创建 `.skillbench.yml` |
| `skillbench badge [target]` | 生成 shields.io Markdown Badge |

### 输出格式

分析命令支持：

```text
terminal
json
sarif
github
```

常用示例：

```bash
# JSON 报告
skillbench scan . --format json --output skillbench-report.json

# GitHub Actions 原生错误/警告注解
skillbench lint . --format github --ci --fail-on error

# SARIF 2.1.0
skillbench scan . --format sarif --output skillbench.sarif

# 回归检查：只让“新增问题”影响 CI
skillbench compare ./baseline ./candidate --ci --fail-on error
```

稳定退出码：

| 退出码 | 含义 |
| ---: | --- |
| `0` | 分析完成，未达到 CI 失败阈值 |
| `1` | `--ci` 指定的严重级别阈值被触发 |
| `2` | 参数、配置、目标或解析错误 |

`--fail-on` 支持 `warning`、`error`、`critical`。

## 评分体系

默认总分由五个维度加权组成：

| 维度 | 权重 | 主要检查内容 |
| --- | ---: | --- |
| 指令质量 | 30% | 范围、清晰度、矛盾、模糊表达、优先级层次 |
| 安全性 | 25% | 破坏性操作、密钥、凭据、注入、任意执行 |
| Token 效率 | 15% | Token 估算、重复段落、重复指令、超大示例 |
| 可移植性 | 20% | Agent Skills 元数据、平台原生入口、厂商扩展 |
| 可维护性 | 10% | 文档结构、章节长度、段落密度与可导航性 |

严重级别提供基础扣分，每条规则再应用独立倍率。同一规则重复命中会采用递减扣分：`100% → 50% → 25%`，避免普通重复警告把总分异常拉低。

安全类 `critical` 问题会触发显式总分上限：

- 1～2 个 `critical`：总分最高 `59.9`
- 3 个及以上 `critical`：总分最高 `39.9`

所有扣分都会出现在 JSON 报告中，而不是隐藏在公式里。

```json
{
  "ruleId": "SB102",
  "severity": "error",
  "points": 8,
  "reason": "The agent is instructed to access a credential-bearing path."
}
```

## 规则体系

v0.2 推荐配置包含 **24 条确定性规则**：

| 范围 | 分类 | 关注点 |
| --- | --- | --- |
| `SB001`–`SB007` | 指令质量 | 长度、重复、冲突、模糊语言、任务目的、优先级标记 |
| `SB100`–`SB106` | 安全性 | 危险命令、密钥、凭据目录、任意执行、注入、远程脚本、破坏性操作 |
| `SB200`–`SB203` | Token 效率 | 重复 Token、重复模态词、Markdown 噪声、大量代码示例 |
| `SB300`–`SB302` | 可维护性 | 缺少章节、超大章节、超大段落 |
| `SB400`–`SB402` | 可移植性 | Agent Skills 元数据、厂商专属字段、Cursor/Copilot 范围元数据 |

查看全部规则：

```bash
skillbench rules
```

查看单条规则：

```bash
skillbench rules SB102
```

规则可以在 `.skillbench.yml` 中单独关闭或覆盖严重级别。

## Token 分析

v0.2 使用本地、语言感知的 Token 估算。拉丁字母/数字、CJK 字符与标点采用不同近似系数；它是工程估算值，并不冒充某个特定模型的官方 tokenizer。

```text
Estimated Tokens           2,841
Duplicate Tokens             318
Potential Reduction         11.2%
Instruction Density         46.8%
```

重复 Token 基于后续完全相同或高度相似的段落计算，同时报告潜在压缩比例。

## Agent 兼容性

SkillBench 将平台相关逻辑隔离在 Adapter 层，不把不同 Agent 的条件分支散落进规则引擎。

| Agent | 可移植 Skill | 原生指令入口 |
| --- | --- | --- |
| OpenAI Codex | `SKILL.md` | `AGENTS.md` |
| Claude Code | `SKILL.md` | `CLAUDE.md` |
| Cursor | `SKILL.md` | `AGENTS.md`、`.cursor/rules/*.mdc`；`.cursorrules` 标记为 legacy |
| Gemini CLI | `SKILL.md` | `GEMINI.md` |
| GitHub Copilot | `SKILL.md` | `.github/copilot-instructions.md`、作用域 `.instructions.md` |

兼容性状态：

- `SUPPORTED`：存在文档化的原生或开放标准路径。
- `PARTIAL`：可用，但存在已知限制。
- `UNSUPPORTED`：当前文件名或元数据不是该平台的原生入口。
- `UNKNOWN`：SkillBench 无法可靠判断。

## 回归对比

`compare` / `diff` 会用同一套配置分析两个目标，并输出：

- 总分与分类分数变化
- Token 与文件数量变化
- 新增问题
- 已解决问题
- 未变化问题
- Agent 兼容性变化

```bash
skillbench compare ./baseline ./candidate
skillbench diff ./baseline ./candidate --format json
skillbench compare ./baseline ./candidate --ci --fail-on error
```

在 CI 模式下，只有**新增问题**参与失败阈值判断，因此历史技术债不会阻塞无关改进。

## SARIF 与 GitHub Actions

SARIF 输出遵循 SARIF 2.1.0，可用于 GitHub Code Scanning 及其他 SARIF 消费端。报告包含规则元数据、源码位置、稳定指纹、严重级别、分类与修复建议。

```bash
skillbench scan . --format sarif --output skillbench.sarif
```

轻量级 GitHub Actions 集成可以使用 `github` 格式，直接输出原生 `::error`、`::warning` 与 `::notice`：

```bash
skillbench lint . --format github --ci --fail-on error
```

示例工作流：

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

仓库自身的 `.github/workflows/ci.yml` 会对 Node.js 20 与 22 运行检查。

## 配置

初始化：

```bash
skillbench init
```

示例 `.skillbench.yml`：

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

权重可以使用任意非负比例，计算总分时会自动归一化。未知字段、未知规则 ID 与非法严重级别会直接报配置错误，不会被静默忽略。

## JSON 报告

JSON 是稳定的机器集成格式：

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

Reporter 层与分析核心解耦，因此可以扩展新的输出格式，而不需要修改规则或评分逻辑。

## 安全模型

SkillBench 默认采用保守的静态分析边界：

- 不执行被扫描文件中的 Shell、Python、JavaScript、Hook 或脚本。
- 输入按不可信 UTF-8 文本处理，单个指令文件上限为 2 MiB。
- 目录扫描不跟随符号链接。
- 命中的密钥或凭据证据在输出前统一脱敏。
- 防御性示例与直接执行指令会在可确定的上下文中使用不同严重级别。
- 默认不会把源文本发送到任何网络服务。

安全问题请按照 [SECURITY.md](SECURITY.md) 中的流程私下报告，请勿提交真实凭据。

## 架构

| 模块 | 职责 | 扩展方向 |
| --- | --- | --- |
| `parser/` | Frontmatter、段落、章节与源码位置解析 | 新文本格式 |
| `rules/` | 按分类组织的确定性规则 | 新规则 |
| `core/` | 分析编排、Token、规则引擎、评分与回归比较 | 新分析器/评分配置 |
| `adapters/` | Agent 原生入口检测与兼容性推理 | 新 Agent |
| `reporters/` | Terminal、JSON、SARIF、GitHub 注解与 Badge | 新报告格式 |
| `cli/` | 命令、参数、CI 策略与用户错误 | 新工作流 |

公共 TypeScript API 从 `src/index.ts` 导出。

## 项目结构

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

## 本地开发

```bash
corepack enable
pnpm install

pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

技术栈：TypeScript、Commander、Zod、YAML、Vitest、ESLint、Prettier、tsup。

## Roadmap

- **v0.1**：静态分析、安全规则、Token 分析、五 Agent 兼容性、CLI、JSON、CI、Badge。
- **v0.2**：SARIF 2.1.0、GitHub Actions 注解、`compare` / `diff`、规则查询、报告文件输出。
- **v0.3**：可选安全自动修复、沙箱执行 Benchmark、可选 LLM Judge、Skill 回归测试。
- **v0.4**：SkillBench Registry、公开排行榜、可分享的托管报告。

计划中的命令包括 `skillbench test` 与语料级 `benchmark`。真实执行型 Benchmark 只会在显式沙箱中运行，并衡量任务成功率、Token、耗时、工具调用、文件变化与测试结果。

## 贡献

欢迎提交新规则、新 Agent Adapter、测试、文档与兼容性改进。

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。提交前确保：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## License

[MIT](LICENSE) © SkillBench contributors.
