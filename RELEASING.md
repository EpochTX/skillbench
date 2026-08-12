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

`pnpm release:check` runs lint, TypeScript typechecking, the full Vitest suite, the 24/24 labeled rule benchmark, the production build, a smoke test against `dist/cli.js`, a production-dependency security audit at `high` severity or above, an installed-package consumer smoke test, and a package dry run.

## Production dependency audit

The release gate includes:

```bash
pnpm audit --prod --audit-level high
```

A high or critical advisory in a production dependency is a release blocker. Do not make the gate green with `--ignore-unfixable`, blanket advisory ignores, or an automatic lockfile rewrite. Investigate the affected dependency, upgrade or replace it when possible, and document any exceptional risk acceptance before release.

Development-only advisories do not automatically block the published runtime package, but they should still be reviewed as part of repository maintenance and supply-chain hygiene.

## Inspect and install the package

`pnpm package:smoke` performs a real consumer-style verification rather than only inspecting `dist/` in the source tree. It:

- creates an actual `.tgz` package;
- installs that archive into a clean temporary consumer project using the existing pnpm store;
- imports the package root as ESM;
- typechecks a consumer against the installed `dist/index.d.ts`;
- executes the installed `skillbench` binary;
- runs a real scan from the installed package;
- verifies required documentation and runtime files are present;
- rejects accidental `src/`, `tests/`, or `coverage/` content in the installed package.

The CI matrix runs this installed-package smoke test on Node.js 20 and 22 on Ubuntu and also on Windows to validate the generated command shim.

Review the `pnpm pack:check` output before publication as a second package-content check. The package must contain the production build, license, both READMEs, `docs/API.md`, security and contribution documentation, and README-linked SVG assets. It must not contain tests, fixtures, coverage, temporary archives, credentials, or local output.

Confirm the built executable directly:

```bash
node dist/cli.js --version
node dist/cli.js rules --format json
```

## Publish npm

The npm package name is `skillbench-ai`; the installed executable is `skillbench`.

Prefer npm trusted publishing / provenance when the repository and npm package are configured for it. Do not commit npm tokens or long-lived publishing credentials to the repository, workflow files, fixtures, or documentation.

For the first npm publication, verify ownership and package availability before adding an npm badge or telling users to run `npx skillbench-ai`.

## Tag and GitHub release

Only tag a commit that passed the full release gate and contains the exact released version metadata.

Use a tag named `vX.Y.Z` matching the package version. Create the GitHub release from that tag and derive release notes from the corresponding `CHANGELOG.md` section. Do not tag an `Unreleased` working state as an existing release version.

## Post-release verification

After publication:

- verify the npm package version and package contents;
- verify `npx skillbench-ai --version` on a clean environment;
- verify the CI badge on `main` is green;
- confirm the GitHub release/tag points to the intended commit;
- update the README installation section and npm badge only after the package is publicly resolvable;
- leave a fresh `## Unreleased` section in `CHANGELOG.md` for subsequent work.
