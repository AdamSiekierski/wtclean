import { Box, Text, useAnimation, useApp, useInput, useWindowSize } from "ink";
import { useState } from "react";
import { cleanAll } from "../clean.ts";
import { pluralize, tildify } from "../format.ts";
import { inHerdr, openInHerdr } from "../herdr.ts";
import { isMerged } from "../scan.ts";
import type { MergedWorktree, PrWorktree, ScanOptions } from "../types.ts";
import { Footer } from "./Footer.tsx";
import { openUrl, useScan } from "./hooks.ts";
import { Row, type RowStatus } from "./Row.tsx";

export interface AppProps {
  scanOptions: ScanOptions;
  force: boolean;
  keepBranch: boolean;
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner() {
  const { frame } = useAnimation({ interval: 80 });
  return <Text color="cyan">{FRAMES[frame % FRAMES.length]}</Text>;
}

export function App({ scanOptions, force: initialForce, keepBranch }: AppProps) {
  const { exit } = useApp();
  const { rows: termRows, columns } = useWindowSize();
  const [scanState, rescan] = useScan(scanOptions);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [statuses, setStatuses] = useState<ReadonlyMap<string, RowStatus>>(new Map());
  const [confirming, setConfirming] = useState<MergedWorktree[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [force, setForce] = useState(initialForce);
  const [notice, setNotice] = useState<string>();

  const worktrees: PrWorktree[] = scanState.phase === "ready" ? scanState.result.worktrees : [];
  const cleanable = (w: PrWorktree): w is MergedWorktree => {
    const s = statuses.get(w.path)?.status;
    return isMerged(w) && s !== "removed" && s !== "cleaning";
  };
  const current = worktrees[cursor];

  const runClean = async (targets: MergedWorktree[]) => {
    setBusy(true);
    setStatuses(
      (prev) =>
        new Map([
          ...prev,
          ...targets.map((w): [string, RowStatus] => [w.path, { status: "cleaning" }]),
        ]),
    );
    const results = await cleanAll(targets, { force, keepBranch, dryRun: false }, (r) => {
      setStatuses((prev) =>
        new Map(prev).set(r.worktree.path, { status: r.status, message: r.message }),
      );
    });
    setSelected(new Set());
    setBusy(false);
    const failed = results.filter((r) => r.status === "failed").length;
    const removed = results.filter((r) => r.status === "removed").length;
    setNotice(`${pluralize(removed, "worktree")} removed${failed ? `, ${failed} failed` : ""}.`);
  };

  useInput((input, key) => {
    if (confirming) {
      setConfirming(null);
      if (input === "y" || input === "Y") void runClean(confirming);
      return;
    }
    if (busy) return;
    if (input === "q" || key.escape) return exit();
    if (input === "r") {
      setSelected(new Set());
      setStatuses(new Map());
      setCursor(0);
      setNotice(undefined);
      return rescan();
    }
    if (input === "f") return setForce((f) => !f);
    if (scanState.phase !== "ready") return;
    setNotice(undefined);

    if (key.upArrow || input === "k") return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow || input === "j")
      return setCursor((c) => Math.min(worktrees.length - 1, c + 1));
    if (!current) return;
    if (input === "o") return openUrl(current.pr.url);
    if (input === "h") {
      if (!inHerdr()) return setNotice("Not running inside herdr.");
      if (statuses.get(current.path)?.status === "removed")
        return setNotice("That worktree was removed.");
      const target = current;
      openInHerdr(target.repo.root, target.path).then(
        () => setNotice(`Opened ${target.branch} in herdr.`),
        (error: unknown) =>
          setNotice(`herdr: ${error instanceof Error ? error.message : String(error)}`),
      );
      return;
    }
    if (input === " ") {
      if (!cleanable(current))
        return setNotice(
          `#${current.pr.number} is ${current.pr.state}; only merged PRs can be cleaned.`,
        );
      const next = new Set(selected);
      if (!next.delete(current.path)) next.add(current.path);
      return setSelected(next);
    }
    if (input === "a") {
      const all = worktrees.filter(cleanable).map((w) => w.path);
      return setSelected(all.every((p) => selected.has(p)) ? new Set() : new Set(all));
    }
    if (key.return || input === "d") {
      const targets = selected.size
        ? worktrees.filter((w): w is MergedWorktree => selected.has(w.path) && cleanable(w))
        : cleanable(current)
          ? [current]
          : [];
      if (targets.length === 0)
        return setNotice(
          `#${current.pr.number} is ${current.pr.state}; only merged PRs can be cleaned.`,
        );
      setConfirming(targets);
    }
  });

  if (scanState.phase === "loading") {
    return (
      <Box>
        <Spinner />
        <Text> {scanState.progress}</Text>
      </Box>
    );
  }
  if (scanState.phase === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {scanState.error}</Text>
        <Text dimColor>r retry · q quit</Text>
      </Box>
    );
  }

  const { warnings } = scanState.result;
  const multiRepo = new Set(worktrees.map((w) => w.repo.root)).size > 1;
  const widths = {
    repo: multiRepo ? Math.min(20, Math.max(...worktrees.map((w) => w.repo.name.length))) : 0,
    branch: Math.min(
      Math.max(12, Math.floor(columns * 0.35)),
      Math.max(0, ...worktrees.map((w) => w.branch.length)),
    ),
    pr: Math.max(0, ...worktrees.map((w) => `#${w.pr.number}`.length)),
  };
  // Keep the cursor visible: header, detail, warnings and footer take ~8 lines.
  const visible = Math.max(3, termRows - 8 - Math.min(warnings.length, 3));
  const start = Math.min(
    Math.max(0, cursor - Math.floor(visible / 2)),
    Math.max(0, worktrees.length - visible),
  );
  const merged = worktrees.filter(isMerged).length;

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold>wtclean</Text>
        <Text dimColor>
          {"  "}
          {pluralize(worktrees.length, "worktree")}, {merged} merged
        </Text>
      </Text>
      {worktrees.length === 0 ? (
        <Text>
          No worktrees with {scanOptions.allStates ? "a" : "a merged"} pull request found. Nothing
          to clean up.
        </Text>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {worktrees.slice(start, start + visible).map((w, i) => (
            <Row
              key={w.path}
              worktree={w}
              widths={widths}
              active={start + i === cursor}
              selected={selected.has(w.path)}
              selectable={isMerged(w) && statuses.get(w.path)?.status !== "removed"}
              status={statuses.get(w.path)}
            />
          ))}
          {current && (
            <Text dimColor wrap="truncate-end">
              {"  "}
              {tildify(current.path)} · {current.pr.url}
            </Text>
          )}
        </Box>
      )}
      {warnings.slice(0, 3).map((w) => (
        <Text key={w} color="yellow" wrap="truncate-end">
          warning: {w}
        </Text>
      ))}
      {confirming ? (
        <Box marginTop={1}>
          <Text color="yellow" bold>
            Remove {pluralize(confirming.length, "worktree")}
            {keepBranch ? "" : " and branch" + (confirming.length === 1 ? "" : "es")}
            {force ? " (force)" : ""}? [y/N]
          </Text>
        </Box>
      ) : busy ? (
        <Box marginTop={1}>
          <Spinner />
          <Text> Cleaning…</Text>
        </Box>
      ) : (
        <Footer selected={selected.size} force={force} keepBranch={keepBranch} notice={notice} />
      )}
    </Box>
  );
}
