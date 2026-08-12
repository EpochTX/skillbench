<p align="right">
  <strong>简体中文</strong> · <a href="README_EN.md">English</a>
</p>

<p align="center">
  <img src="assets/logo.svg" width="104" alt="SkillBench logo">
</p>

<h1 align="center">SkillBench</h1>

<p align="center"><strong>面向 AI Agent Skills 的开源 Benchmark、Linter 与跨 Agent 兼容性检查器。</strong></p>

<p align="center">
  <a href="https://github.com/EpochTX/skillbench/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/EpochTX/skillbench/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-black?style=flat-square"></a>
  <img alt="Node 20 or newer" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="SkillBench version 1.0.0" src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square">
</p>

![SkillBench terminal demo](docs/demo.svg)

SkillBench 1.0 将 Agent Skill、`AGENTS.md`、`CLAUDE.md`、Cursor Rules 等指令文件纳入可重复的工程质量体系：静态检查、安全规则、Token 效率、跨 Agent 兼容性、回归对比、SARIF、CI 门禁、可审计安全修复和人工标签规则 Benchmark。

> **发布完整性保证：** `v1.0.0` 只会在 `skillbench-ai@1.0.0` 已成功发布并从 npm Registry 验证后创建。如果你正在查看尚未打 tag 的 release candidate，请使用下方“从源码运行”方式。

## 快速开始

### npm / npx

无需全局安装：

```bash
npx --yes skillbench-ai@1.0.0 scan SKILL.md
```

或全局安装 CLI：

```bash
npm install --global skillbench-ai@1.0.0
skillbench scan SKILL.md
```

包名是 `skillbench-ai`，安装后的可执行命令是 `skillbench`。

### 从源码运行

```bash
git clone https://github.com/EpochTX/skillbench.git
cd skillbench

corepack enable
pnpm install --frozen-lockfile
pnpm build

node dist/cli.js scan SKILL.md
```

开发模式：

```bash
pnpm dev -- scan SKILL.md
```

要求 Node.js 20 或更高版本，支持 Linux、macOS 与 Windows。

## 为什么需要 SkillBench？

Agent 指令正在变成代码库的一部分，但普通 Markdown review 很难稳定回答这些问题：

- 是否存在模糊、重复、冲突或优先级滥用？
- 是否引导 Agent 访问凭据、执行危险 Shell、远程脚本或破坏性操作？
- 指令是否过长、重复 Token 是否过多？
- 同一套指令能否迁移到 Codex、Claude Code、Cursor、Gemini CLI、GitHub Copilot？
- 修改之后到底新增了哪些问题，而不是只看到一个新的总分？
- 自动修复是否足够确定、安全、幂等，可用于真实仓库？

SkillBench 默认完全本地分析，**不会执行被扫描文件中的命令，也不会把源文本发送到网络服务**。

## 核心能力

- **24 条确定性规则**：覆盖指令质量、安全性、Token 效率、可维护性与可移植性。
- **可解释评分**：每一项扣分都有规则 ID、严重级别和原因。
- **安全分析**：检测危险命令、凭据路径、Secret、Prompt Injection、任意执行、破坏性 Git/数据库行为等。
- **Token 分析**：估算 Token、重复 Token、潜在压缩空间与指令密度。
- **五 Agent 兼容性**：OpenAI Codex、Claude Code、Cursor、Gemini CLI、GitHub Copilot。
- **安全自动修复**：默认只读；只有显式 `--write` 才允许执行经过证明的确定性修复。
- **回归对比**：区分新增、已解决、未变化问题，并保持严重级别升级可见。
- **机器报告**：Terminal、JSON、SARIF 2.1.0、GitHub Actions annotations。
- **规则 Benchmark**：人工标签 case × rule 语料直接量化 TP/FP/FN、Precision、Recall、Coverage。

## CLI

