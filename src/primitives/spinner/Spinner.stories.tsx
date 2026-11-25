import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Spinner } from "./Spinner";

const meta = {
  title: "Primitives/Spinner",
  component: Spinner,
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Decoration: hidden from screen readers, as inside a busy button. */
export const Unlabelled: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".pb-spinner")).toHaveAttribute("aria-hidden", "true");
  },
};

/** A status that screen readers announce by its label. */
export const Labelled: Story = {
  args: { label: "Loading" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading");
  },
};

/** The ring follows the text's size and colour. */
export const InText: Story = {
  render: () => (
    <p style={{ fontSize: "20px", color: "var(--pb-accent)" }}>
      <Spinner /> Working
    </p>
  ),
};
