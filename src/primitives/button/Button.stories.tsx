import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Button } from "./Button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Apply", onClick: fn() },
  argTypes: {
    tone: { control: "inline-radio", options: ["neutral", "primary", "danger"] },
    size: { control: "inline-radio", options: ["md", "sm"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Primary: Story = { args: { tone: "primary", children: "Save" } };

export const Danger: Story = { args: { tone: "danger", children: "Remove" } };

/** A tone the button does not know is drawn neutral. */
export const UnknownTone: Story = { args: { tone: "sparkly", children: "Unknown tone" } };

export const Small: Story = { args: { size: "sm" } };

export const Pressed: Story = { args: { "aria-pressed": true, children: "Minimap" } };

export const Disabled: Story = { args: { disabled: true } };

/** Busy: a spinner over the words, the same width, and presses ignored. */
export const Busy: Story = {
  args: { busy: true, children: "Saving changes" },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Saving changes" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const BusyPrimary: Story = { args: { busy: true, tone: "primary", children: "Save" } };

/** The same button busy and not, side by side: the width holds. */
export const BusyKeepsWidth: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
      <Button {...args}>Save changes</Button>
      <Button {...args} busy>
        Save changes
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const [idle, busy] = canvas.getAllByRole("button", { name: "Save changes" });
    await expect(busy?.getBoundingClientRect().width).toBe(idle?.getBoundingClientRect().width);
  },
};

/** Every tone and state together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, max-content)", gap: "8px" }}>
      {(["neutral", "primary", "danger"] as const).map((tone) => [
        <Button key={`${tone}-idle`} {...args} tone={tone}>
          {tone}
        </Button>,
        <Button key={`${tone}-sm`} {...args} tone={tone} size="sm">
          {tone} sm
        </Button>,
        <Button key={`${tone}-busy`} {...args} tone={tone} busy>
          {tone} busy
        </Button>,
        <Button key={`${tone}-disabled`} {...args} tone={tone} disabled>
          {tone} disabled
        </Button>,
      ])}
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
