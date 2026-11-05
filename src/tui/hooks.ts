import { useCallback, useEffect, useRef, useState } from "react";
import { scan } from "../scan.ts";
import type { ScanOptions, ScanResult } from "../types.ts";

export type ScanState =
  | { phase: "loading"; progress: string }
  | { phase: "ready"; result: ScanResult }
  | { phase: "error"; error: string };

const LOADING: ScanState = { phase: "loading", progress: "Scanning worktrees…" };

/** Run a scan on mount and whenever `rescan` is called. `opts` must be referentially stable. */
export function useScan(opts: ScanOptions): [ScanState, () => void] {
  const [state, setState] = useState<ScanState>(LOADING);
  // Only the latest scan may update state; bumping this cancels older ones.
  const latest = useRef(0);

  const start = useCallback(() => {
    const id = ++latest.current;
    const update = (next: ScanState) => {
      if (latest.current === id) setState(next);
    };
    scan(opts, (progress) => update({ phase: "loading", progress })).then(
      (result) => update({ phase: "ready", result }),
      (error: unknown) =>
        update({ phase: "error", error: error instanceof Error ? error.message : String(error) }),
    );
  }, [opts]);

  useEffect(start, [start]);

  const rescan = () => {
    setState(LOADING);
    start();
  };
  return [state, rescan];
}

/** Open a URL in the default browser; failures are ignored. */
export function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdin: "ignore", stdout: "ignore", stderr: "ignore" }).unref();
  } catch {
    // no opener available; nothing useful to do inside the TUI
  }
}
