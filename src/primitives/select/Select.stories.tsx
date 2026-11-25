import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Select } from "./Select";

const meta = {
  title: "Primitives/Select",
  component: Select,
  args: {
    "aria-label": "Interval",
    onChange: fn(),
    defaultValue: "30",
    children: (
      <>
        <option value="15">15 s</option>
        <option value="30">30 s</option>
        <option value="60">60 s</option>
      </>
    ),
  },
  argTypes: { font: { control: "inline-radio", options: ["ui", "code"] } },
  decorators: [(Story) => <div style={{ maxWidth: "320px" }}>{Story()}</div>],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const select = canvas.getByRole("combobox", { name: "Interval" });
    await userEvent.selectOptions(select, "60");
    await expect(select).toHaveValue("60");
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
};

export const Code: Story = { args: { font: "code" } };

export const Grouped: Story = {
  args: {
    defaultValue: "b",
    children: (
      <>
        <optgroup label="Inputs">
          <option value="a">Queue</option>
          <option value="b">Upload</option>
        </optgroup>
        <optgroup label="Outputs">
          <option value="c">Webhook</option>
        </optgroup>
      </>
    ),
  },
};

export const Invalid: Story = { args: { "aria-invalid": true } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
