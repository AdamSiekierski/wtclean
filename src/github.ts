import { run } from "./exec.ts";
import type { PullRequest } from "./types.ts";

const ENV_VARS = ["WTCLEAN_GITHUB_TOKEN", "GITHUB_TOKEN", "GH_TOKEN"] as const;

/** Token from: explicit value, env vars, then `gh auth token`. */
export async function resolveToken(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  for (const name of ENV_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  try {
    const token = await run("gh", ["auth", "token"]);
    if (token) return token;
  } catch {
    // fall through to the error below
  }
  throw new Error(
    "No GitHub token found. Provide one with --token, set WTCLEAN_GITHUB_TOKEN, GITHUB_TOKEN or GH_TOKEN, " +
      "or log in with `gh auth login`.",
  );
}

/** Subset of the GitHub REST pull request object we use. */
export interface ApiPull {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean;
  merged_at: string | null;
  updated_at?: string;
}

export function toPullRequest(api: ApiPull): PullRequest {
  const base = { number: api.number, title: api.title, url: api.html_url };
  if (api.merged_at) return { ...base, state: "merged", mergedAt: api.merged_at };
  if (api.state === "closed") return { ...base, state: "closed" };
  return { ...base, state: api.draft ? "draft" : "open" };
}

function httpError(status: number, body: string): Error {
  if (status === 401)
    return new Error("GitHub rejected the token (401). Check that it is valid and not expired.");
  if (status === 403 || status === 429) {
    return new Error(
      `GitHub refused the request (${status}): rate limit exceeded or the token lacks the \`repo\` scope / ` +
        `repository access. ${body.slice(0, 200)}`,
    );
  }
  if (status === 404) {
    return new Error(
      "Repository not found on GitHub (404). The token may lack access to this private repo.",
    );
  }
  return new Error(`GitHub API error ${status}: ${body.slice(0, 200)}`);
}

/** Most recently updated PR whose head is `owner:branch`, in any state. */
export async function findPr(
  token: string,
  slug: { owner: string; name: string },
  branch: string,
): Promise<PullRequest | undefined> {
  const params = new URLSearchParams({
    state: "all",
    head: `${slug.owner}:${branch}`,
    per_page: "10",
    sort: "updated",
    direction: "desc",
  });
  const res = await fetch(
    `https://api.github.com/repos/${slug.owner}/${slug.name}/pulls?${params}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "wtclean",
      },
    },
  );
  if (!res.ok) throw httpError(res.status, await res.text());
  const pulls = (await res.json()) as ApiPull[];
  const latest = pulls.toSorted((a, b) =>
    (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
  )[0];
  return latest && toPullRequest(latest);
}
