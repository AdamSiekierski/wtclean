# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Renamed the repository and npm package from `wtclean-herdr` to `wtclean`.

## [0.1.0] - Unreleased

### Added

- `wtclean list` (`ls`): list linked worktrees whose GitHub PR is merged; `--json` output.
- `wtclean clean`: remove merged worktrees and their local branches, with `--yes`, `--force`,
  `--keep-branch` and `--dry-run`; asks for confirmation in a terminal.
- `wtclean tui` (and bare `wtclean` in a terminal): pick worktrees to clean interactively.
- Scope options on every command: default scope is every repo herdr knows plus the current one; `--here`, `--repo`, `--all`
  (show PRs in any state).
- GitHub auth from `--token`, `WTCLEAN_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN` or `gh auth token`.
- Safety: skips dirty worktrees (unless `--force`) and the current worktree, never touches the
  main checkout.
- herdr integration: worktrees open in a herdr workspace are removed through
  `herdr worktree remove`.
- herdr plugin manifest with `open` and `open-all` actions.

[Unreleased]: https://github.com/AdamSiekierski/wtclean/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AdamSiekierski/wtclean/releases/tag/v0.1.0
