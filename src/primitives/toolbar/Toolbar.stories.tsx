import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "../button";
import { TextInput } from "../text-input";
import { Toolbar } from "./Toolbar";

const meta = {
  title: "Primitives/Toolbar",
  component: Toolbar,
  args: { label: "Edit" },
  argTypes: { orientation: { control: "inline-radio", options: ["horizontal", "vertical"] } },
  render: (args) => (
    <Toolbar {...args}>
      <Button>Undo</Button>
      <Button>Redo</Button>
      <Button disabled>Apply</Button>
      <Button aria-pressed="true">Snap</Button>
    </Toolbar>
  ),
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One tab stop; the arrows move between the items, skipping a disabled one, and wrap. */
export const Horizontal: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Undo" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Snap" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Undo" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(canvas.getByRole("button", { name: "Snap" })).toHaveFocus();
  },
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("button", { name: "Redo" })).toHaveFocus();
  },
};

/** A text field among the items keeps its own arrow keys. */
export const WithTextField: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <Button>Previous</Button>
      <TextInput aria-label="Find" defaultValue="transform" />
      <Button>Next</Button>
    </Toolbar>
  ),
  args: { label: "Find" },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("textbox", { name: "Find" });
    await userEvent.click(field);
    await userEvent.keyboard("{ArrowLeft}");
    await expect(field).toHaveFocus();
  },
};

export const HorizontalHarborDark: Story = { ...Horizontal, globals: { brand: "harbor", theme: "dark" } };

export const HorizontalEmberLight: Story = { ...Horizontal, globals: { brand: "ember", theme: "light" } };
