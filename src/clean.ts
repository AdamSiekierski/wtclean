import { sep } from "node:path";
import { deleteBranch, realpath, removeWorktree } from "./git.ts";
import { inHerdr, removeHerdrWorktree } from "./herdr.ts";
import type { CleanOptions, CleanResult, MergedWorktree } from "./types.ts";

function isInside(child: string, parent: string): boolean {
  const c = realpath(child);
  const p = realpath(parent);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function useHerdr(w: MergedWorktree): w is MergedWorktree & { herdrWorkspaceId: string } {
  return w.herdrWorkspaceId !== undefined && inHerdr();
}

function plannedActions(w: MergedWorktree, opts: CleanOptions): string {
  const actions = [
    useHerdr(w)
      ? `close herdr workspace ${w.herdrWorkspaceId} and remove worktree ${w.path}`
      : `remove worktree ${w.path}`,
  ];
  if (!opts.keepBranch) actions.push(`delete branch ${w.branch}`);
  return `would ${actions.join(", ")}`;
}

export async function cleanWorktree(w: MergedWorktree, opts: CleanOptions): Promise<CleanResult> {
  if (isInside(process.cwd(), w.path)) {
    return { worktree: w, status: "skipped", message: "current directory is inside this worktree" };
  }
  if (w.dirty && !opts.force) {
    return {
      worktree: w,
      status: "skipped",
      message: "worktree has uncommitted changes (use --force)",
    };
  }
  if (opts.dryRun) return { worktree: w, status: "dry-run", message: plannedActions(w, opts) };

  try {
    // `herdr worktree remove` runs `git worktree remove` and closes the workspace, but keeps the branch.
    if (useHerdr(w)) await removeHerdrWorktree(w.herdrWorkspaceId, opts.force);
    else await removeWorktree(w.repo, w.path, opts.force);
  } catch (err) {
    return { worktree: w, status: "failed", message: errorText(err) };
  }

  if (opts.keepBranch) return { worktree: w, status: "removed", message: "branch kept" };
  try {
    await deleteBranch(w.repo, w.branch);
    return { worktree: w, status: "removed" };
  } catch (err) {
    return {
      worktree: w,
      status: "removed",
      message: `worktree removed, but branch delete failed: ${errorText(err)}`,
    };
  }
}

export async function cleanAll(
  ws: MergedWorktree[],
  opts: CleanOptions,
  onResult?: (r: CleanResult) => void,
): Promise<CleanResult[]> {
  const results: CleanResult[] = [];
  for (const w of ws) {
    const result = await cleanWorktree(w, opts);
    onResult?.(result);
    results.push(result);
  }
  return results;
}
