import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { tokenColor } from "../../test/token-color";
import { underTouch } from "../../test/touch-rules";
import { CloseGlyph } from "./CloseGlyph";
import { IconButton } from "./IconButton";

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  args: { label: "Zoom in", children: "+", onClick: fn() },
  argTypes: {
    tone: { control: "inline-radio", options: ["neutral", "primary", "danger"] },
    size: { control: "inline-radio", options: ["md", "sm"] },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Zoom in" });
    await expect(button).toHaveAttribute("title", "Zoom in");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/**
 * On a touch screen, where nothing hovers, it is a 36 px target with its line-strong edge at rest, so it can be found.
 * A desktop browser matches no coarse pointer, so the story applies the page's touch rules while it measures.
 */
export const Touch: Story = {
  play: async ({ canvas, canvasElement }) => {
    const button = canvas.getByRole("button", { name: "Zoom in" });
    // Read once: tokenColor draws a probe, and a waitFor that drew one would wake itself on its own change.
    const edge = tokenColor(canvasElement, "line-strong");
    await expect(getComputedStyle(button).borderTopColor).not.toBe(edge);
    await underTouch(async () => {
      await expect(button.getBoundingClientRect().width).toBe(36);
      // The edge fades in over --pb-motion-fast.
      await waitFor(() => expect(getComputedStyle(button).borderTopColor).toBe(edge));
    });
  },
};

export const Primary: Story = { args: { tone: "primary", label: "Add", children: "+" } };

export const Danger: Story = { args: { tone: "danger", label: "Remove", children: "×" } };

export const UnknownTone: Story = { args: { tone: "sparkly", label: "Unknown tone", children: "?" } };

export const Small: Story = { args: { size: "sm", label: "Close", children: <CloseGlyph /> } };

/**
 * The close glyph, `CloseGlyph`: the one look for Close (a dialog, a sheet, the inspector) and Dismiss (a banner, a
 * toast), always on an IconButton named by the word (U30).
 */
export const Close: Story = {
  args: { label: "Close", children: <CloseGlyph /> },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Close" });
    await expect(button).toHaveAttribute("title", "Close");
    const glyph = button.querySelector("svg.pb-close-glyph");
    await expect(glyph).not.toBeNull();
    await expect(glyph?.closest("[aria-hidden='true']")).not.toBeNull();
  },
};

export const Pressed: Story = { args: { "aria-pressed": true, label: "Minimap", children: "▦" } };

export const WithShortcutTitle: Story = {
  args: { label: "Fit view", title: "Fit view (F)", "aria-keyshortcuts": "f", children: "⤢" },
};

export const Disabled: Story = { args: { disabled: true } };

export const Busy: Story = {
  args: { busy: true, label: "Refresh", children: "↻" },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Refresh" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Busy with a busyLabel: the glyph stays under the spinner, and the name and tooltip become the busy words. */
export const BusyLabel: Story = {
  args: { busy: true, label: "Refresh", busyLabel: "Refreshing" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Refreshing" });
    await expect(button).toHaveAttribute("title", "Refreshing");
  },
};

/** A row of tools, as in a canvas's tool group. */
export const Row: Story = {
  render: (args) => (
    <div role="toolbar" aria-label="Tools" style={{ display: "flex", gap: "2px" }}>
      <IconButton {...args} label="Zoom out">
        −
      </IconButton>
      <IconButton {...args} label="Zoom in">
        +
      </IconButton>
      <IconButton {...args} label="Fit view">
        ⤢
      </IconButton>
      <IconButton {...args} label="Minimap" aria-pressed>
        ▦
      </IconButton>
    </div>
  ),
};

/** Every tone and state together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "8px" }}>
      <IconButton {...args} />
      <IconButton {...args} tone="primary" label="Add" />
      <IconButton {...args} tone="danger" label="Remove" />
      <IconButton {...args} aria-pressed label="Minimap" />
      <IconButton {...args} busy label="Refresh" />
      <IconButton {...args} busy label="Sync" busyLabel="Syncing" />
      <IconButton {...args} disabled label="Undo" />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
