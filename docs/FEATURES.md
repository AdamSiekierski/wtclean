# Features

The living list of everything wtclean does and plans to do.

> **Rule:** every change that adds, removes or changes a feature updates this file in the same
> pull request (and the README when the feature is user-facing). New features get the next free
> ID in their section; IDs are never reused.

Status: **shipped** (in the code on `main`), **planned** (agreed, not built yet).

## Discovery

| ID  | Feature                                                                                        | CLI surface            | Status  | Notes                           |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------- | ------- | ------------------------------- |
| D1  | Scan the repo containing the current directory                                                 | default                | shipped |                                 |
| D2  | Scan explicit repos (any path inside a repo)                                                   | `-r, --repo <path...>` | shipped | Overrides the current directory |
| D3  | Scan every repo herdr knows: repos of herdr workspaces + repos owning `~/.herdr/worktrees/*/*` | `-g, --global`         | shipped |                                 |
| D4  | List linked worktrees only; the main checkout is never a candidate                             | all commands           | shipped | `git worktree list --porcelain` |
| D5  | Skip detached-HEAD worktrees (no branch, no PR)                                                | all commands           | shipped |                                 |
| D6  | Detect uncommitted changes (tracked or untracked) per worktree                                 | all commands           | shipped | Drives the dirty guard (C3)     |
| D7  | Detect which herdr workspace has a worktree open                                               | all commands           | shipped | Drives herdr-aware removal (C5) |
| D8  | Per-repo problems become warnings; the rest of the scan continues                              | all commands           | shipped |                                 |

## PR status

| ID  | Feature                                                        | CLI surface           | Status  | Notes                                        |
| --- | -------------------------------------------------------------- | --------------------- | ------- | -------------------------------------------- |
| P1  | Look up the most recent PR whose head is the worktree's branch | all commands          | shipped | GitHub REST API, repo from its GitHub remote |
| P2  | Show only worktrees whose PR is merged                         | default               | shipped |                                              |
| P3  | Also show open / draft / closed PRs, with their state          | `-a, --all`           | shipped | Only merged ones are cleanable               |
| P4  | List as a table                                                | `wtclean list` / `ls` | shipped |                                              |
| P5  | List as JSON                                                   | `list --json`         | shipped | Scriptable                                   |

## Cleanup

| ID  | Feature                                                                                                         | CLI surface     | Status  | Notes                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------- | ------- | ------------------------------------------------------ |
| C1  | Remove every merged worktree in scope                                                                           | `wtclean clean` | shipped |                                                        |
| C2  | Confirmation prompt in a TTY; skip it                                                                           | `-y, --yes`     | shipped | Prompt only shown in a TTY                             |
| C3  | Skip dirty worktrees; remove them anyway                                                                        | `-f, --force`   | shipped |                                                        |
| C4  | Skip the worktree you are currently in                                                                          | always          | shipped | Not overridable                                        |
| C5  | Worktree open in a herdr workspace (inside herdr) is removed via `herdr worktree remove`, closing the workspace | always          | shipped | Falls back to `git worktree remove` otherwise          |
| C6  | Delete the local branch with `git branch -D`; keep it                                                           | `--keep-branch` | shipped | `-D` because squash/rebase merges look unmerged to git |
| C7  | Dry run: report what would happen, change nothing                                                               | `-n, --dry-run` | shipped |                                                        |
| C8  | Per-worktree result: removed / skipped / failed / dry-run, with a reason                                        | `clean`, TUI    | shipped |                                                        |

## TUI

| ID  | Feature                                    | CLI surface                            | Status  | Notes                           |
| --- | ------------------------------------------ | -------------------------------------- | ------- | ------------------------------- |
| T1  | Interactive list of worktrees and PR state | `wtclean tui`; bare `wtclean` in a TTY | shipped | ink                             |
| T2  | Move                                       | `↑`/`↓`, `k`/`j`                       | shipped |                                 |
| T3  | Select one / all or none                   | `space` / `a`                          | shipped | Only merged rows are selectable |
| T4  | Clean the selection, with confirmation     | `enter` / `d`                          | shipped |                                 |
| T5  | Toggle force (include dirty worktrees)     | `f`                                    | shipped |                                 |
| T6  | Open the PR in the browser                 | `o`                                    | shipped |                                 |
| T7  | Rescan                                     | `r`                                    | shipped |                                 |
| T8  | Quit                                       | `q` / `esc`                            | shipped |                                 |
| T9  | Scope and auth options as in the CLI       | `-g`, `-r`, `-a`, `--token`            | shipped |                                 |

