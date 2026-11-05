import { expect, mock, test } from "bun:test";
import type { MergedWorktree } from "./types.ts";

const calls: string[] = [];
// Spread real exports: bun module mocks are process-wide, other test files need the rest.
const realGit = await import("./git.ts");
const realHerdr = await import("./herdr.ts");
mock.module("./git.ts", () => ({
  ...realGit,
  realpath: (p: string) => p,
  removeWorktree: async (_r: unknown, path: string) => void calls.push(`remove ${path}`),
  deleteBranch: async (_r: unknown, branch: string) => void calls.push(`delete ${branch}`),
}));
mock.module("./herdr.ts", () => ({
  ...realHerdr,
  inHerdr: () => false,
  removeHerdrWorktree: async () => void calls.push("herdr"),
}));
const { cleanWorktree } = await import("./clean.ts");

const wt: MergedWorktree = {
  repo: { root: "/nonexistent/repo", name: "repo" },
  path: "/nonexistent/wt",
  branch: "feat",
  head: "abc",
  dirty: false,
  pr: { number: 1, title: "t", url: "u", state: "merged", mergedAt: "2026-01-01T00:00:00Z" },
};
const opts = { force: false, keepBranch: false, dryRun: false };

test("skips when cwd is inside the worktree", async () => {
  const r = await cleanWorktree({ ...wt, path: process.cwd() }, opts);
  expect(r.status).toBe("skipped");
});

test("skips dirty worktrees unless forced", async () => {
  const r = await cleanWorktree({ ...wt, dirty: true }, { ...opts, dryRun: true });
  expect(r.status).toBe("skipped");
  expect(r.message).toContain("--force");
  expect(
    (await cleanWorktree({ ...wt, dirty: true }, { ...opts, force: true, dryRun: true })).status,
  ).toBe("dry-run");
});

test("dry run performs no actions", async () => {
  calls.length = 0;
  const r = await cleanWorktree(wt, { ...opts, dryRun: true });
  expect(r.status).toBe("dry-run");
  expect(r.message).toContain("delete branch feat");
  expect(calls).toEqual([]);
});

test("removes worktree then branch", async () => {
  calls.length = 0;
  expect((await cleanWorktree(wt, opts)).status).toBe("removed");
  expect(calls).toEqual(["remove /nonexistent/wt", "delete feat"]);
});
