import { describe, expect, test } from "bun:test";
import {
  formatResult,
  formatTable,
  paint,
  stateColor,
  summarize,
  tildify,
  truncate,
} from "./format.ts";
import type { CleanResult, MergedWorktree, PrWorktree } from "./types.ts";

const repo = { root: "/home/me/code/app", name: "app" };

function wt(
  branch: string,
  state: PrWorktree["pr"]["state"],
  extra: Partial<PrWorktree> = {},
): PrWorktree {
  return {
    repo,
    path: `/home/me/code/app-wt/${branch}`,
    branch,
    head: "abc123",
    dirty: false,
    pr: { number: 42, title: `Title of ${branch}`, url: "https://github.com/o/app/pull/42", state },
    ...extra,
  };
}

describe("truncate", () => {
  test("leaves short text alone", () => expect(truncate("hello", 10)).toBe("hello"));
  test("cuts with an ellipsis", () => expect(truncate("hello world", 6)).toBe("hello…"));
  test("handles tiny widths", () => {
    expect(truncate("hello", 1)).toBe("…");
    expect(truncate("hello", 0)).toBe("");
  });
});

describe("tildify", () => {
  test("replaces the home prefix", () =>
    expect(tildify("/home/me/code/x", "/home/me")).toBe("~/code/x"));
  test("home itself", () => expect(tildify("/home/me", "/home/me")).toBe("~"));
  test("does not match partial segments", () =>
    expect(tildify("/home/meow/x", "/home/me")).toBe("/home/meow/x"));
});

test("stateColor", () => {
  expect(stateColor("merged")).toBe("magenta");
  expect(stateColor("open")).toBe("green");
  expect(stateColor("draft")).toBe("gray");
  expect(stateColor("closed")).toBe("red");
});

test("paint only emits ANSI when enabled", () => {
  expect(paint("x", "red", false)).toBe("x");
  expect(paint("x", "red", true)).toBe("\u001B[31mx\u001B[39m");
});

test("formatTable groups by repo and shows markers", () => {
  const out = formatTable(
    [wt("feat-a", "merged", { dirty: true }), wt("feat-b", "open", { herdrWorkspaceId: "w1" })],
    {
      color: false,
      home: "/home/me",
    },
  );
  const lines = out.split("\n");
  expect(lines[0]).toBe("app ~/code/app");
  expect(lines[1]).toContain("feat-a");
  expect(lines[1]).toContain("#42");
  expect(lines[1]).toContain("merged");
  expect(lines[1]).toContain("dirty");
  expect(lines[1]).toContain("~/code/app-wt/feat-a");
  expect(lines[2]).toContain("herdr");
});

test("formatTable truncates titles to the width", () => {
  const long = wt("b", "merged", {
    pr: { number: 1, title: "x".repeat(200), url: "", state: "merged" },
  });
  const [, row] = formatTable([long], { color: false, home: "/home/me", width: 80 }).split("\n");
  expect(row).toContain("…");
  expect(row!.length).toBeLessThanOrEqual(80);
});

test("formatResult and summarize", () => {
  const w = wt("feat-a", "merged") as MergedWorktree;
  const results: CleanResult[] = [
    { worktree: w, status: "removed" },
    { worktree: w, status: "skipped", message: "dirty" },
    { worktree: w, status: "failed", message: "boom" },
  ];
  expect(formatResult(results[1]!, false, "/home/me")).toBe(
    "skipped  app/feat-a ~/code/app-wt/feat-a — dirty",
  );
  expect(summarize(results)).toBe("1 removed, 1 skipped, 1 failed");
  expect(summarize([{ worktree: w, status: "dry-run" }])).toBe("1 would be removed");
});
