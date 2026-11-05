import type { Command } from "commander";
import { addScopeOptions, toScanOptions, type ScopeFlags } from "./shared.ts";

export interface TuiFlags extends ScopeFlags {
  force?: boolean;
  keepBranch?: boolean;
}

export function addTuiOptions(cmd: Command): Command {
  return addScopeOptions(cmd)
    .option("-f, --force", "start with force (remove dirty worktrees) enabled")
    .option("--keep-branch", "keep local branches after removing worktrees");
}

export async function runTuiCommand(flags: TuiFlags): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "the terminal UI needs an interactive terminal; use `wtclean list` or `wtclean clean` instead",
    );
  }
  // Loaded lazily so `list`/`clean` don't pay for React and ink.
  const { runTui } = await import("../tui/run.tsx");
  await runTui(toScanOptions(flags), {
    force: flags.force ?? false,
    keepBranch: flags.keepBranch ?? false,
  });
}

export function registerTui(program: Command): void {
  addTuiOptions(
    program.command("tui").description("interactive terminal UI (default when run in a terminal)"),
  ).action(runTuiCommand);
}
