import type { Command } from "commander";
import { scan } from "../scan.ts";
import type { ScanOptions, ScanResult } from "../types.ts";
import { colorEnabled, paint } from "../format.ts";

export interface ScopeFlags {
  here?: boolean;
  repo?: string[];
  all?: boolean;
  token?: string;
}

/** Add the scope/auth options shared by every command. */
export function addScopeOptions(cmd: Command): Command {
  return cmd
    .option("--here", "only scan the repo containing the current directory")
    .option("-r, --repo <path...>", "scan these repos (any path inside a repo; repeatable)")
    .option("-a, --all", "include worktrees whose PR is open, draft or closed, not only merged")
    .option(
      "--token <pat>",
      "GitHub token (default: $WTCLEAN_GITHUB_TOKEN, $GITHUB_TOKEN, $GH_TOKEN or `gh auth token`)",
    );
}

export function toScanOptions(flags: ScopeFlags): ScanOptions {
  return {
    here: flags.here ?? false,
    allStates: flags.all ?? false,
    token: flags.token,
    repos: flags.repo ?? [],
    cwd: process.cwd(),
  };
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Run a scan with a spinner on stderr (TTY only) and print warnings to stderr. */
export async function scanWithProgress(opts: ScanOptions): Promise<ScanResult> {
  const stderr = process.stderr;
  let message = "Scanning worktrees…";
  let timer: ReturnType<typeof setInterval> | undefined;
  if (stderr.isTTY) {
    let frame = 0;
    const draw = () => stderr.write(`\r\u001B[K${FRAMES[frame++ % FRAMES.length]} ${message}`);
    draw();
    timer = setInterval(draw, 80);
  }
  try {
    return await scan(opts, (msg) => {
      message = msg;
    });
  } finally {
    if (timer) {
      clearInterval(timer);
      stderr.write("\r\u001B[K");
    }
  }
}

export function printWarnings(warnings: string[]): void {
  const color = colorEnabled(process.stderr);
  for (const w of warnings) process.stderr.write(`${paint("warning:", "yellow", color)} ${w}\n`);
}

export function scopeDescription(opts: ScanOptions): string {
  if (opts.repos.length) return opts.repos.join(", ");
  if (opts.here) return "this repo";
  return "any local repo";
}
