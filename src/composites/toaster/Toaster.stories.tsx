import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { type ToasterProps, type ToasterToast, Toaster } from "./Toaster";

const toasts: ToasterToast[] = [
  { id: 1, tone: "ok", text: "Saved." },
  { id: 2, tone: "warn", text: "The service is slow to answer.", count: 3 },
  {
    id: 3,
    tone: "err",
    text: (
      <>
        The edit was refused: <code>unknown-port</code> mix-2.side
      </>
    ),
    action: { label: "Show", run: () => {} },
  },
];

/** A positioned box standing in for the app's workspace, so a corner placement has a corner. */
function Workspace(args: ToasterProps) {
  return (
    <div
      style={{
        position: "relative",
        height: "360px",
        border: "1px dashed var(--pb-line)",
        background: "var(--pb-surface)",
      }}
    >
      <Toaster {...args} />
    </div>
  );
}

const meta = {
  title: "Composites/Toaster",
  component: Toaster,
  render: (args) => <Workspace {...args} />,
  args: { toasts, onDismiss: fn(), onHold: fn() },
  argTypes: {
    placement: {
      control: "select",
      options: ["top-start", "top", "top-end", "bottom-start", "bottom", "bottom-end", "inline", "middle"],
    },
  },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At the workspace's bottom end, the newest nearest the edge; an err toast is said as an alert, the rest as status. */
export const BottomEnd: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("region", { name: "Notifications" })).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent("The edit was refused"));
    await expect(canvas.getByRole("status").children).toHaveLength(2);
  },
};

/** At the top start: the newest first. */
export const TopStart: Story = { args: { placement: "top-start" } };

/** Centred on the bottom edge. */
export const Bottom: Story = { args: { placement: "bottom" } };

/** Older toasts folded into a count. */
export const Folded: Story = {
  args: { more: 5 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("and 5 more")).toBeVisible();
  },
};

/** The app's words, through `labels`: the region's name, Dismiss, the fold and the count. */
export const Labels: Story = {
  args: {
    more: 2,
    toasts: [{ id: 1, tone: "ok", text: "Gespeichert.", count: 3 }],
    labels: {
      region: "Meldungen",
      dismiss: "Schließen",
      more: (more) => `und ${more} weitere`,
      count: (count) => `${count} Mal`,
    },
  },
  play: async ({ canvas }) => {
    // The toast fades in from transparent, so these ask for presence, not visibility.
    await expect(canvas.getByRole("region", { name: "Meldungen" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
    await expect(canvas.getByText("und 2 weitere")).toBeInTheDocument();
  },
};

/** A tone it does not know: drawn with a plain stripe. */
export const UnknownTone: Story = {
  args: { toasts: [{ id: 1, tone: "sleeping", text: "Nothing has run for an hour." }] },
};

/** Inline, in the flow where the app put it: inside a canvas's own panel, say. */
export const Inline: Story = {
  args: { placement: "inline" },
  render: (args) => <Toaster {...args} />,
};

/** The action runs and the toast is dismissed. */
export const Action: Story = {
  args: { toasts: [{ id: 9, tone: "err", text: "The connection was lost.", action: { label: "Retry", run: fn() } }] },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    await expect(args.toasts[0]?.action?.run).toHaveBeenCalledOnce();
    await expect(args.onDismiss).toHaveBeenCalledWith(9);
  },
};

/** Hovering holds the stack, so the app stops its expiry. */
export const Hold: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.hover(canvas.getAllByRole("listitem")[0] as HTMLElement);
    await waitFor(() => expect(args.onHold).toHaveBeenLastCalledWith(true));
    await userEvent.unhover(canvas.getAllByRole("listitem")[0] as HTMLElement);
    await waitFor(() => expect(args.onHold).toHaveBeenLastCalledWith(false));
  },
};

/** Escape on a focused toast dismisses it, and the focus moves to the toast beside it. */
export const Escape: Story = {
  render: function Render(args) {
    const [shown, setShown] = useState(args.toasts);
    return (
      <Workspace
        {...args}
        toasts={shown}
        onDismiss={(id) => {
          args.onDismiss(id);
          setShown((all) => all.filter((toast) => toast.id !== id));
        }}
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    const dismiss = canvas.getAllByRole("button", { name: "Dismiss" });
    dismiss[2]?.focus();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
    await expect(canvas.getAllByRole("listitem")[1]).toHaveFocus();
  },
};

/** At phone width the stack takes the width less the gutters. */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ width: "320px" }}>
      <Workspace {...args} />
    </div>
  ),
};

/** Every tone together, for a glance under each brand and theme. */
export const All: Story = {
  args: {
    more: 2,
    toasts: ["ok", "warn", "err", "quiet", "off", "accent", "muted", "sleeping"].map((tone, index) => ({
      id: index + 1,
      tone,
      text: `A ${tone} toast.`,
      count: index === 1 ? 2 : 1,
      action: index === 2 ? { label: "Act", run: () => {} } : undefined,
    })),
  },
  render: (args) => (
    <div style={{ position: "relative", height: "720px" }}>
      <Toaster {...args} />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
