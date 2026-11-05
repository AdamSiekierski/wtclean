import { expect, test } from "bun:test";
import { toPullRequest, type ApiPull } from "./github.ts";

const base: ApiPull = {
  number: 7,
  title: "T",
  html_url: "https://x/7",
  state: "open",
  draft: false,
  merged_at: null,
};

test("toPullRequest maps states", () => {
  expect(toPullRequest({ ...base, state: "closed", merged_at: "2026-01-01T00:00:00Z" })).toEqual({
    number: 7,
    title: "T",
    url: "https://x/7",
    state: "merged",
    mergedAt: "2026-01-01T00:00:00Z",
  });
  expect(toPullRequest({ ...base, state: "closed" }).state).toBe("closed");
  expect(toPullRequest({ ...base, draft: true }).state).toBe("draft");
  expect(toPullRequest(base).state).toBe("open");
});
