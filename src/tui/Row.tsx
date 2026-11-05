import { Box, Text } from "ink";
import { stateColor, statusColor } from "../format.ts";
import type { CleanStatus, PrWorktree } from "../types.ts";

export type RowStatus = { status: "cleaning" } | { status: CleanStatus; message?: string };

export interface Widths {
  repo: number;
  branch: number;
  pr: number;
}

interface Props {
  worktree: PrWorktree;
  widths: Widths;
  active: boolean;
  selected: boolean;
  selectable: boolean;
  status?: RowStatus;
}

const STATUS_LABEL: Record<RowStatus["status"], string> = {
  cleaning: "removing…",
  removed: "removed ✓",
  skipped: "skipped",
  failed: "failed",
  "dry-run": "would remove",
};

export function Row({ worktree: w, widths, active, selected, selectable, status }: Props) {
  const done = status?.status === "removed";
  const dim = !selectable || done;
  const message = status && "message" in status && status.message ? `: ${status.message}` : "";
  return (
    <Box>
      <Box width={2} flexShrink={0}>
        <Text color="cyan">{active ? "›" : " "}</Text>
      </Box>
      <Box width={4} flexShrink={0}>
        <Text color={selected ? "green" : undefined} dimColor={!selected}>
          {selectable ? (selected ? "[x]" : "[ ]") : "   "}
        </Text>
      </Box>
      {widths.repo > 0 && (
        <Box width={widths.repo + 2} flexShrink={0} paddingRight={2}>
          <Text dimColor wrap="truncate-end">
            {w.repo.name}
          </Text>
        </Box>
      )}
      <Box width={widths.branch + 2} flexShrink={0} paddingRight={2}>
        <Text bold={active} dimColor={dim} strikethrough={done} wrap="truncate-end">
          {w.branch}
        </Text>
      </Box>
      <Box width={widths.pr + 2} flexShrink={0}>
        <Text dimColor={dim}>#{w.pr.number}</Text>
      </Box>
      <Box width={8} flexShrink={0}>
        <Text color={stateColor(w.pr.state)} dimColor={dim}>
          {w.pr.state}
        </Text>
      </Box>
      <Box width={3} flexShrink={0}>
        <Text color="yellow">{w.dirty ? "*" : " "}</Text>
        <Text color="cyan">{w.herdrWorkspaceId ? "H" : " "}</Text>
      </Box>
      <Box flexGrow={1}>
        {status ? (
          <Text
            color={status.status === "cleaning" ? "cyan" : statusColor(status.status)}
            wrap="truncate-end"
          >
            {STATUS_LABEL[status.status]}
            {message}
          </Text>
        ) : (
          <Text dimColor={dim} wrap="truncate-end">
            {w.pr.title}
          </Text>
        )}
      </Box>
    </Box>
  );
}
