import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Checkbox } from "../checkbox";
import { Select } from "../select";
import { TextInput } from "../text-input";
import { Field } from "./Field";

const meta = {
  title: "Primitives/Field",
  component: Field,
  args: { label: "Name", children: <TextInput /> },
  argTypes: { layout: { control: "inline-radio", options: ["stacked", "inline"] } },
  decorators: [(Story) => <div style={{ maxWidth: "420px" }}>{Story()}</div>],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Name" })).not.toHaveAttribute("aria-invalid");
  },
};

export const WithHint: Story = { args: { label: "Port", hint: "1 to 65535", children: <TextInput font="code" /> } };

/** An error marks the control invalid and describes it. */
export const WithError: Story = {
  args: {
    label: "Port",
    hint: "1 to 65535",
    error: "Not a number",
    children: <TextInput font="code" defaultValue="70x" />,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Port" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription("1 to 65535 Not a number");
  },
};

/** The label in a column to the left. */
export const Inline: Story = { args: { layout: "inline", hint: "Letters, digits and dashes" } };

/** Inline fields one under another: their labels share a column. */
export const InlineForm: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "8px" }}>
      <Field label="Id" layout="inline" error="Already taken">
        <TextInput font="code" defaultValue="ingest" />
      </Field>
      <Field label="Interval" layout="inline">
        <Select defaultValue="30">
          <option value="15">15 s</option>
          <option value="30">30 s</option>
        </Select>
      </Field>
      <Field label="Enabled" layout="inline">
        <Checkbox defaultChecked />
      </Field>
    </div>
  ),
};

export const WithSelect: Story = {
  args: {
    label: "Interval",
    error: "The worker does not support it",
    children: (
      <Select defaultValue="60">
        <option value="30">30 s</option>
        <option value="60">60 s</option>
      </Select>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Interval" })).toHaveAttribute("aria-invalid", "true");
  },
};

export const Disabled: Story = { args: { hint: "Set by the file", children: <TextInput disabled defaultValue="x" /> } };

/** A layout the field does not know stacks. */
export const UnknownLayout: Story = { args: { layout: "sideways" } };
