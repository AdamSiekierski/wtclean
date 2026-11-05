# wtclean

[![CI](https://github.com/AdamSiekierski/wtclean-herdr/actions/workflows/ci.yml/badge.svg)](https://github.com/AdamSiekierski/wtclean-herdr/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Your PR got merged. Its worktree didn't go anywhere.** `wtclean` finds every git linked
worktree whose branch's GitHub pull request has been merged and removes it, together with its
local branch. Clean them all at once, or pick them one by one in a terminal UI. It also ships
as a [herdr](https://herdr.dev) plugin, so one key sweeps every repo herdr knows about.

<!-- TODO: demo GIF of `wtclean` (record with vhs, ~10s: scan, select, clean). -->

## Features

- **Finds merged worktrees**: lists linked worktrees, looks up the PR for each branch on GitHub,
  and keeps the merged ones.
- **All your repos at once**: by default every repo herdr knows about plus the one you are in;
  narrow it with `--here` (current repo) or `--repo <path...>`.
- **See everything**: `--all` also shows worktrees whose PR is open, draft or closed, with the
  state, so you can see what is still in flight.
- **Bulk or one by one**: `wtclean clean` for all of them, `wtclean tui` to pick.
- **Safe by default**: skips dirty worktrees and the one you are standing in, never touches the
  main checkout, asks before deleting, and has `--dry-run`.
- **herdr aware**: a worktree open in a herdr workspace is removed through herdr, so the
  workspace closes with it.
- **Scriptable**: `wtclean list --json`.
- **Zero-config auth**: uses your GitHub CLI login, or a token from the environment.

## Requirements

- [Bun](https://bun.sh) 1.2 or newer (wtclean runs its TypeScript sources directly, no build step)
- git
- The [GitHub CLI](https://cli.github.com) logged in (`gh auth login`), or a GitHub personal
  access token (see [Authentication](#authentication))
- [herdr](https://herdr.dev) 0.9.0 or newer, optional: used to discover your repos and for the plugin

## Install

```sh
bun add -g wtclean-herdr   # installs the `wtclean` command
```

Or run it without installing:

```sh
bunx wtclean-herdr list
```

From source:

```sh
git clone https://github.com/AdamSiekierski/wtclean-herdr.git
cd wtclean-herdr
bun install
bun link            # puts `wtclean` on your PATH
```

## herdr plugin

```sh
herdr plugin install AdamSiekierski/wtclean-herdr
```

The plugin adds two actions, each opening the wtclean TUI in an overlay over all your repos:

| Action id                         | Opens                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `adamsiekierski.wtclean.open`     | Worktrees with a merged PR (`wtclean tui`)             |
| `adamsiekierski.wtclean.open-all` | Worktrees with a PR in any state (`wtclean tui --all`) |

Run one from the command line:

```sh
herdr plugin action invoke open --plugin adamsiekierski.wtclean
```

Or bind it to a key in `~/.config/herdr/config.toml`:

```toml
[[keys.command]]
key = "prefix+w"
type = "plugin_action"
command = "adamsiekierski.wtclean.open"
description = "clean merged worktrees"
```

`bun` must be on the `PATH` herdr runs plugins with.

## Usage

```sh
wtclean                 # in a terminal: opens the TUI over all your repos
wtclean list            # merged worktrees across all your repos (alias: ls)
wtclean list --all      # ...plus worktrees whose PR is open, draft or closed
wtclean list --json     # machine-readable output
wtclean list --here     # only the repo you are in
wtclean list -r ~/code/api ~/code/web   # specific repos (any path inside a repo works)

wtclean clean           # remove all merged worktrees (asks first)
wtclean clean -n        # dry run: show what would be removed
wtclean clean --here -y # current repo only, no confirmation
wtclean clean --force   # also remove worktrees with uncommitted changes
wtclean clean --keep-branch   # remove worktrees, keep their local branches

wtclean tui             # pick worktrees to clean interactively
wtclean tui --all       # every PR state
```

### Options

Shared by every command:

| Option                 | Description                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `--here`               | Only scan the repo containing the current directory                                     |
| `-r, --repo <path...>` | Scan only these repos (any path inside a repo)                                          |
| `-a, --all`            | Also show worktrees whose PR is open, draft or closed (only merged ones can be cleaned) |
| `--token <pat>`        | GitHub token to use (see [Authentication](#authentication))                             |

`list`:

| Option   | Description |
| -------- | ----------- |
| `--json` | Print JSON  |

`clean`:

| Option          | Description                                       |
| --------------- | ------------------------------------------------- |
| `-y, --yes`     | Don't ask for confirmation                        |
| `-f, --force`   | Also remove worktrees with uncommitted changes    |
| `--keep-branch` | Keep the local branch after removing the worktree |
| `-n, --dry-run` | Show what would happen, change nothing            |

In a terminal, `clean` asks for confirmation unless `--yes` is given.

### TUI keys

| Key              | Action                                 |
| ---------------- | -------------------------------------- |
| `↑`/`↓`, `k`/`j` | Move                                   |
| `space`          | Select / unselect                      |
| `a`              | Select all / none                      |
| `enter`, `d`     | Clean the selection (asks to confirm)  |
| `f`              | Toggle force (include dirty worktrees) |
| `o`              | Open the PR in your browser            |
| `r`              | Rescan                                 |
| `q`, `esc`       | Quit                                   |

## Authentication

wtclean talks to the GitHub REST API. It uses the first token it finds:

1. `--token <pat>`
2. `WTCLEAN_GITHUB_TOKEN`
3. `GITHUB_TOKEN`
4. `GH_TOKEN`
5. `gh auth token`, your GitHub CLI login (the default for most people)

A personal access token needs read access to pull requests:

- **Classic**: the `repo` scope for private repos (no scope needed for public ones).
- **Fine-grained**: _Pull requests: Read-only_ on the repos you clean.

## Safety

wtclean deletes things, so it is careful about what:

- **Only merged PRs are cleanable.** Open, draft and closed PRs are shown with `--all` but never
  removed.
- **Never the main checkout.** Only linked worktrees are considered.
- **Never the worktree you are in.** It is skipped.
- **Never uncommitted work**, unless you pass `--force` (or press `f` in the TUI).
- **Asks first** in a terminal; `--dry-run` shows the plan without touching anything.
- **Local branches only.** The branch is removed with `git branch -D` (it is merged, but a
  squash or rebase merge leaves git unable to tell); `--keep-branch` keeps it. Remote branches
  are never touched.

## How it works

1. **Discover repos**: by default every repo with a herdr workspace, every repo owning a checkout
   under `~/.herdr/worktrees/*/*`, and the repo you are in (if any). `--here` limits it to the
   current repo, `--repo` to the given paths.
2. **List worktrees**: `git worktree list --porcelain`, dropping the main checkout and detached
   HEADs, and noting which ones have uncommitted changes.
3. **Look up PRs**: for each branch, the most recent PR with that head branch on the repo's
   GitHub remote, via the REST API.
4. **Clean**: for each selected merged worktree, if it is open in a herdr workspace (and you are
   inside herdr) it is removed with `herdr worktree remove` so the workspace closes; otherwise
   with `git worktree remove`. Then `git branch -D` deletes the local branch, unless
   `--keep-branch`.

## Development

```sh
bun install
bun run start -- list     # run the CLI from source
bun run check             # everything CI runs
```

| Script                 | What it does          |
| ---------------------- | --------------------- |
| `bun run typecheck`    | `tsc --noEmit`        |
| `bun run lint`         | oxlint, warnings fail |
| `bun run format`       | oxfmt, writes         |
| `bun run format:check` | oxfmt, checks only    |
| `bun test`             | Bun test runner       |
| `bun run check`        | All of the above      |

CI runs `bun run check`'s steps on every push and pull request to `main`. Every feature change
updates [docs/FEATURES.md](docs/FEATURES.md) and this README. See
[CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE) © 2026 Adam Siekierski
