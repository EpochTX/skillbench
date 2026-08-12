# SkillBench TypeScript API

This document defines the public TypeScript surface that SkillBench intends to stabilize for 1.0. Imports from internal paths such as `skillbench-ai/dist/...` or repository `src/...` files are not part of the compatibility contract; consumers should import from the package root only.

```ts
import {
  analyzeTarget,
  compareReports,
  planSafeFixes,
  runRuleBenchmark,
} from 'skillbench-ai';
```

## Compatibility policy

Before 1.0, public API changes may still occur while the contract is being completed. Starting with 1.0:

- removing or incompatibly changing a documented runtime export requires a major version;
- removing or incompatibly changing a documented exported type requires a major version;
- additive optional fields and new exports may ship in minor versions when they preserve existing consumers;
- machine-report compatibility is additionally governed by `SCHEMA_VERSION`;
- CLI compatibility is documented separately in the README and release notes;
- internal modules remain implementation details even when their source files are visible in the repository.

The runtime export list is protected by an exact contract test so an accidental new or removed root export fails CI. Type-only exports are imported by the TypeScript contract fixture so declaration/typecheck failures surface before release.

## Analysis

### `analyzeTarget(target, options?)`

Discovers supported instruction files beneath a file or directory target and returns an `AnalysisReport`. Configuration is loaded using normal SkillBench config discovery unless an explicit resolved config is supplied through the lower-level analysis API.

### `analyzeDocuments(documents, target, config)`

Runs the rule engine, scoring, compatibility, and token analysis over already parsed `ParsedDocument` values. This is the deterministic lower-level entry point used by integrations that control discovery themselves.

### `discoverDocuments(target, ignore?)`

Discovers and parses supported files while applying parser safety limits and ignore patterns.

### `detectDocumentKind(path)` / `parseDocument(path, relativePath?)`

Parser utilities for integrations that need SkillBench's document classification and normalized parsed representation.

## Rules and scoring

### `builtInRules`

The ordered built-in rule registry. Rule IDs are stable identifiers and should be preferred over human-readable rule messages in automation.

### `calculateScore(...)` / `scoringPolicy`

The deterministic scoring implementation and published scoring policy metadata.

### `issueIdentity(issue)` / `issueFingerprint(issue)`

Stable finding identity helpers. Fingerprints intentionally ignore source-line movement and configuration-only severity overrides; compare/diff remains severity-sensitive at the comparison layer.

## Token analysis

### `TokenEfficiencyAnalyzer`

Analyzer class used for per-document token-efficiency metrics.

### `estimateTokens(text)`

Returns SkillBench's local language-aware engineering estimate. It is not an official tokenizer for a specific model.

### `findDuplicateParagraphs(paragraphs)`

Returns deterministic paragraph-similarity matches used by duplication analysis and the conservative safe-fix planner.

## Compatibility adapters

### `builtInAdapters`

The built-in adapter registry for OpenAI Codex, Claude Code, Cursor, Gemini CLI, and GitHub Copilot.

`AgentAdapter` is exported for integrations that need the adapter type contract. The current top-level analyzer uses the built-in registry; arbitrary third-party adapter registration is not yet a 1.0 extension-point promise.

## Compare / diff

### `compareReports(before, after)`

Compares two `AnalysisReport` values and returns a `ComparisonReport` containing score/token deltas, introduced/resolved findings, unchanged count, and compatibility changes.

Stable issue fingerprinting and comparison semantics are deliberately separate: a configuration-only severity change keeps the same fingerprint, while a warning-to-error escalation is still surfaced as a regression by comparison.

## Safe fixes

### `planSafeFixes(target, options?)`

Creates a deterministic `FixPlan`. Planning is read-only. A plan records source hashes and the exact lines proposed for removal.

The current automatic writer intentionally supports only exact duplicated plain-prose paragraphs associated with `SB003`. Structural Markdown, code, near-duplicates, and security-sensitive remediation remain review-only.

### `applyFixPlan(plan, options?)`

Applies a previously generated plan. The writer:

- rejects stale plans and non-regular targets;
- stages replacement files before commit;
- revalidates sources before replacement;
- can create non-overwriting recovery backups;
- preserves line endings and relevant file permission bits;
- uses same-directory rename-based replacement;
- attempts best-effort rollback if a later file in a multi-file apply fails.

This is per-file atomic replacement with best-effort multi-file rollback, not a claim of filesystem-wide atomic transactions.

### `FixConflictError`

Raised when SkillBench refuses a write because the source or filesystem state no longer matches the plan's safety assumptions.

## Labeled rule benchmark

### `runRuleBenchmark(manifestPath)`

Runs a hermetic case-by-rule benchmark using human-authored expected rule IDs. It reports true positives, false positives, false negatives, precision, recall, and built-in-rule coverage.

Benchmark analysis intentionally ignores user/up-tree `.skillbench.yml` files so corpus results measure the recommended built-in rules rather than local environment configuration.

### `BenchmarkError`

Raised for invalid manifests, duplicate case IDs/rule labels, unknown rule IDs, unreadable targets, and other benchmark setup failures.

## Reporters

The following machine reporters implement the exported `Reporter` contract:

- `JsonReporter`
- `SarifReporter`
- `GitHubReporter`

Reporter output should be treated as machine-readable only where documented. Terminal presentation helpers are intentionally not exported as a stable package API.

## Metadata

### `VERSION`

SkillBench package/runtime version.

### `SCHEMA_VERSION`

Machine-report schema version. It is intentionally separate from package SemVer.

### `PROJECT_URL`

Canonical project URL.

## Exported type contracts

The package root exports these documented types:

- `AnalysisReport`
- `Category`
- `CompatibilityResult`
- `CompatibilityStatus`
- `Issue`
- `ParsedDocument`
- `Rule`
- `Severity`
- `TokenMetrics`
- `AgentAdapter`
- `Reporter`
- `ComparisonReport`
- `CompatibilityChange`
- `ReportSnapshot`
- `ApplyFixOptions`
- `ApplyFixResult`
- `FileFixPlan`
- `FixPlan`
- `PlanFixOptions`
- `SafeFix`
- `SafeFixKind`
- `RuleBenchmarkCaseResult`
- `RuleBenchmarkReport`
- `RuleBenchmarkThresholds`

The source of truth remains the package-root declaration file produced by the release build. This document describes the supported contract; it does not make internal source paths public APIs.
