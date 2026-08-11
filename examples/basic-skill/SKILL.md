---
name: basic-skill
description: Summarize a pull request into a concise reviewer briefing when a user supplies a change or asks for review preparation.
license: MIT
---

# Pull request briefing

## Purpose

Turn a code change into a compact briefing that helps a reviewer understand intent, risk, and verification status.

## Workflow

1. Identify the user-visible or developer-visible behavior that changed.
2. Group modified files by responsibility instead of listing every diff hunk.
3. Report tests that were run and distinguish passed, failed, and not run.
4. Call out migration, compatibility, or rollback concerns supported by the change.

## Boundaries

- Do not claim a test ran unless evidence is available.
- Do not include credentials or private user data in the briefing.
- Keep unrelated cleanup out of the summary.

## Output

Return a one-paragraph overview followed by risks, verification, and reviewer focus areas.
