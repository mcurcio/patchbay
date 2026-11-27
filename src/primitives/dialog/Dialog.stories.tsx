import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useLayoutEffect, useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { Button } from "../button";
import { Field } from "../field";
import { TextInput } from "../text-input";
import { Dialog } from "./Dialog";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  args: {
    open: true,
    onClose: fn(),
    title: "Add a node",
    children: <p style={{ margin: 0 }}>Pick a type to add to the graph.</p>,
  },
  // The dialog covers the page; give the docs page room for it.
  parameters: { docs: { story: { inline: false, height: "420px" } } },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open, with only words: the dialog itself holds the focus. Escape asks to close. */
export const Open: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = screen.getByRole("dialog", { name: "Add a node" });
    await expect(dialog).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** A form with actions: the first field takes the focus and Tab stays inside. */
export const WithActions: Story = {
  args: {
    children: (
      <Field label="Name">
        <TextInput defaultValue="transform_1" />
      </Field>
    ),
    actions: (
      <>
        <Button>Cancel</Button>
        <Button tone="primary">Add</Button>
      </>
    ),
  },
  play: async ({ userEvent }) => {
    const field = screen.getByRole("textbox", { name: "Name" });
    await expect(field).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    // The body, a stop of its own so a long one scrolls, then round to the field.
    await userEvent.tab();
    await userEvent.tab();
    await expect(field).toHaveFocus();
  },
};

/** More than fits: the body scrolls between the title and the actions. */
export const Long: Story = {
  args: {
    children: (
      <div>
        {Array.from({ length: 40 }, (_, i) => (
          <p key={i}>Line {i + 1}</p>
        ))}
      </div>
    ),
    actions: <Button tone="primary">Done</Button>,
  },
};

/** A long title wraps beside the close button. */
export const LongTitle: Story = {
  args: { title: "A title long enough to need a second line on a narrow window, beside the close button" },
};

/** The app's word for Close. */
export const Labels: Story = {
  args: { title: "Ajouter un nœud", labels: { close: "Fermer" } },
  play: async () => {
    await expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  },
};

export const Phone: Story = {
  args: { actions: <Button tone="primary">Add</Button> },
  globals: { viewport: { value: "phone" } },
};

/** Sets the page's direction while the story is shown, as an app sets dir on its <html>: the dialog is in a portal on
 * <body>, so a wrapper's dir would not reach it. */
function PageDirection({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const was = root.getAttribute("dir");
    root.setAttribute("dir", dir);
    return () => {
      if (was === null) root.removeAttribute("dir");
      else root.setAttribute("dir", was);
    };
  }, [dir]);
  return children;
}

/** Right-to-left text: the head mirrors, its wider padding on the title's side (the right) and the close button at
 * the left. */
export const RightToLeft: Story = {
  args: { title: "إضافة عقدة", children: <p style={{ margin: 0 }}>اختر نوعًا لإضافته.</p>, labels: { close: "إغلاق" } },
  decorators: [
    (Story) => (
      <PageDirection dir="rtl">
        <Story />
      </PageDirection>
    ),
  ],
  play: async () => {
    const dialog = screen.getByRole("dialog", { name: "إضافة عقدة" });
    const head = dialog.querySelector(".pb-dialog-head");
    if (head === null) throw new Error("no head");
    const style = getComputedStyle(head);
    await expect(parseFloat(style.paddingRight)).toBeGreaterThan(parseFloat(style.paddingLeft));
    const box = dialog.getBoundingClientRect();
    const close = screen.getByRole("button", { name: "إغلاق" }).getBoundingClientRect();
    await expect(close.left - box.left).toBeLessThan(box.width / 2);
  },
};

/** Held by the story, as an app holds it: the opener gets the focus back on closing. */
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
          Add a node
        </Button>
        <Dialog
          {...args}
          open={open}
          onClose={() => {
            args.onClose();
            setOpen(false);
          }}
        >
          <TextInput aria-label="Search node types" />
        </Dialog>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "Add a node" });
    await userEvent.click(opener);
    await expect(screen.getByRole("textbox", { name: "Search node types" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(opener).toHaveFocus();
  },
};
