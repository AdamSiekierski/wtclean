import { createInterface } from "node:readline/promises";
import type { Command } from "commander";
import { cleanAll } from "../clean.ts";
import { colorEnabled, formatResult, formatTable, paint, pluralize, summarize } from "../format.ts";
import { isMerged } from "../scan.ts";
import {
  addScopeOptions,
  printWarnings,
  scanWithProgress,
  scopeDescription,
  toScanOptions,
  type ScopeFlags,
} from "./shared.ts";

interface CleanFlags extends ScopeFlags {
  yes?: boolean;
  force?: boolean;
  keepBranch?: boolean;
  dryRun?: boolean;
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export function registerClean(program: Command): void {
  addScopeOptions(
    program
      .command("clean")
      .description("remove worktrees (and their local branches) whose PR is merged"),
  )
    .option("-y, --yes", "don't ask for confirmation")
    .option("-f, --force", "remove worktrees even when they have uncommitted changes")
    .option("--keep-branch", "keep the local branch after removing the worktree")
    .option("-n, --dry-run", "only show what would be removed")
    .action(async (flags: CleanFlags) => {
      const opts = toScanOptions(flags);
      const color = colorEnabled(process.stdout);
      const result = await scanWithProgress(opts);
      printWarnings(result.warnings);

      const merged = result.worktrees.filter(isMerged);
      const others = result.worktrees.length - merged.length;
      if (others > 0) {
        console.log(
          paint(
            `Skipping ${pluralize(others, "worktree")} whose PR is not merged; only merged ones are cleaned.`,
            "dim",
            color,
          ),
        );
      }
      if (merged.length === 0) {
        console.log(
          `No worktrees with a merged pull request in ${scopeDescription(opts)}, nothing to clean up.`,
        );
        return;
      }

      console.log(
        formatTable(merged, {
          width: process.stdout.isTTY ? process.stdout.columns : undefined,
          color,
        }),
      );
      console.log();

      const dirty = merged.filter((w) => w.dirty).length;
      if (dirty && !flags.force) {
        console.log(
          paint(
            `${pluralize(dirty, "worktree")} with uncommitted changes will be skipped (use --force to remove).`,
            "yellow",
            color,
          ),
        );
      }

      if (!flags.yes && !flags.dryRun) {
        if (!process.stdin.isTTY) {
          throw new Error(
            "refusing to clean without confirmation in a non-interactive shell; pass --yes (or --dry-run)",
          );
        }
        const branches = flags.keepBranch ? "" : " and their local branches";
        if (!(await confirm(`Remove ${pluralize(merged.length, "worktree")}${branches}?`))) {
          console.log("Aborted.");
          return;
        }
      }

      const results = await cleanAll(
        merged,
        {
          force: flags.force ?? false,
          keepBranch: flags.keepBranch ?? false,
          dryRun: flags.dryRun ?? false,
        },
        (r) => console.log(formatResult(r, color)),
      );
      console.log(`\n${summarize(results)}`);
      if (results.some((r) => r.status === "failed")) process.exitCode = 1;
    });
}