| 命令                                  | 用途                                       |
| ------------------------------------- | ------------------------------------------ |
| `skillbench scan [target]`            | 完整评分、问题、Token 与兼容性分析         |
| `skillbench score [target]`           | 总分与分类分数                             |
| `skillbench lint [target]`            | 全部规则命中、位置与修复建议               |
| `skillbench security [target]`        | 安全问题视图                               |
| `skillbench token [target]`           | Token、重复度与指令密度                    |
| `skillbench compat [target]`          | 五类 Agent 兼容性                          |
| `skillbench compare <before> <after>` | 对比评分、Token、问题与兼容性变化          |
| `skillbench diff <before> <after>`    | `compare` 的别名                           |
| `skillbench rules [ruleId]`           | 列出规则或查看单条规则                     |
| `skillbench fix [target]`             | 只读预览安全修复                           |
| `skillbench fix [target] --write`     | 显式应用确定性的 SAFE 修复                 |
| `skillbench benchmark <manifest>`     | 运行人工标签规则 Benchmark                 |
| `skillbench init [directory]`         | 创建 `.skillbench.yml`；缺失目录会自动创建 |
| `skillbench badge [target]`           | 生成 shields.io Markdown Badge             |

常用示例：

```bash
# JSON 报告
skillbench scan . --format json --output skillbench-report.json

# SARIF 2.1.0
skillbench scan . --format sarif --output skillbench.sarif

# GitHub Actions 原生 annotations
skillbench lint . --format github --ci --fail-on error

# 只让新增问题影响回归门禁
skillbench compare ./baseline ./candidate --ci --fail-on error

# 默认只预览，不写文件
skillbench fix .

# 显式写入，并生成不覆盖的备份
skillbench fix . --write --backup
```

稳定退出码：

| 退出码 | 含义                                 |
| -----: | ------------------------------------ |
|    `0` | 命令完成，未达到对应 CI 失败条件     |
|    `1` | 分析/对比/Benchmark 的失败阈值被触发 |
|    `2` | 参数、配置、目标、解析或运行错误     |

## 自动发现

目录扫描自动发现常见 Agent 指令入口：

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

解析器按不可信 UTF-8 文本处理输入，单文件上限 2 MiB，目录扫描不跟随符号链接。

## 评分与规则

推荐配置包含 **24 条确定性规则**：

| 范围            | 分类       | 关注点                                                     |
| --------------- | ---------- | ---------------------------------------------------------- |
| `SB001`–`SB007` | 指令质量   | 长度、重复、冲突、模糊语言、目的、优先级标记               |
| `SB100`–`SB106` | 安全性     | 危险命令、Secret、凭据路径、任意执行、注入、破坏性操作     |
| `SB200`–`SB203` | Token 效率 | 重复 Token、重复指令、Markdown 噪声、超大示例              |
| `SB300`–`SB302` | 可维护性   | 缺少结构、超大章节、超大段落                               |
| `SB400`–`SB402` | 可移植性   | Agent Skills 元数据、厂商字段、Cursor/Copilot 作用域元数据 |

默认总分权重：指令质量 30%、安全性 25%、Token 效率 15%、可移植性 20%、可维护性 10%。同一规则重复命中采用递减扣分；安全类 `critical` 会触发显式总分上限。

```bash
skillbench rules
skillbench rules SB102
```

## 规则 Benchmark：1.0 质量门禁

仓库维护人工标签的 case × rule 语料，标签不会从当前分析结果自动生成。1.0 发布基线：

- **17 个 case**
- **24/24 条内置规则覆盖**
- **TP 24 · FP 0 · FN 0**
- **Precision 100%**
- **Recall 100%**
- **Rule coverage 100%**

```bash
pnpm benchmark:rules
# 或
skillbench benchmark tests/corpus/rules.yml --ci
```

安全规则还包含防御性/否定上下文回归测试，避免“不要执行危险命令”之类文档示例被错误升级为高危直接指令。

## 安全自动修复

`skillbench fix` **默认永远只读**。当前自动 writer 故意只支持 `SB003` 的完全相同纯文本段落删除；近似重复、列表、表格、代码块、结构化 Markdown 和安全类 remediation 都保持人工复核。

写入保护包括：

