# SkillBench Performance Baseline

SkillBench 1.0 treats repository-scale performance as a release property. The goal of this benchmark is not to publish a universal speed claim; it is to catch large regressions in deterministic static analysis before they reach a release.

## Workload

The benchmark is generated in a system temporary directory on every run. It contains:

- 120 nested packages;
- one `SKILL.md` per package;
- deterministic frontmatter, headings, prose, and workflow checks;
- no network access or executed repository code;
- full normal target analysis, including discovery, parsing, all built-in rules, scoring, token analysis, and compatibility analysis.

The fixture is generated at runtime rather than committed as hundreds of large synthetic files.

Run it locally with:

```bash
pnpm exec tsx scripts/measure-scale-performance.ts
```

The command emits JSON containing:

- discovered file count;
- generated UTF-8 byte count;
- elapsed analysis time;
- process RSS after analysis;
- finding count;
- estimated token count;
- configured guard ceilings;
- pass/fail status.

## CI guard

The GitHub Actions `Performance Guard` workflow runs the benchmark on the repository's supported Node.js 22 toolchain. The initial regression ceilings are intentionally broad:

- maximum elapsed analysis time: **12,000 ms**;
- maximum process RSS after analysis: **512 MiB**.

These are failure guards, not performance targets and not claims about all hardware. They are deliberately loose enough to tolerate shared-runner variance while still catching pathological changes such as accidental quadratic repository-wide scans or large memory blow-ups.

The limits can be overridden for investigation without changing the source benchmark:

```bash
SKILLBENCH_PERF_MAX_MS=20000 \
SKILLBENCH_PERF_MAX_RSS_MIB=768 \
pnpm exec tsx scripts/measure-scale-performance.ts
```

Raising the checked-in defaults requires an explanation in the same pull request. A failing benchmark should not be made green merely by increasing the limit without investigating the regression.

## Release baseline

Every performance workflow run prints the exact measured JSON for that runner. Before the final `1.0.0` release candidate is tagged, maintainers must record the release-candidate run's measured elapsed time and RSS in the release notes or release checklist together with its GitHub Actions run ID. This ties the 1.0 baseline to an auditable runner execution rather than presenting one developer laptop measurement as universal.

Future releases should compare the same deterministic workload against that 1.0 release-candidate measurement. Minor variance is expected; material changes should be explained even when they remain below the broad CI ceiling.

## Interpretation limits

- RSS after analysis is a coarse process-level memory indicator, not a heap profiler or exact peak-memory measurement.
- GitHub-hosted runner performance can vary between runs.
- The workload represents many moderate instruction files, not a single maximum-size 2 MiB input.
- This benchmark does not execute Agent Skills or evaluate model runtime performance. It measures SkillBench's own static-analysis pipeline only.
