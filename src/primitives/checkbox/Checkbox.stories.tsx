import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  args: { label: "Mute", onChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A press on the words ticks it. */
export const Unticked: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Mute"));
    await expect(canvas.getByRole("checkbox", { name: "Mute" })).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
};

export const Ticked: Story = { args: { defaultChecked: true } };

/** Some of a group ticked. */
export const Indeterminate: Story = {
  args: { label: "All outputs", indeterminate: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox")).toBePartiallyChecked();
  },
};

/** No words of its own: named by aria-label (or a Field). */
export const Bare: Story = { args: { label: undefined, "aria-label": "Mute" } };

export const Invalid: Story = { args: { "aria-invalid": true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledTicked: Story = { args: { disabled: true, defaultChecked: true } };
