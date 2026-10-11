---
name: quality-gate
description: Run the Aegis Oxlint and Oxfmt gates and relevant validation before finishing a change; review automatic fixes and report baseline failures accurately.
---

# Quality gate

Use the Node and pnpm versions in root `package.json`. Run commands from the
repository root.

```sh
pnpm check:fix
pnpm check
```

`check:fix` applies Oxlint fixes and Oxfmt formatting. Review its diff before running
the non-mutating `check` gate (`check:style`). Limit automatic fixes to the changed
files with `pnpm exec oxlint --fix <files>` and `pnpm format:files <files>` when a
repository-wide rewrite would exceed the authorized scope. Always run the full
non-mutating gate afterward.

Fix findings introduced by the change. Do not weaken repository-wide rules or add
suppressions. Comments are forbidden by the coding convention; restructure code
instead. If baseline findings block the full gate, verify they predate the change,
record their files and commands, and report the gate as failing. Never describe a
focused pass as a repository-wide pass.

Style validation does not replace behavioral validation. Build shared contracts
before focused API/web tests, run affected suites and `pnpm typecheck`, then
`git diff --check`. `pnpm run ci` combines the style gate, type checking, tool tests,
and package tests. The simulator workflow also runs `pnpm check` on pull requests.
Use the testing guidance in `internal-docs/ai/testing.md` for card, engine, replay,
and browser changes. Report any unrun environment-dependent checks explicitly.
