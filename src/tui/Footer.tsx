import { Box, Text } from "ink";

interface Props {
  selected: number;
  force: boolean;
  keepBranch: boolean;
  notice?: string;
}

function Key({ k, label }: { k: string; label: string }) {
  return (
    <Text>
      <Text bold>{k}</Text>
      <Text dimColor>
        {" "}
        {label}
        {"   "}
      </Text>
    </Text>
  );
}

export function Footer({ selected, force, keepBranch, notice }: Props) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {notice && <Text color="yellow">{notice}</Text>}
      <Box flexWrap="wrap">
        <Key k="↑↓/jk" label="move" />
        <Key k="space" label="select" />
        <Key k="a" label="all/none" />
        <Key k="enter/d" label="clean" />
        <Key k="f" label="force" />
        <Key k="o" label="open PR" />
        <Key k="r" label="rescan" />
        <Key k="q" label="quit" />
      </Box>
      <Text>
        <Text dimColor>selected </Text>
        <Text bold>{selected}</Text>
        <Text dimColor>{"   force "}</Text>
        <Text color={force ? "red" : undefined} bold={force}>
          {force ? "on" : "off"}
        </Text>
        <Text dimColor>{"   keep-branch "}</Text>
        <Text>{keepBranch ? "on" : "off"}</Text>
        <Text>{"   "}</Text>
        <Text color="yellow">*</Text>
        <Text dimColor>{" dirty  "}</Text>
        <Text color="cyan">H</Text>
        <Text dimColor> open in herdr</Text>
      </Text>
    </Box>
  );
}
