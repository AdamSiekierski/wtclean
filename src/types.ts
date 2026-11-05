/** A git repository whose worktrees we inspect. */
export interface Repo {
  /** Absolute path of the main checkout (repo root). */
  root: string;
  /** Display name, basename of root. */
  name: string;
}

/** One linked worktree of a repo (the main checkout is never included). */
export interface Worktree {
  repo: Repo;
  /** Absolute checkout path. */
  path: string;
  /** Short branch name (no refs/heads/), undefined when detached. */
  branch?: string;
  /** HEAD commit sha. */
  head: string;
  /** Uncommitted changes (tracked or untracked) present. */
  dirty: boolean;
  /** Herdr workspace id that currently has this worktree open, if any. */
  herdrWorkspaceId?: string;
}

export type PrState = "open" | "draft" | "merged" | "closed";

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: PrState;
  /** ISO timestamp, set only when merged. */
  mergedAt?: string;
}

/** A linked worktree whose branch has a PR on GitHub (most recent PR for that branch). */
export interface PrWorktree extends Worktree {
  branch: string;
  pr: PullRequest;
}

/** A worktree whose PR is merged — a cleanup candidate. */
export interface MergedWorktree extends PrWorktree {
  pr: PullRequest & { state: "merged"; mergedAt: string };
}

export interface ScanOptions {
  /** Scan every repo herdr knows about instead of just cwd (CLI: --global / -g). */
  global: boolean;
  /** Include PRs in any state, not only merged (CLI: --all / -a). */
  allStates: boolean;
  /** GitHub token. When undefined, resolved via `gh auth token`. */
  token?: string;
  /** Explicit repo paths (any path inside a repo). Overrides cwd when given. */
  repos: string[];
  /** Working directory used when neither all nor repos is given. */
  cwd: string;
}

export interface ScanResult {
  /** Worktrees with a PR. Only merged ones unless allStates. Sorted by repo name, then branch. */
  worktrees: PrWorktree[];
  /** Non-fatal per-repo problems (e.g. gh failed for one repo). */
  warnings: string[];
}

export interface CleanOptions {
  /** Remove even when the worktree is dirty. */
  force: boolean;
  /** Keep the local branch after removing the worktree. */
  keepBranch: boolean;
  /** Only report what would happen. */
  dryRun: boolean;
}

export type CleanStatus = "removed" | "skipped" | "failed" | "dry-run";

export interface CleanResult {
  worktree: MergedWorktree;
  status: CleanStatus;
  /** Human-readable reason / error text. */
  message?: string;
}
