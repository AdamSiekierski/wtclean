import { render } from "ink";
import type { ScanOptions } from "../types.ts";
import { App } from "./App.tsx";

export async function runTui(
  scanOptions: ScanOptions,
  opts: { force: boolean; keepBranch: boolean },
): Promise<void> {
  const app = render(
    <App scanOptions={scanOptions} force={opts.force} keepBranch={opts.keepBranch} />,
  );
  await app.waitUntilExit();
}
