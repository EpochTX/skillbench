---
name: bloated-skill
description: Produce a release checklist for a TypeScript package when maintainers prepare a new version.
---

# Release checklist

## Purpose

Create a release checklist that covers versioning, tests, documentation, package contents, and publication readiness for a TypeScript package.

## First copy

Before publishing, verify that the package version matches the changelog, every public entry point is exported, generated declarations are present, tests pass on supported Node versions, the tarball contains only intended files, the readme installation command is accurate, the license is included, and the working tree has no unexplained changes. Record each result with the command used and a short piece of evidence so another maintainer can reproduce the review.

## Second copy

Before publishing, verify that the package version matches the changelog, every public entry point is exported, generated declarations are present, tests pass on supported Node versions, the tarball contains only intended files, the readme installation command is accurate, the license is included, and the working tree has no unexplained changes. Record each result with the command used and a short piece of evidence so another maintainer can reproduce the review.

## Third copy

Before publishing, verify that the package version matches the changelog, every public entry point is exported, generated declarations are present, tests pass on supported Node versions, the tarball contains only intended files, the readme installation command is accurate, the license is included, and the working tree has no unexplained changes. Record each result with the command used and a short piece of evidence so another maintainer can reproduce the review.

## Output

Return a Markdown checklist with pass, fail, and not-applicable states.
