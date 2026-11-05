import { run } from "./exec.ts";

export interface HerdrWorkspace {
  workspaceId: string;
  checkoutPath: string;
  repoRoot: string;
  isLinked: boolean;
}

interface WorkspaceListJson {
  result?: {
    workspaces?: {
      workspace_id: string;
      worktree?: { checkout_path: string; repo_root: string; is_linked_worktree: boolean };
    }[];
  };
}

export function inHerdr(): boolean {
  return process.env.HERDR_ENV === "1";
}

/** Herdr workspaces backed by a git checkout. Never throws; [] outside herdr. */
export async function herdrWorkspaces(): Promise<HerdrWorkspace[]> {
  if (!inHerdr()) return [];
  try {
    const json = JSON.parse(await run("herdr", ["workspace", "list"])) as WorkspaceListJson;
    return (json.result?.workspaces ?? []).flatMap((w) =>
      w.worktree
        ? [
            {
              workspaceId: w.workspace_id,
              checkoutPath: w.worktree.checkout_path,
              repoRoot: w.worktree.repo_root,
              isLinked: w.worktree.is_linked_worktree,
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}

/**
 * Removes the worktree checkout behind a herdr workspace and closes the workspace.
 * Refuses dirty checkouts unless `force`. Does NOT delete the branch.
 */
export async function removeHerdrWorktree(workspaceId: string, force: boolean): Promise<void> {
  await run("herdr", [
    "worktree",
    "remove",
    "--workspace",
    workspaceId,
    ...(force ? ["--force"] : []),
  ]);
}
