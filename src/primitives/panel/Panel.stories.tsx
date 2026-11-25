import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { IconButton } from "../icon-button";
import { Splitter } from "../splitter";
import { Panel, type PanelProps } from "./Panel";

const frame = {
  display: "flex",
  width: "360px",
  maxWidth: "100%",
  height: "320px",
  border: "1px solid var(--pb-line)",
} as const;

const paragraphs = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <p key={index} style={{ margin: "0 0 var(--pb-space-3)" }}>
      Line {index + 1}: the body scrolls on its own while the header stays.
    </p>
  ));

const meta = {
  title: "Primitives/Panel",
  component: Panel,
  args: { title: "Inspector", children: paragraphs(3) },
  render: (args) => (
    <div style={frame}>
      <Panel {...args} style={{ flex: "1 1 auto" }} />
    </div>
  ),
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Titled: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("region", { name: "Inspector" })).toBeInTheDocument();
  },
};

export const WithActions: Story = {
  args: {
    actions: (
      <IconButton label="Close" onClick={fn()}>
        ×
      </IconButton>
    ),
  },
};

/** A long title wraps before the actions shrink. */
export const LongTitle: Story = {
  args: {
    title: "A node with a very long name that does not fit on one line of the header",
    actions: <IconButton label="Close">×</IconButton>,
  },
};

/** No title: named by aria-label, with no header at all. */
export const Untitled: Story = { args: { title: undefined, "aria-label": "Details" } };

/** More than fits: only the body scrolls. */
export const Scrolling: Story = {
  args: { children: paragraphs(30) },
  play: async ({ canvasElement }) => {
    const body = canvasElement.querySelector(".pb-panel-body");
    await expect(body?.scrollHeight).toBeGreaterThan(body?.clientHeight ?? 0);
    await waitFor(() => expect(body).toHaveAttribute("tabindex", "0"));
  },
};

/** A panel docked on the right, resized by a Splitter on its left edge, as a side inspector is. */
function Docked(args: PanelProps) {
  const [width, setWidth] = useState(280);
  return (
    <div style={{ ...frame, width: "720px", background: "var(--pb-surface)" }}>
      <div style={{ flex: "1 1 auto" }} />
      <div style={{ position: "relative", flex: "none", width: `${String(width)}px`, display: "flex" }}>
        <Splitter
          orientation="vertical"
          label="Resize the inspector"
          value={width}
          min={240}
          max={480}
          onChange={setWidth}
        />
        <Panel {...args} style={{ flex: "1 1 auto", borderLeft: "1px solid var(--pb-line)" }} />
      </div>
    </div>
  );
}

export const DockedAndResized: Story = {
  render: (args) => <Docked {...args} />,
  args: { actions: <IconButton label="Close">×</IconButton>, children: paragraphs(12) },
  play: async ({ canvas, userEvent }) => {
    const splitter = canvas.getByRole("separator", { name: "Resize the inspector" });
    splitter.focus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "296");
  },
};

export const WithActionsRaslDark: Story = { ...WithActions, globals: { brand: "rasl", theme: "dark" } };

export const WithActionsEarLight: Story = { ...WithActions, globals: { brand: "ear", theme: "light" } };
