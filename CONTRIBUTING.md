# Contributing to SkillBench

Thanks for helping make agent instructions safer and easier to test. Small, focused pull requests are easiest to review.

## Development setup

```bash
git clone https://github.com/EpochTX/skillbench.git
cd skillbench
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

SkillBench requires Node.js 20 or newer. The repository pins pnpm in `package.json`.

## Add a new SkillBench rule

1. Choose the category under `src/rules/` and add a focused rule module. A rule exports a typed `Rule` with `id`, `name`, `description`, `category`, `defaultSeverity`, `weight`, and `check()`.
2. Register the export once in `src/rules/registry.ts`. Registry startup validation rejects duplicate IDs.
3. Add the smallest representative fixture and unit tests. Test both a true positive and the most likely false positive.
4. Document the rule in the README rule table.

Rule IDs are allocated by range:

| Range         | Category            |
| ------------- | ------------------- |
| `SB001–SB099` | Instruction quality |
| `SB100–SB199` | Safety              |
| `SB200–SB299` | Token efficiency    |
| `SB300–SB399` | Maintainability     |
| `SB400–SB499` | Portability         |

Rules must be deterministic in the recommended profile. Do not add a network call, execute analyzed content, or require a paid model. A warning should explain evidence and offer a concrete remediation. Any evidence that could contain a credential must pass through the central redaction path.

## Add an Agent adapter

1. Implement `AgentAdapter` in `src/adapters/`.
2. Keep all filename, frontmatter, and platform capability checks inside the adapter.
3. Register it in `src/adapters/index.ts`.
4. Add compatibility tests for `SUPPORTED`, `PARTIAL`, `UNSUPPORTED`, and uncertain behavior. Use `UNKNOWN` whenever official behavior cannot be established reliably.
5. Link the platform's primary documentation in the README compatibility section.

## Pull requests

- Open an issue first for a new rule range, scoring change, or compatibility behavior change.
- Include tests and update documentation for user-visible behavior.
- Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` locally.
- Do not include real credentials, private instructions, or proprietary Skill files in fixtures.

By contributing, you agree that your contribution is licensed under the MIT License.
