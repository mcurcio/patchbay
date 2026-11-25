import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "../button";
import { SectionTitle } from "./SectionTitle";

const meta = {
  title: "Primitives/SectionTitle",
  component: SectionTitle,
  args: { children: "Connection" },
} satisfies Meta<typeof SectionTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The slot at the far end: here a button, whose click goes to the app. */
const onAdd = fn();
export const WithActions: Story = {
  args: {
    children: "Ports",
    actions: (
      <Button size="sm" onClick={onAdd}>
        Add
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Add" }));
    await expect(onAdd).toHaveBeenCalledOnce();
  },
};

/** A long title wraps before its actions shrink. */
export const LongTitle: Story = {
  args: {
    children: "A section title long enough to wrap onto a second line in a narrow panel",
    actions: <span>12</span>,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 260 }}>
        <Story />
      </div>
    ),
  ],
};

export const Level2: Story = { args: { level: 2, children: "Service" } };
