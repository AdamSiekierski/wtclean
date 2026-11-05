import { existsSync, realpathSync } from "node:fs";
import { dirname } from "node:path";
import { run } from "./exec.ts";
import type { Repo, Worktree } from "./types.ts";

/** Raw entry from `git worktree list --porcelain`. */
export interface PorcelainEntry {
  path: string;
  head: string;
  branch?: string;
  bare: boolean;
  prunable: boolean;
}

/** Resolves symlinks when the path exists; returns it unchanged otherwise. */
export function realpath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/** Main checkout root for any path inside a repo, including linked worktrees. */
export async function repoRootOf(path: string): Promise<string> {
  if (!existsSync(path)) throw new Error(`path does not exist: ${path}`);
  const commonDir = await run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: path,
  });
  return realpath(dirname(commonDir));
}

/** Parses `git worktree list --porcelain`. The first entry is the main worktree. */
export function parseWorktreePorcelain(text: string): PorcelainEntry[] {
  const entries: PorcelainEntry[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const entry: PorcelainEntry = { path: "", head: "", bare: false, prunable: false };
    for (const line of block.split("\n")) {
      const [key = "", ...rest] = line.split(" ");
      const value = rest.join(" ");
      if (key === "worktree") entry.path = value;
      else if (key === "HEAD") entry.head = value;
      else if (key === "branch") entry.branch = value.replace(/^refs\/heads\//, "");
      else if (key === "bare") entry.bare = true;
      else if (key === "prunable") entry.prunable = true;
    }
    if (entry.path) entries.push(entry);
  }
  return entries;
}

async function isDirty(path: string): Promise<boolean> {
  if (!existsSync(path)) return false;
  try {
    return (await run("git", ["status", "--porcelain"], { cwd: path })) !== "";
  } catch {
    return false;
  }
}

/** Linked worktrees of a repo (main and bare entries excluded). */
export async function listWorktrees(repo: Repo): Promise<Worktree[]> {
  const text = await run("git", ["worktree", "list", "--porcelain"], { cwd: repo.root });
  const linked = parseWorktreePorcelain(text)
    .slice(1)
    .filter((e) => !e.bare);
  return Promise.all(
    linked.map(async (e) => ({
      repo,
      path: e.path,
      branch: e.branch,
      head: e.head,
      dirty: e.prunable ? false : await isDirty(e.path),
    })),
  );
}

/** Extracts owner/name from a GitHub remote URL. */
export function parseGithubRemote(url: string): { owner: string; name: string } | undefined {
  const match = url
    .trim()
    .match(
      /^(?:https?:\/\/(?:[^@/]+@)?|ssh:\/\/git@|git@)github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
    );
  if (!match?.[1] || !match[2]) return undefined;
  return { owner: match[1], name: match[2] };
}

/** GitHub owner/name of the repo's `origin`, or undefined if it isn't on GitHub. */
export async function githubSlug(repo: Repo): Promise<{ owner: string; name: string } | undefined> {
  try {
    return parseGithubRemote(await run("git", ["remote", "get-url", "origin"], { cwd: repo.root }));
  } catch {
    return undefined;
  }
}

export async function removeWorktree(repo: Repo, path: string, force: boolean): Promise<void> {
  const args = ["worktree", "remove", ...(force ? ["--force"] : []), path];
  await run("git", args, { cwd: repo.root });
}

/** Force-deletes a branch (`-D`: squash merges make `-d` refuse). */
export async function deleteBranch(repo: Repo, branch: string): Promise<void> {
  await run("git", ["branch", "-D", branch], { cwd: repo.root });
}