## herdr plugin

| ID  | Feature                                                          | CLI surface                                         | Status  | Notes                                               |
| --- | ---------------------------------------------------------------- | --------------------------------------------------- | ------- | --------------------------------------------------- |
| H1  | Installable plugin manifest (`herdr-plugin.toml`, herdr ≥ 0.9.0) | `herdr plugin install AdamSiekierski/wtclean-herdr` | shipped | Build: `bun install --production --frozen-lockfile` |
| H2  | Pane `tui`: TUI over every herdr repo, overlay placement         | `wtclean tui --global`                              | shipped |                                                     |
| H3  | Pane `tui-all`: same, every PR state                             | `wtclean tui --global --all`                        | shipped |                                                     |
| H4  | Actions `open` / `open-all`, bindable to a key                   | `adamsiekierski.wtclean.open`, `.open-all`          | shipped | Contexts: global, workspace                         |

## Auth

| ID  | Feature                                                                        | CLI surface     | Status  | Notes                                |
| --- | ------------------------------------------------------------------------------ | --------------- | ------- | ------------------------------------ |
| A1  | Token from a flag                                                              | `--token <pat>` | shipped | Highest priority                     |
| A2  | Token from the environment: `WTCLEAN_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN` | env             | shipped | In that order                        |
| A3  | Token from the GitHub CLI login                                                | `gh auth token` | shipped | The default when nothing else is set |
| A4  | Works with classic (`repo`) and fine-grained (Pull requests: read) PATs        | —               | shipped |                                      |

## Tooling / guards

| ID  | Feature                                       | CLI surface                     | Status  | Notes                                                                            |
| --- | --------------------------------------------- | ------------------------------- | ------- | -------------------------------------------------------------------------------- |
| G1  | Type checking (strict TypeScript)             | `bun run typecheck`             | shipped |                                                                                  |
| G2  | Lint with oxlint, warnings fail               | `bun run lint`                  | shipped | `.oxlintrc.json`                                                                 |
| G3  | Format with oxfmt                             | `bun run format[:check]`        | shipped | `.oxfmtrc.json`, print width 100                                                 |
| G4  | Tests with the Bun test runner                | `bun test`                      | shipped |                                                                                  |
| G5  | One command for all guards                    | `bun run check`                 | shipped | Also runs before `npm publish`                                                   |
| G6  | CI on push / PR to `main`                     | `.github/workflows/ci.yml`      | shipped |                                                                                  |
| G7  | Dependabot for npm and GitHub Actions, weekly | `.github/dependabot.yml`        | shipped |                                                                                  |
| G8  | Publish to npm from a GitHub release          | `.github/workflows/release.yml` | shipped | Tag `vX.Y.Z` must match `package.json`; prerelease → `next` dist-tag; provenance |

## Planned / ideas

| ID  | Feature                                                                     | CLI surface (sketch)            | Status  | Notes                             |
| --- | --------------------------------------------------------------------------- | ------------------------------- | ------- | --------------------------------- |
| X1  | GitHub Enterprise Server hosts                                              | `--host`, from remote URL       | planned | API base URL per remote host      |
| X2  | Delete the remote branch too (when GitHub didn't already)                   | `--delete-remote`               | planned | Opt-in only                       |
| X3  | Config file (defaults for scope, force, keep-branch, …)                     | `~/.config/wtclean/config.toml` | planned |                                   |
| X4  | Treat closed (unmerged) PRs as cleanable, opt-in                            | `--include-closed`              | planned | Still never open/draft            |
| X5  | Clean worktrees whose branch is merged into the default branch without a PR | `--no-pr`                       | planned | Local `git branch --merged` check |
| X6  | Batch PR lookups (GraphQL) for repos with many worktrees                    | —                               | planned | Fewer API calls / rate limit      |
| X7  | herdr event hook: offer cleanup when a PR merges                            | `[[events]]`                    | planned | Needs a herdr event or polling    |
