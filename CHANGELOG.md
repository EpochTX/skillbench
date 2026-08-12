# Changelog

All notable changes to SkillBench will be documented in this file. The project follows [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- `skillbench benchmark <manifest>` measures case-by-rule precision, recall, built-in-rule coverage, false positives, and false negatives from a labeled YAML corpus.
- The initial repository corpus labels six existing fixtures and covers 13 of 24 built-in rules with strict 100% precision and recall thresholds; 1.0 release criteria require expanding coverage to all built-in rules.
- The rule benchmark is available through the public TypeScript API and runs against both source and built CLI paths in verification.
- `docs/1.0-RELEASE-CRITERIA.md` defines auditable blockers for deterministic rule quality, CLI/API stability, safe writes, schema compatibility, packaging, security, performance, and release execution.
- `skillbench fix --write` can apply a deliberately narrow class of deterministic safe fixes while the default fix mode remains read-only.
- The initial safe writer removes only exact duplicated plain-prose paragraphs reported by `SB003`; structural Markdown, code, near-duplicates, and ambiguous findings remain review-only.
- `skillbench fix --backup` creates non-overwriting `.skillbench.bak` copies before modified files are written.
- Safe fix plans carry source hashes and reject stale writes when a file changes after planning.
- Public `planSafeFixes` and `applyFixPlan` APIs support audited integrations and custom tooling.

### Changed

- Source verification and pre-publication checks now fail when the repository rule corpus misses its declared precision, recall, or coverage thresholds.
- Built CLI smoke tests rerun the labeled benchmark on Node.js and both supported desktop runner platforms.
- Safe-fix writes are staged into same-directory temporary files and committed with rename-based replacement instead of direct truncating writes.
- Safe-fix apply revalidates all planned sources before commit, preflights every backup destination, preserves permission bits, and attempts rollback if a later file replacement fails.
- Temporary safe-fix files are cleaned after successful writes and on recoverable failures; recovery backups are retained when rollback cannot complete.
- CI now smoke-tests the built `dist/cli.js` executable on Node.js 20, Node.js 22, macOS, and Windows.
- Publishable package metadata now includes README-linked documentation and SVG assets.
- Release verification includes a dry-run package check and pre-publish quality gates.
- GitHub Actions dependencies are pinned to immutable full commit SHAs, and checkout credentials are not persisted after repository setup.
- Repository CI uses `actions/checkout` 7.0.1 and `actions/setup-node` 7.0.0 while continuing to test the supported Node.js 20 and 22 runtimes.
- Dependabot checks npm/pnpm and GitHub Actions dependencies weekly and explicitly defers runtime dependency majors that require dropping Node.js 20 support.
- Superseded CI runs for the same pull request or branch are cancelled automatically.
- Copy-paste GitHub Actions examples use pinned Actions and an immutable SkillBench v0.2.0 source snapshot.
- Maintainer release preparation is documented in `RELEASING.md`, with `pnpm release:check` as the complete local release gate.
- Automated tests keep package, runtime, README, demo, changelog, and canonical repository release metadata aligned.

### Fixed

- Stable issue fingerprints no longer change when a rule severity is overridden by configuration.
- SARIF artifact URIs encode reserved filename characters such as `#` and `?` as path data.
- The terminal demo no longer advertises the unpublished `npx skillbench-ai` command.
- The SARIF workflow example no longer tries to install the unpublished npm package.

## 0.2.0 — 2026-08-11

### Added

- SARIF 2.1.0 reporter with rule metadata, source locations, remediation text, and deterministic fingerprints.
- GitHub Actions annotation reporter for native error, warning, and notice annotations.
- `skillbench compare` / `skillbench diff` regression analysis for score, token, issue, and compatibility changes.
- `skillbench rules [ruleId]` for machine-readable rule discovery and human-readable rule explanations.
- `--output <path>` support for analysis and comparison reports.
- Public reporter and comparison APIs for integrations.

### Changed

- Repository metadata now points to the canonical `EpochTX/skillbench` repository.
- CI now includes an explicit TypeScript typecheck step.
- Documentation includes SARIF, GitHub annotations, and regression-comparison workflows.

## 0.1.0 — 2026-08-11

### Added

- Static analysis for Agent Skills and five coding-agent instruction formats.
- Twenty-four deterministic instruction, safety, efficiency, portability, and maintainability rules.
- Explainable weighted scoring with diminishing deductions for repeated findings.
- Token, duplication, compatibility, security, suggestion, JSON, CI, and badge output.
- Cross-platform Node.js 20+ CLI with directory discovery and YAML configuration.
