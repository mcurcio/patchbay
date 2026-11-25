import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { TextInput } from "./TextInput";

const meta = {
  title: "Primitives/TextInput",
  component: TextInput,
  args: { "aria-label": "Name", onChange: fn() },
  argTypes: { font: { control: "inline-radio", options: ["ui", "code"] } },
  decorators: [(Story) => <div style={{ maxWidth: "320px" }}>{Story()}</div>],
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole("textbox", { name: "Name" });
    await userEvent.type(input, "hi");
    await expect(input).toHaveValue("hi");
    await expect(args.onChange).toHaveBeenCalledTimes(2);
  },
};

export const Placeholder: Story = { args: { placeholder: "(none)" } };

export const Filled: Story = { args: { defaultValue: "Living room" } };

/** The code face, for values written as code. */
export const Code: Story = { args: { font: "code", defaultValue: "sine 440 0.2" } };

/** A face it does not know draws as ui. */
export const UnknownFont: Story = { args: { font: "serif", defaultValue: "Living room" } };

export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "70x" } };

export const ReadOnly: Story = { args: { readOnly: true, defaultValue: "Set by the file" } };

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Locked" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox")).toBeDisabled();
  },
};
