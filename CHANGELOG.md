# Changelog

All notable changes to SkillBench will be documented in this file. The project follows [Semantic Versioning](https://semver.org/).

## Unreleased

### Changed

- CI now smoke-tests the built `dist/cli.js` executable on Node.js 20, Node.js 22, macOS, and Windows.
- Publishable package metadata now includes README-linked documentation and SVG assets.
- Release verification includes a dry-run package check and pre-publish quality gates.
- GitHub Actions dependencies are pinned to immutable full commit SHAs, and checkout credentials are not persisted after repository setup.
- Dependabot checks npm/pnpm and GitHub Actions dependencies weekly.

### Fixed

- The terminal demo no longer advertises the unpublished `npx skillbench-ai` command.

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
