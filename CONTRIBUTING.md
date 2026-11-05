# Contributing

Thanks for helping out. Bug reports, ideas and pull requests are all welcome.

## Setup

You need [Bun](https://bun.sh) 1.2+, git, and optionally the GitHub CLI and
[herdr](https://herdr.dev).

```sh
git clone https://github.com/AdamSiekierski/wtclean-herdr.git
cd wtclean-herdr
bun install
bun run start -- list    # run the CLI from source
```

To try the herdr plugin from your checkout:

```sh
herdr plugin link "$PWD"
herdr plugin action invoke open --plugin adamsiekierski.wtclean
herdr plugin unlink adamsiekierski.wtclean   # when done
```

## Before you open a pull request

- `bun run check` passes (typecheck, lint, format check, tests). `bun run format` fixes
  formatting.
- New behaviour has tests. Tests must not call the real GitHub API or a running herdr.
- **Feature changes update [docs/FEATURES.md](docs/FEATURES.md)**, plus the README and
  `CHANGELOG.md` (under _Unreleased_) when users will notice.
- Cleanup stays safe: see the rules in [AGENTS.md](AGENTS.md).

Keep pull requests focused; one change per PR is easiest to review.

## Reporting bugs

Open an issue with the bug report template. Include `wtclean --version`, `bun --version`,
`git --version`, your OS, and `herdr --version` if herdr is involved. For security problems see
[SECURITY.md](SECURITY.md) instead.
