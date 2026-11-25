import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { WarnMark } from "./WarnMark";

const meta = {
  title: "Primitives/WarnMark",
  component: WarnMark,
  args: { label: "rose in the last minute" },
} satisfies Meta<typeof WarnMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The mark alone; its words are for screen readers only. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("!")).toHaveAttribute("aria-hidden", "true");
    await expect(canvas.getByText("rose in the last minute")).toBeInTheDocument();
  },
};

/** Its meaning on hover. */
export const WithTitle: Story = { args: { title: "Dropouts rose in the last minute" } };

/** Beside the words it marks, as it sits in text. */
export const InText: Story = {
  render: (args) => (
    <span>
      Dropouts <WarnMark {...args} /> 3
    </span>
  ),
};
