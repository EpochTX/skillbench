# Releasing SkillBench

This document is for maintainers preparing a public SkillBench release. It is intentionally separate from the user-facing README.

## Release invariants

Before publishing, keep these values aligned:

- `package.json` `version`
- `src/version.ts` `VERSION`
- the version badge in `README.md` and `README_EN.md`
- the terminal demo version in `docs/demo.svg`
- the release heading in `CHANGELOG.md`

The automated test suite checks these invariants so version drift fails CI.

## Prepare the release

1. Start from an up-to-date `main` with no unrelated local changes.
2. Choose the next semantic version and update every version location listed above.
3. Move relevant entries from `## Unreleased` in `CHANGELOG.md` into a dated release section.
4. Keep `## Unreleased` at the top for future changes.
5. If npm installation is becoming available for the first time, update both READMEs only after the public package has actually been published and verified.

Run the complete release gate:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm release:check
```

`pnpm release:check` runs lint, strict TypeScript typechecking, the full Vitest suite, the 24/24 labeled rule benchmark, the production build and built-CLI contract, a high/critical production-dependency audit, a real packed-package consumer installation, and the npm package dry run.

## Inspect and install the packed package

`pnpm run package:smoke` creates the actual `.tgz`, installs it into an OS temporary consumer directory outside the repository workspace, and validates what a consumer receives:

- package-root ESM imports;
- published TypeScript declarations through a strict consumer compile;
- the installed `skillbench` executable and version;
- the machine-readable rules contract and a real `scan` command;
- required runtime, API documentation, README, and license files;
- absence of accidental `src/`, `tests/`, and `coverage/` directories.

The smoke install disables installed-package lifecycle scripts and prefers already cached dependency data while still allowing registry metadata resolution when the clean consumer needs it. A failure is a release blocker even when source-tree tests are green.

Also review `pnpm pack:check` before publication. The package must contain only intended runtime code, documentation, license, and referenced assets; it must not contain fixtures, coverage, temporary archives, credentials, or local output.

## Production dependency audit

Run:

```bash
pnpm run audit:prod
```

The release gate fails on known high or critical advisories in production dependencies. Do not make the release green by adding blanket audit ignores, `--ignore-unfixable`, or automatic audit fixes. If an advisory genuinely cannot affect SkillBench, document the threat-model rationale and the exact advisory before considering any narrowly scoped exception.

## Automated publish workflow

`.github/workflows/publish.yml` is the only repository workflow authorized to publish SkillBench. Pull requests that touch release metadata run a read-only Node.js 24 preflight with npm 11.18.0 and the complete `pnpm release:check`; they cannot publish packages or create releases.

Publishing jobs run only from the guarded 1.0 bootstrap on `main` or from version tags. They use a GitHub-hosted runner with `id-token: write`, npm provenance, the complete release gate, and a registry verification step before GitHub release creation. The workflow verifies that existing registry metadata points back to the canonical `EpochTX/skillbench` repository before treating an already-published version as an idempotent retry.

The first public `skillbench-ai` publication is a bootstrap case because npm requires the package to exist before a trusted publisher can be configured. The bootstrap publish therefore supports the repository `NPM_TOKEN` secret as a traditional-authentication fallback. npm's CLI prefers an available OIDC trusted-publisher identity before falling back to that token. After the first successful publication, configure npm trusted publishing for `EpochTX/skillbench` and `publish.yml`, verify the next OIDC publication, then revoke and remove the bootstrap write token.

Do not commit npm tokens or long-lived publishing credentials to repository files, workflow source, fixtures, logs, or documentation.

## Tag and GitHub release

Only release a commit that passed the full release gate and contains the exact released version metadata.

The 1.0 bootstrap publishes npm first and creates `v1.0.0` plus the GitHub release only after registry verification succeeds. Subsequent releases normally enter through a `vX.Y.Z` tag; the publish workflow verifies that the tag matches `package.json`, publishes or safely recognizes an idempotent matching registry version, verifies registry metadata, and creates the GitHub release if it does not already exist.

Do not tag an `Unreleased` working state as an existing release version.

## Post-release verification

After publication:

- verify the npm package version and package contents;
- verify `npx skillbench-ai --version` on a clean environment;
- verify the CI, Package Integrity, Performance Guard, and Publish checks on the released tree;
- confirm the GitHub release/tag points to the intended commit;
- verify npm provenance;
- configure trusted publishing for `publish.yml` after the first bootstrap publication, then remove any no-longer-needed write token;
- update the README installation section and npm badge only after the package is publicly resolvable;
- leave a fresh `## Unreleased` section in `CHANGELOG.md` for subsequent work.
