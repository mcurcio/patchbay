import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { IconButton } from "../icon-button";
import { ToolGroup } from "./ToolGroup";

/** A canvas's tools, the minimap toggle held by the story. */
function CanvasTools({ label, onTool }: { label: string; onTool: (name: string) => void }) {
  const [minimap, setMinimap] = useState(false);
  const tool = (name: string, glyph: string, keys?: string) => (
    <IconButton
      label={name}
      title={keys === undefined ? name : `${name} (${keys.toUpperCase()})`}
      aria-keyshortcuts={keys}
      onClick={() => {
        onTool(name);
      }}
    >
      {glyph}
    </IconButton>
  );
  return (
    <ToolGroup label={label}>
      {tool("Zoom out", "−")}
      {tool("Zoom in", "+")}
      {tool("Fit view", "⤢", "f")}
      {tool("Tidy layout", "⊞", "l")}
      <IconButton
        label="Minimap"
        title="Minimap (M)"
        aria-keyshortcuts="m"
        aria-pressed={minimap}
        onClick={() => {
          setMinimap(!minimap);
          onTool("Minimap");
        }}
      >
        ▦
      </IconButton>
    </ToolGroup>
  );
}

const meta = {
  title: "Primitives/ToolGroup",
  component: ToolGroup,
  args: { label: "Canvas", children: null },
  render: (args) => <CanvasTools label={args.label} onTool={fn()} />,
} satisfies Meta<typeof ToolGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A canvas's floating tools: one tab stop, the arrows between them. */
export const Canvas: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Zoom out" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(canvas.getByRole("button", { name: "Minimap" })).toHaveFocus();
  },
};

/** The minimap toggle pressed: drawn in the accent. */
export const Pressed: Story = {
  play: async ({ canvas, userEvent }) => {
    const minimap = canvas.getByRole("button", { name: "Minimap" });
    await userEvent.click(minimap);
    await expect(minimap).toHaveAttribute("aria-pressed", "true");
  },
};

/** Standing up the side of a canvas. */
export const Vertical: Story = {
  render: (args) => (
    <ToolGroup label={args.label} orientation="vertical">
      <IconButton label="Zoom in">+</IconButton>
      <IconButton label="Zoom out">−</IconButton>
      <IconButton label="Fit view" disabled>
        ⤢
      </IconButton>
    </ToolGroup>
  ),
};

export const PressedHarborDark: Story = { ...Pressed, globals: { brand: "harbor", theme: "dark" } };

export const PressedEmberLight: Story = { ...Pressed, globals: { brand: "ember", theme: "light" } };
