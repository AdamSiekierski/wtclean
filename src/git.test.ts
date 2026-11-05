import { expect, test } from "bun:test";
import { parseGithubRemote, parseWorktreePorcelain } from "./git.ts";

test("parseWorktreePorcelain reads main, linked, detached, bare and prunable entries", () => {
  const text = [
    "worktree /repo",
    "HEAD aaa",
    "branch refs/heads/main",
    "",
    "worktree /wt/feature x",
    "HEAD bbb",
    "branch refs/heads/feat/thing",
    "",
    "worktree /wt/detached",
    "HEAD ccc",
    "detached",
    "",
    "worktree /wt/gone",
    "HEAD ddd",
    "branch refs/heads/gone",
    "prunable gitdir file points to non-existent location",
    "",
    "worktree /bare",
    "bare",
    "",
  ].join("\n");
  expect(parseWorktreePorcelain(text)).toEqual([
    { path: "/repo", head: "aaa", branch: "main", bare: false, prunable: false },
    { path: "/wt/feature x", head: "bbb", branch: "feat/thing", bare: false, prunable: false },
    { path: "/wt/detached", head: "ccc", bare: false, prunable: false },
    { path: "/wt/gone", head: "ddd", branch: "gone", bare: false, prunable: true },
    { path: "/bare", head: "", bare: true, prunable: false },
  ]);
});

test("parseGithubRemote handles common GitHub URL forms", () => {
  const slug = { owner: "o", name: "r" };
  expect(parseGithubRemote("https://github.com/o/r.git")).toEqual(slug);
  expect(parseGithubRemote("https://github.com/o/r")).toEqual(slug);
  expect(parseGithubRemote("https://user@github.com/o/r.git")).toEqual(slug);
  expect(parseGithubRemote("git@github.com:o/r.git")).toEqual(slug);
  expect(parseGithubRemote("git@github.com:o/r")).toEqual(slug);
  expect(parseGithubRemote("ssh://git@github.com/o/r.git")).toEqual(slug);
  expect(parseGithubRemote("git@gitlab.com:o/r.git")).toBeUndefined();
  expect(parseGithubRemote("https://example.com/o/r")).toBeUndefined();
});
