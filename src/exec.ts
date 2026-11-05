/** Runs a command and returns its trimmed stdout. Throws with stderr on failure. */
export async function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string } = {},
): Promise<string> {
  let proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
  try {
    proc = Bun.spawn([cmd, ...args], {
      cwd: opts.cwd,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    throw new Error(`${cmd}: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
    throw new Error(`${cmd} ${args.join(" ")} failed: ${detail}`);
  }
  return stdout.trim();
}
