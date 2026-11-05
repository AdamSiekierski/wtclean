import type { Command } from "commander";
import { colorEnabled, formatTable } from "../format.ts";
import {
  addScopeOptions,
  printWarnings,
  scanWithProgress,
  scopeDescription,
  toScanOptions,
  type ScopeFlags,
} from "./shared.ts";

interface ListFlags extends ScopeFlags {
  json?: boolean;
}

export function registerList(program: Command): void {
  addScopeOptions(
    program
      .command("list")
      .alias("ls")
      .description("list linked worktrees whose PR is merged (or in any state with --all)"),
  )
    .option("--json", "print the scan result as JSON")
    .action(async (flags: ListFlags) => {
      const opts = toScanOptions(flags);
      const result = await scanWithProgress(opts);
      printWarnings(result.warnings);
      if (flags.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      if (result.worktrees.length === 0) {
        const scope = scopeDescription(opts);
        console.log(
          opts.allStates
            ? `No worktrees with a pull request found in ${scope}.`
            : `No worktrees with a merged pull request in ${scope}, nothing to clean up.`,
        );
        return;
      }
      console.log(
        formatTable(result.worktrees, {
          width: process.stdout.isTTY ? process.stdout.columns : undefined,
          color: colorEnabled(process.stdout),
        }),
      );
    });
}
