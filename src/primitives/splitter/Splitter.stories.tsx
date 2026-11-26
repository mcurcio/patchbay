import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { Splitter, type SplitterProps } from "./Splitter";

/** The splitter on the edge of a pane it resizes, inside a frame, with the size held by the story as an app holds it. */
function Resizable(args: SplitterProps) {
  const [size, setSize] = useState(args.value);
  const vertical = args.orientation === "vertical";
  const startEdge = (args.edge ?? "start") === "start";
  const pane = (
    <div
      style={{
        position: "relative",
        flex: "none",
        [vertical ? "width" : "height"]: `${String(size)}px`,
        background: "var(--pb-raised)",
        color: "var(--pb-text)",
        padding: "var(--pb-space-3)",
        boxSizing: "border-box",
        [vertical
          ? startEdge
            ? "borderInlineStart"
            : "borderInlineEnd"
          : startEdge
            ? "borderBlockStart"
            : "borderBlockEnd"]: "1px solid var(--pb-line)",
      }}
    >
      {String(size)} px
      <Splitter
        {...args}
        value={size}
        onChange={(px) => {
          args.onChange(px);
          setSize(px);
        }}
      />
    </div>
  );
  const rest = <div style={{ flex: "1 1 auto", background: "var(--pb-surface)" }} />;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "row" : "column",
        width: "720px",
        maxWidth: "100%",
        height: "360px",
        border: "1px solid var(--pb-line)",
        fontFamily: "var(--pb-font-ui)",
        fontSize: "var(--pb-text-md)",
      }}
    >
      {startEdge ? rest : pane}
      {startEdge ? pane : rest}
    </div>
  );
}

const meta = {
  title: "Primitives/Splitter",
  component: Splitter,
  render: (args) => <Resizable {...args} />,
  args: { orientation: "vertical", label: "Resize the pane", value: 320, min: 280, max: 560, onChange: fn() },
  argTypes: {
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"] },
    edge: { control: "inline-radio", options: ["start", "end"] },
  },
} satisfies Meta<typeof Splitter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A side pane's start edge (its left): drag it, or focus it and use the arrows, Home and End. */
export const Vertical: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const splitter = canvas.getByRole("separator", { name: "Resize the pane" });
    await userEvent.tab();
    await expect(splitter).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "336");
    await userEvent.keyboard("{End}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "560");
    await userEvent.keyboard("{Home}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "280");
    await expect(args.onChange).toHaveBeenLastCalledWith(280);
  },
};

/** A pane on the left, resized by its end edge (its right): the right arrow grows it. */
export const VerticalEndEdge: Story = { args: { edge: "end" } };

/** A bottom drawer's top edge: the up arrow grows it. */
export const Horizontal: Story = {
  args: { orientation: "horizontal", label: "Resize the drawer", value: 160, min: 120, max: 300 },
  play: async ({ canvas, userEvent }) => {
    const splitter = canvas.getByRole("separator", { name: "Resize the drawer" });
    splitter.focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "176");
  },
};

/** A drag with the pointer, clamped at the max. */
export const Dragged: Story = {
  play: async ({ canvas }) => {
    const splitter = canvas.getByRole("separator");
    const box = splitter.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const at = (type: string, clientX: number) =>
      splitter.dispatchEvent(
        new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, isPrimary: true, clientX, clientY: y }),
      );
    at("pointerdown", x);
    await expect(splitter).toHaveAttribute("data-dragging");
    // A pointer move is a continuous event, which React renders on its next frame.
    at("pointermove", x - 40);
    await waitFor(() => expect(splitter).toHaveAttribute("aria-valuenow", "360"));
    at("pointermove", x - 1000);
    await waitFor(() => expect(splitter).toHaveAttribute("aria-valuenow", "560"));
    at("pointerup", x - 1000);
    await expect(splitter).not.toHaveAttribute("data-dragging");
  },
};

/**
 * Right-to-left text: the start edge is the pane's right, so the splitter sits there, the right arrow grows the pane,
 * and so does a drag to the right.
 */
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  play: async ({ args, canvas, userEvent }) => {
    const splitter = canvas.getByRole("separator", { name: "Resize the pane" });
    const pane = splitter.parentElement as HTMLElement;
    const edge = splitter.getBoundingClientRect();
    // Centred on the pane's inner right edge, inside its 1 px border.
    const right = pane.getBoundingClientRect().right - parseFloat(getComputedStyle(pane).borderRightWidth);
    await expect(Math.abs(edge.left + edge.width / 2 - right)).toBeLessThan(0.5);
    splitter.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "336");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(splitter).toHaveAttribute("aria-valuenow", "320");
    const y = edge.top + edge.height / 2;
    const x = edge.left + edge.width / 2;
    const at = (type: string, clientX: number) =>
      splitter.dispatchEvent(
        new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, isPrimary: true, clientX, clientY: y }),
      );
    at("pointerdown", x);
    at("pointermove", x + 40);
    await waitFor(() => expect(splitter).toHaveAttribute("aria-valuenow", "360"));
    at("pointerup", x + 40);
    await expect(args.onChange).toHaveBeenLastCalledWith(360);
  },
};

/** Focused, as after a Tab: the accent bar is the cue. */
export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("separator")).toHaveFocus();
  },
};

export const FocusedHarborDark: Story = { ...Focused, globals: { brand: "harbor", theme: "dark" } };

export const FocusedEmberLight: Story = { ...Focused, globals: { brand: "ember", theme: "light" } };