- 显式 `--write` opt-in；
- plan 保存 SHA-256，并在提交前拒绝 stale source；
- 符号链接/非普通文件拒绝写入；
- 同目录临时文件 staging + rename-based replacement；
- `--backup` 预检所有备份路径且绝不覆盖已有备份；
- 保留 CRLF/LF 与相关权限位；
- 多文件失败时 best-effort rollback，并在无法完整回滚时保留恢复材料。

这是**逐文件原子替换 + 多文件 best-effort rollback**，不声称提供跨文件系统事务。

## Agent 兼容性

| Agent          | 可移植 Skill | 原生指令入口                                                 |
| -------------- | ------------ | ------------------------------------------------------------ |
| OpenAI Codex   | `SKILL.md`   | `AGENTS.md`                                                  |
| Claude Code    | `SKILL.md`   | `CLAUDE.md`                                                  |
| Cursor         | `SKILL.md`   | `AGENTS.md`、`.cursor/rules/*.mdc`；`.cursorrules` 为 legacy |
| Gemini CLI     | `SKILL.md`   | `GEMINI.md`                                                  |
| GitHub Copilot | `SKILL.md`   | `.github/copilot-instructions.md`、作用域 `.instructions.md` |

兼容性状态为 `SUPPORTED`、`PARTIAL`、`UNSUPPORTED`、`UNKNOWN`。

## 配置

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

未知字段、未知规则 ID、非法严重级别会直接报错，不会静默忽略。

## JSON / SARIF / API 稳定性

1.0.0 的 JSON 报告 `schemaVersion` 仍为 `0.1`；工具版本与 schema 版本是两个独立兼容性维度。

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

SARIF 输出遵循 SARIF 2.1.0，并包含稳定指纹、规则元数据、位置、严重级别与 remediation。公共 TypeScript API 及 1.x SemVer 兼容范围见 [docs/API.md](docs/API.md)。

## GitHub Actions

1.0 发布后可直接固定 npm 版本运行：

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

完整 SARIF / Code Scanning 示例见 [`examples/github-actions/skillbench-sarif.yml`](examples/github-actions/skillbench-sarif.yml)。

## 1.0 发布与供应链门禁

1.0 release candidate 必须在同一提交上通过：

- **CI**：Node 20/22、macOS、Windows，含 production `dist/cli.js` 契约；
- **Package Integrity**：真实 `.tgz` 在独立 consumer 中安装、ESM import、d.ts 编译、bin、scan；
- **Production audit**：高危/严重生产依赖漏洞直接阻塞发布；
- **Performance Guard**：确定性 120 文件仓库规模测试；
- **Publish preflight**：Node 24 + npm 11.18.0 再跑完整 `pnpm release:check`。

发布流程先验证 npm Registry，再创建 `v1.0.0` 与 GitHub Release；不会用“先打 tag、后发现 npm 发布失败”的半发布状态冒充正式版本。完整标准见 [docs/1.0-RELEASE-CRITERIA.md](docs/1.0-RELEASE-CRITERIA.md)，维护者流程见 [RELEASING.md](RELEASING.md)。

## 开发

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

完整发布门禁：

```bash
pnpm release:check
```

技术栈：TypeScript、Commander、Zod、YAML、Vitest、ESLint、Prettier、tsup。

## Roadmap

- **v0.1**：静态分析、安全规则、Token 分析、五 Agent 兼容性、CLI、JSON、CI、Badge。
- **v0.2**：SARIF 2.1.0、GitHub Actions annotations、`compare` / `diff`、规则查询、报告文件输出。
- **v1.0**：稳定 CLI/API 契约、安全 writer、24/24 人工标签 Benchmark、真实包安装门禁、性能基线、生产依赖审计与可验证发布链。
- **1.x**：在兼容承诺内继续增加确定性规则、Agent Adapter、可证明安全的 fixer 与分析能力。
- **未来探索**：显式沙箱中的执行型 Skill Benchmark、可选 LLM Judge、Registry/公开排行榜；这些不会削弱 1.x 的确定性默认路径。

## Contributing

欢迎提交新规则、新 Agent Adapter、测试、文档和兼容性改进。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE) © SkillBench contributors.
