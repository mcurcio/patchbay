import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { Button } from "../button";
import { TextInput } from "../text-input";
import { Sheet } from "./Sheet";

/** The sheet is placed over its container's edge: here a stand-in workspace. */
const workspace = {
  position: "relative",
  height: "420px",
  overflow: "hidden",
  border: "1px dashed var(--pb-line)",
  background: "var(--pb-surface)",
} as const;

const meta = {
  title: "Primitives/Sheet",
  component: Sheet,
  args: {
    open: true,
    onClose: fn(),
    title: "gain_1",
    children: <p style={{ margin: 0 }}>The selected node&apos;s settings.</p>,
  },
  argTypes: { side: { control: "inline-radio", options: ["right", "bottom"] } },
  decorators: [
    (Story) => (
      <div style={workspace}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

export const Bottom: Story = { args: { side: "bottom" } };

/** A right sheet as wide as the app keeps its inspector. */
export const Wide: Story = { args: { width: 520 } };

/** Named by a label, with no title drawn. */
export const Untitled: Story = { args: { title: undefined, label: "Inspector" } };

/** More than fits: the body scrolls under the head. */
export const Long: Story = {
  args: {
    side: "bottom",
    children: (
      <div>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i}>Setting {i + 1}</p>
        ))}
      </div>
    ),
  },
};

export const Closed: Story = { args: { open: false } };

/** The app's word for Close. */
export const Labels: Story = { args: { closeLabel: "Fermer" } };

/** Held by the story: Escape inside closes it, and the focus goes back to the opener. */
export const OpenAndClose: Story = {
  args: { open: false },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Inspect
        </Button>
        <Sheet
          {...args}
          open={open}
          onClose={() => {
            args.onClose();
            setOpen(false);
          }}
        >
          <TextInput aria-label="Gain" defaultValue="-6" />
        </Sheet>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "Inspect" });
    await userEvent.click(opener);
    await expect(opener).toHaveFocus();
    // The close button, the body (a stop of its own, so a long one scrolls), then the field.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("textbox", { name: "Gain" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByRole("dialog")).toBeNull();
    await expect(opener).toHaveFocus();
  },
};

export const Phone: Story = { args: { side: "bottom" }, globals: { viewport: { value: "phone" } } };
