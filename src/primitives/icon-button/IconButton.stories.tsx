import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
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

export const Primary: Story = { args: { tone: "primary", label: "Add", children: "+" } };

export const Danger: Story = { args: { tone: "danger", label: "Remove", children: "×" } };

export const UnknownTone: Story = { args: { tone: "sparkly", label: "Unknown tone", children: "?" } };

export const Small: Story = { args: { size: "sm", label: "Close", children: "×" } };

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

/** Every tone and state together, under rasl's brand in dark, so the accessibility check covers its contrast. */
export const AllRaslDark: Story = {
  globals: { brand: "rasl", theme: "dark" },
  render: (args) => (
    <div style={{ display: "flex", gap: "8px" }}>
      <IconButton {...args} />
      <IconButton {...args} tone="primary" label="Add" />
      <IconButton {...args} tone="danger" label="Remove" />
      <IconButton {...args} aria-pressed label="Minimap" />
      <IconButton {...args} busy label="Refresh" />
      <IconButton {...args} disabled label="Undo" />
    </div>
  ),
};
