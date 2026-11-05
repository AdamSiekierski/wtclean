import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { githubSlug, listWorktrees, realpath, repoRootOf } from "./git.ts";
import { findPr, resolveToken } from "./github.ts";
import { herdrWorkspaces, type HerdrWorkspace } from "./herdr.ts";
import type {
  MergedWorktree,
  PrWorktree,
  Repo,
  ScanOptions,
  ScanResult,
  Worktree,
} from "./types.ts";

const CONCURRENCY = 6;

export function isMerged(w: PrWorktree): w is MergedWorktree {
  return w.pr.state === "merged" && w.pr.mergedAt !== undefined;
}

/** Maps over items with at most `limit` promises in flight. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function subdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(dir, d.name));
  } catch {
    return [];
  }
}

/** Checkout dirs under ~/.herdr/worktrees/<repo>/<name>. */
function herdrWorktreeDirs(): string[] {
  return subdirs(join(homedir(), ".herdr", "worktrees")).flatMap(subdirs);
}

async function discoverableRoots(paths: string[]): Promise<string[]> {
  const roots = await Promise.all(paths.map((p) => repoRootOf(p).catch(() => undefined)));
  return roots.filter((r): r is string => r !== undefined);
}

async function resolveRepoRoots(
  opts: ScanOptions,
  workspaces: HerdrWorkspace[],
): Promise<string[]> {
  if (opts.repos.length > 0) return Promise.all(opts.repos.map(repoRootOf));
  if (opts.here) return [await repoRootOf(opts.cwd)];
  return [
    ...workspaces.map((w) => realpath(w.repoRoot)),
    ...(await discoverableRoots([opts.cwd, ...herdrWorktreeDirs()])),
  ];
}

async function withPr(
  token: string,
  slug: { owner: string; name: string },
  w: Worktree,
): Promise<PrWorktree | undefined> {
  if (!w.branch) return undefined;
  const pr = await findPr(token, slug, w.branch);
  return pr && { ...w, branch: w.branch, pr };
}

async function scanRepo(
  repo: Repo,
  token: string,
  workspaceByPath: Map<string, string>,
): Promise<{ worktrees: PrWorktree[]; warning?: string }> {
  const slug = await githubSlug(repo);
  if (!slug)
    return { worktrees: [], warning: `${repo.name}: origin is not a GitHub remote, skipped` };
  const worktrees = (await listWorktrees(repo)).map((w) => ({
    ...w,
    herdrWorkspaceId: workspaceByPath.get(realpath(w.path)),
  }));
  const found = await mapLimit(worktrees, CONCURRENCY, (w) => withPr(token, slug, w));
  return { worktrees: found.filter((w): w is PrWorktree => w !== undefined) };
}

export async function scan(
  opts: ScanOptions,
  onProgress?: (msg: string) => void,
): Promise<ScanResult> {
  const workspaces = await herdrWorkspaces();
  const roots = [...new Set((await resolveRepoRoots(opts, workspaces)).map(realpath))];
  const token = await resolveToken(opts.token);
  const workspaceByPath = new Map(workspaces.map((w) => [realpath(w.checkoutPath), w.workspaceId]));

  const worktrees: PrWorktree[] = [];
  const warnings: string[] = [];
  for (const root of roots) {
    const repo: Repo = { root, name: basename(root) };
    onProgress?.(`Scanning ${repo.name}…`);
    try {
      const result = await scanRepo(repo, token, workspaceByPath);
      worktrees.push(...result.worktrees);
      if (result.warning) warnings.push(result.warning);
    } catch (err) {
      warnings.push(`${repo.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    worktrees: worktrees
      .filter((w) => opts.allStates || isMerged(w))
      .toSorted(
        (a, b) => a.repo.name.localeCompare(b.repo.name) || a.branch.localeCompare(b.branch),
      ),
    warnings,
  };
}
