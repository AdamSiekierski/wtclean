import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { registerClean } from "./commands/clean.ts";
import { registerList } from "./commands/list.ts";
import { addTuiOptions, registerTui, runTuiCommand, type TuiFlags } from "./commands/tui.ts";

const program = new Command("wtclean")
  .description("Find git worktrees whose GitHub pull request is merged and clean them up.")
  .version(pkg.version, "-v, --version")
  // Program options only apply before the subcommand, so `wtclean list -g` reaches `list`.
  .enablePositionalOptions();

registerList(program);
registerClean(program);
registerTui(program);

addTuiOptions(program).action(async (flags: TuiFlags) => {
  if (process.stdin.isTTY && process.stdout.isTTY) await runTuiCommand(flags);
  else program.help();
});

try {
  await program.parseAsync();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`wtclean: ${message}\n`);
  if (process.env.DEBUG && error instanceof Error && error.stack)
    process.stderr.write(`${error.stack}\n`);
  process.exit(1);
}
