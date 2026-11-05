import { expect, mock, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { render } from "ink-testing-library";
import type {
  CleanOptions,
  CleanResult,
  MergedWorktree,
  PrWorktree,
  ScanOptions,
} from "../types.ts";

const repo = { root: "/repos/app", name: "app" };
const merged: MergedWorktree = {
  repo,
  path: "/repos/app-wt/feat-done",
  branch: "feat-done",
  head: "a1",
  dirty: false,
  pr: {
    number: 7,
    title: "Finished work",
    url: "https://github.com/o/app/pull/7",
    state: "merged",
    mergedAt: "2026-01-01T00:00:00Z",
  },
};
const open: PrWorktree = {
  repo,
  path: "/repos/app-wt/feat-wip",
  branch: "feat-wip",
  head: "b2",
  dirty: true,
  pr: { number: 8, title: "Still going", url: "https://github.com/o/app/pull/8", state: "open" },
};

const cleaned: MergedWorktree[][] = [];

// Module mocks are process-wide in bun: keep clean.ts's real exports for other test files.
const realClean = await import("../clean.ts");
mock.module("../scan.ts", () => ({
  isMerged: (w: PrWorktree) => w.pr.state === "merged",
  scan: async () => ({ worktrees: [merged, open], warnings: [] }),
}));
mock.module("../clean.ts", () => ({
  ...realClean,
  cleanAll: async (
    ws: MergedWorktree[],
    _opts: CleanOptions,
    onResult?: (r: CleanResult) => void,
  ) => {
    cleaned.push(ws);
    const results = ws.map((worktree): CleanResult => ({ worktree, status: "removed" }));
    results.forEach((r) => onResult?.(r));
    return results;
  },
}));
const { App } = await import("./App.tsx");

const scanOptions: ScanOptions = { global: false, allStates: true, repos: [], cwd: "/repos/app" };
const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

test("lists worktrees, selects only merged rows and cleans the selection", async () => {
  const {
    lastFrame: rawFrame,
    stdin,
    unmount,
  } = render(<App scanOptions={scanOptions} force={false} keepBranch={false} />);
  await tick();

  // Strip ANSI so assertions hold when the environment forces color (FORCE_COLOR, TTY).
  const lastFrame = () => stripVTControlCharacters(rawFrame() ?? "");
  const frame = lastFrame();
  expect(frame).toContain("feat-done");
  expect(frame).toContain("#7");
  expect(frame).toContain("merged");
  expect(frame).toContain("feat-wip");
  expect(frame).toContain("open");
  expect(frame).toContain("[ ]");

  stdin.write(" ");
  await tick();
  expect(lastFrame()).toContain("[x]");
  expect(lastFrame()).toMatch(/selected 1/);

  // The open PR row cannot be selected.
  stdin.write("j");
  await tick();
  stdin.write(" ");
  await tick();
  expect(lastFrame()).toContain("only merged PRs can be cleaned");
  expect(lastFrame()).toMatch(/selected 1/);

  stdin.write("d");
  await tick();
  expect(lastFrame()).toContain("Remove 1 worktree and branch? [y/N]");

  stdin.write("y");
  await tick();
  expect(cleaned).toEqual([[merged]]);
  expect(lastFrame()).toContain("removed ✓");
  unmount();
});
