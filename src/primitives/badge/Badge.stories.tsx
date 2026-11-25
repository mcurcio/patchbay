import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { WarnMark } from "../warn-mark/WarnMark";
import { Badge } from "./Badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  args: { tone: "ok", children: "live" },
  argTypes: {
    tone: { control: "select", options: ["ok", "warn", "err", "quiet", "off", "unknown-tone"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {};
export const Warn: Story = { args: { tone: "warn", children: "3 dropouts" } };
export const Err: Story = { args: { tone: "err", children: "not realtime" } };
export const Quiet: Story = { args: { tone: "quiet", children: "idle" } };
export const Off: Story = { args: { tone: "off", children: "off" } };

/** A tone the badge does not know: muted, with a plain line. */
export const UnknownTone: Story = { args: { tone: "mystery", children: "new" } };

/** Its meaning on hover. */
export const WithTitle: Story = {
  args: { tone: "warn", children: "3 dropouts", title: "Dropouts in the last minute" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("3 dropouts")).toHaveAttribute("title", "Dropouts in the last minute");
  },
};

/** A warning mark inside, as ear's dropouts badge carries one. */
export const WithWarnMark: Story = {
  args: {
    tone: "warn",
    children: (
      <>
        <WarnMark label="rose lately" />3 dropouts
      </>
    ),
  },
};

/** Every tone side by side, for comparing brands and themes. */
export const AllTones: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Badge tone="ok">live</Badge>
      <Badge tone="warn">3 dropouts</Badge>
      <Badge tone="err">not realtime</Badge>
      <Badge tone="quiet">idle</Badge>
      <Badge tone="off">off</Badge>
      <Badge tone="mystery">new</Badge>
    </div>
  ),
};
