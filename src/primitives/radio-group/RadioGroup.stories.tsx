import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { RadioGroup, type RadioGroupProps } from "./RadioGroup";

const options = [
  { value: "here", label: "Only here" },
  { value: "everywhere", label: "Everywhere it is used" },
  { value: "nowhere", label: "Nowhere", title: "Leave it as it was" },
];

/** Holds the value as an app would, and reports each pick to the story's onChange. */
function Controlled(props: RadioGroupProps) {
  const [value, setValue] = useState(props.value);
  return (
    <RadioGroup
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Primitives/RadioGroup",
  component: RadioGroup,
  args: { legend: "Apply the change", options, value: "here", onChange: fn() },
  argTypes: { layout: { control: "select", options: ["stacked", "inline", "unknown-layout"] } },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A press on an option's words picks it. */
export const Stacked: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Everywhere it is used"));
    await expect(canvas.getByRole("radio", { name: "Everywhere it is used" })).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith("everywhere");
  },
};

/** The arrow keys move the pick; the group is one tab stop. */
export const Inline: Story = {
  args: { layout: "inline" },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("radio", { name: "Only here" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "Everywhere it is used" })).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith("everywhere");
  },
};

/** A layout it does not know stacks. */
export const UnknownLayout: Story = { args: { layout: "diagonal" } };

/** Nothing picked yet. */
export const NonePicked: Story = { args: { value: undefined } };

/** The legend for screen readers only, when the page around it already says what the choice is. */
export const LegendHidden: Story = {
  args: { legendHidden: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Apply the change" })).toBeVisible();
  },
};

export const WithHint: Story = { args: { hint: "Everywhere changes every place that uses it." } };

export const WithError: Story = {
  args: { value: undefined, error: "Pick where to apply it." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
  },
};

/** One option not pickable. */
export const OptionDisabled: Story = {
  args: { options: [...options.slice(0, 2), { value: "nowhere", label: "Nowhere", disabled: true }] },
};

/** The whole group not pickable. */
export const Disabled: Story = { args: { disabled: true } };

/** Every state together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "16px" }}>
      <Controlled {...args} hint="A line of help." />
      <Controlled {...args} layout="inline" value={undefined} error="Pick one." />
      <Controlled {...args} disabled />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
