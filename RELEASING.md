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
5. If npm installation is becoming available for the first time, update both READMEs in the same release to replace the source-only installation notice with verified npm commands.

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

## Publish npm

The npm package name is `skillbench-ai`; the installed executable is `skillbench`.

Prefer npm trusted publishing / OIDC and provenance when the package-side configuration is ready. Do not commit npm tokens or long-lived publishing credentials to the repository, workflow files, fixtures, or documentation.

The first publication is a bootstrap case: verify package ownership and public registry availability before configuring the final trusted publisher, because the package must exist before its trusted-publisher relationship can be configured. Do not add an npm badge or tell users to run `npx skillbench-ai` until the public package is actually resolvable and its installed CLI has been verified.

## Tag and GitHub release

Only tag a commit that passed the full release gate and contains the exact released version metadata.

Use a tag named `vX.Y.Z` matching the package version. Create the GitHub release from that tag and derive release notes from the corresponding `CHANGELOG.md` section. Do not tag an `Unreleased` working state as an existing release version.

## Post-release verification

After publication:

- verify the npm package version and package contents;
- verify `npx skillbench-ai --version` on a clean environment;
- verify the CI, Package Integrity, and Performance Guard checks on the released tree;
- confirm the GitHub release/tag points to the intended commit;
- verify provenance after trusted publishing is enabled;
- update the README installation section and npm badge only after the package is publicly resolvable;
- leave a fresh `## Unreleased` section in `CHANGELOG.md` for subsequent work.
