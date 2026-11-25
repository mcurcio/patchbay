import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Select } from "./Select";

const meta = {
  title: "Primitives/Select",
  component: Select,
  args: {
    "aria-label": "Rate",
    onChange: fn(),
    defaultValue: "48000",
    children: (
      <>
        <option value="44100">44.1 kHz</option>
        <option value="48000">48 kHz</option>
        <option value="96000">96 kHz</option>
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
    const select = canvas.getByRole("combobox", { name: "Rate" });
    await userEvent.selectOptions(select, "96000");
    await expect(select).toHaveValue("96000");
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
};

export const Code: Story = { args: { font: "code" } };

export const Grouped: Story = {
  args: {
    defaultValue: "b",
    children: (
      <>
        <optgroup label="Sources">
          <option value="a">Tone</option>
          <option value="b">File</option>
        </optgroup>
        <optgroup label="Sinks">
          <option value="c">Card</option>
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
