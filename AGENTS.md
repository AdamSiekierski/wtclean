# AGENTS.md

Guide for contributors and coding agents working on wtclean.

## What it is

A CLI, terminal UI and herdr plugin that finds git linked worktrees whose branch's GitHub PR is
merged and removes them (plus the local branch). User docs: `README.md`. Feature list:
`docs/FEATURES.md`.

## Stack

- **Bun** (>= 1.2) runs the TypeScript directly. There is no build step; `bin/wtclean` imports
  `src/cli.ts`.
- TypeScript (strict, `noUncheckedIndexedAccess`), **commander** for the CLI, **ink** + React for
  the TUI.
- GitHub REST API via `fetch`; git and herdr via their CLIs.
- oxlint + oxfmt for lint and format, `bun test` for tests.

## Layout

```
bin/wtclean          entry point (shebang, imports src/cli.ts)
src/cli.ts           commander program, option parsing, default command
src/commands/        list, clean, tui command handlers
src/tui/             ink components
src/scan.ts          repo discovery -> worktrees -> PR lookup -> ScanResult
src/clean.ts         removal of one worktree + branch, with the safety checks
src/git.ts           git CLI wrappers (worktree list, status, branch -D, ...)
src/github.ts        token resolution and the REST calls
src/herdr.ts         herdr CLI wrappers (workspaces, worktree remove)
src/exec.ts          subprocess helper
src/format.ts        human-readable output
src/types.ts         shared types
herdr-plugin.toml    herdr plugin manifest
docs/FEATURES.md     living feature tracker
```

Tests sit next to the code as `*.test.ts` / `*.test.tsx`.

## Commands

```sh
bun install
bun run start -- list   # run from source
bun run check           # typecheck + lint + format:check + test (what CI runs)
bun run format          # fix formatting
```

Run `bun run check` before you call a change done.

## Rules

- **Keep docs in sync.** Any change that adds, removes or changes a feature, flag, key or
  default updates `docs/FEATURES.md` and, when user-facing, `README.md` (and `CHANGELOG.md`
  under Unreleased) in the same change.
- **Safety is not negotiable.** Cleanup must never:
  - remove the main checkout,
  - remove the worktree the user is currently in,
  - remove a dirty worktree without `--force`,
  - remove a worktree whose PR is not merged,
  - touch remote branches,
  - skip the confirmation prompt in a TTY without `--yes`.
    Any change near `src/clean.ts` needs tests for these.
- Tests must not hit the real GitHub API or the user's herdr; stub the boundaries
  (`exec`, `fetch`) and use temporary git repos.
- Inside herdr, remove a worktree that is open in a workspace through `herdr worktree remove`,
  not `git worktree remove`, so the workspace closes.
- Never print or log a GitHub token.
