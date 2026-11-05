import { homedir } from "node:os";
import type { CleanResult, PrState, PrWorktree } from "./types.ts";

export type Color = "magenta" | "green" | "gray" | "red" | "yellow" | "cyan" | "bold" | "dim";

const ANSI: Record<Color, [number, number]> = {
  bold: [1, 22],
  dim: [2, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  gray: [90, 39],
};

/** Wrap text in an ANSI style when enabled. */
export function paint(text: string, color: Color, enabled: boolean): string {
  if (!enabled) return text;
  const [open, close] = ANSI[color];
  return `\u001B[${open}m${text}\u001B[${close}m`;
}

/** Whether to emit ANSI colors on a stream (honours NO_COLOR / FORCE_COLOR). */
export function colorEnabled(stream: { isTTY?: boolean }): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return process.env.FORCE_COLOR !== "0";
  return stream.isTTY === true;
}

export function stateColor(state: PrState): Color {
  switch (state) {
    case "merged":
      return "magenta";
    case "open":
      return "green";
    case "draft":
      return "gray";
    case "closed":
      return "red";
  }
}

/** Shorten text to at most `max` characters, ending with an ellipsis when cut. */
export function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  if (max === 1) return "…";
  return `${text.slice(0, max - 1)}…`;
}

/** Replace the home directory prefix with `~`. */
export function tildify(path: string, home: string = homedir()): string {
  if (!home) return path;
  if (path === home) return "~";
  const prefix = home.endsWith("/") ? home : `${home}/`;
  return path.startsWith(prefix) ? `~/${path.slice(prefix.length)}` : path;
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Group worktrees by repo root, preserving input order. */
export function groupByRepo<T extends PrWorktree>(worktrees: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const w of worktrees) {
    const group = groups.get(w.repo.root);
    if (group) group.push(w);
    else groups.set(w.repo.root, [w]);
  }
  return groups;
}

export interface TableOptions {
  /** Terminal width; undefined disables title truncation. */
  width?: number;
  color: boolean;
  home?: string;
}

/** Plain-text table of worktrees grouped by repo, for `wtclean list` / `clean`. */
export function formatTable(worktrees: PrWorktree[], opts: TableOptions): string {
  const { color, home } = opts;
  const branchW = Math.max(...worktrees.map((w) => w.branch.length));
  const prW = Math.max(...worktrees.map((w) => `#${w.pr.number}`.length));
  const stateW = 6;
  const flagsW = worktrees.some((w) => w.dirty || w.herdrWorkspaceId) ? 11 : 0;

  const lines: string[] = [];
  for (const group of groupByRepo(worktrees).values()) {
    const repo = group[0]!.repo;
    if (lines.length) lines.push("");
    lines.push(
      `${paint(repo.name, "bold", color)} ${paint(tildify(repo.root, home), "dim", color)}`,
    );
    const fixed = 2 + branchW + 2 + prW + 2 + stateW + 2 + (flagsW ? flagsW + 2 : 0);
    const pathW = Math.max(...group.map((w) => tildify(w.path, home).length));
    const longest = Math.max(...group.map((w) => w.pr.title.length));
    const titleW =
      opts.width === undefined
        ? longest
        : Math.min(longest, Math.max(10, opts.width - fixed - 2 - pathW));
    for (const w of group) {
      const flagWords = [...(w.dirty ? ["dirty"] : []), ...(w.herdrWorkspaceId ? ["herdr"] : [])];
      const flags = flagWords
        .map((f) => paint(f, f === "dirty" ? "yellow" : "cyan", color))
        .join(" ");
      const flagsPad = " ".repeat(flagsW - flagWords.join(" ").length);
      const cols = [
        w.branch.padEnd(branchW),
        `#${w.pr.number}`.padEnd(prW),
        paint(w.pr.state.padEnd(stateW), stateColor(w.pr.state), color),
        ...(flagsW ? [flags + flagsPad] : []),
        truncate(w.pr.title, titleW).padEnd(titleW),
        paint(tildify(w.path, home), "dim", color),
      ];
      lines.push(`  ${cols.join("  ")}`);
    }
  }
  return lines.join("\n");
}

const STATUS_COLOR: Record<CleanResult["status"], Color> = {
  removed: "green",
  "dry-run": "cyan",
  skipped: "yellow",
  failed: "red",
};

export function statusColor(status: CleanResult["status"]): Color {
  return STATUS_COLOR[status];
}

/** One line describing a clean result. */
export function formatResult(r: CleanResult, color: boolean, home?: string): string {
  const w = r.worktree;
  const label = paint(r.status.padEnd(7), STATUS_COLOR[r.status], color);
  const where = `${w.repo.name}/${w.branch} ${paint(tildify(w.path, home), "dim", color)}`;
  return `${label}  ${where}${r.message ? ` — ${r.message}` : ""}`;
}

/** Summary line such as "2 removed, 1 skipped"; zero counts are omitted. */
export function summarize(results: CleanResult[]): string {
  const labels: [CleanResult["status"], string][] = [
    ["dry-run", "would be removed"],
    ["removed", "removed"],
    ["skipped", "skipped"],
    ["failed", "failed"],
  ];
  const parts = labels.flatMap(([status, label]) => {
    const n = results.filter((r) => r.status === status).length;
    return n ? [`${n} ${label}`] : [];
  });
  return parts.join(", ") || "nothing to do";
}
