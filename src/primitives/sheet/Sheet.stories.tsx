import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
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
    title: "transform_1",
    children: <p style={{ margin: 0 }}>The selected node&apos;s settings.</p>,
  },
  argTypes: { side: { control: "inline-radio", options: ["end", "start", "bottom"] } },
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

/** The sheet's edge and its container's, in px, once the entrance has finished. */
async function edges(canvasElement: HTMLElement) {
  const sheet = canvasElement.querySelector<HTMLElement>(".pb-sheet");
  const box = sheet?.parentElement;
  if (sheet == null || box == null) throw new Error("no sheet");
  await waitFor(() => expect(sheet.getAnimations()).toHaveLength(0));
  const inner = box.getBoundingClientRect();
  const border = parseFloat(getComputedStyle(box).borderLeftWidth);
  return { sheet: sheet.getBoundingClientRect(), left: inner.left + border, right: inner.right - border };
}

/** At the inline end, the default: the right edge in left-to-right text. */
export const End: Story = {
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const { sheet, right } = await edges(canvasElement);
    await expect(Math.abs(sheet.right - right)).toBeLessThan(0.5);
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** At the inline start: the left edge in left-to-right text. */
export const Start: Story = {
  args: { side: "start" },
  play: async ({ canvasElement }) => {
    const { sheet, left } = await edges(canvasElement);
    await expect(Math.abs(sheet.left - left)).toBeLessThan(0.5);
  },
};

/** Right-to-left text: the inline end is the left edge, so the sheet is there, its close button at its left end. */
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const { sheet, left } = await edges(canvasElement);
    await expect(Math.abs(sheet.left - left)).toBeLessThan(0.5);
    const close = canvas.getByRole("button", { name: "Close" }).getBoundingClientRect();
    await expect(close.left - sheet.left).toBeLessThan(sheet.width / 2);
  },
};

/** Right-to-left text at the inline start: the right edge. */
export const RightToLeftStart: Story = {
  ...RightToLeft,
  args: { side: "start" },
  play: async ({ canvasElement }) => {
    const { sheet, right } = await edges(canvasElement);
    await expect(Math.abs(sheet.right - right)).toBeLessThan(0.5);
  },
};

export const Bottom: Story = { args: { side: "bottom" } };

/** An inline sheet as wide as the app keeps its inspector. */
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
export const Labels: Story = { args: { labels: { close: "Fermer" } } };

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
          <TextInput aria-label="Timeout" defaultValue="30" />
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
    await expect(canvas.getByRole("textbox", { name: "Timeout" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByRole("dialog")).toBeNull();
    await expect(opener).toHaveFocus();
  },
};

export const Phone: Story = { args: { side: "bottom" }, globals: { viewport: { value: "phone" } } };
