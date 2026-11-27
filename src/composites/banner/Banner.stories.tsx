import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { Button } from "../../primitives/button";
import { tokenColor } from "../../test/token-color";
import { Banner } from "./Banner";

const meta = {
  title: "Composites/Banner",
  component: Banner,
  args: { tone: "warn", children: "The file changed on disk since it was opened." },
  argTypes: {
    tone: { control: "select", options: ["ok", "warn", "err", "quiet", "off", "accent", "muted", "unknown-tone"] },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Warn: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("The file changed on disk");
  },
};

/** An error is an alert, read at once. */
export const Err: Story = {
  args: { tone: "err", children: "The connection was lost." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("The connection was lost.");
  },
};

export const Ok: Story = { args: { tone: "ok", children: "Saved." } };
export const Quiet: Story = { args: { tone: "quiet", children: "Reconnecting…" } };
export const Off: Story = { args: { tone: "off", children: "The service is stopped." } };
export const Accent: Story = { args: { tone: "accent", children: "Showing your own changes only." } };
export const Muted: Story = { args: { tone: "muted", children: "This view has no live values." } };

/** A tone the banner does not know: drawn neutrally, its stripe in line-strong. */
export const UnknownTone: Story = {
  args: { tone: "sleeping", children: "Nothing has run for an hour." },
  play: async ({ canvasElement }) => {
    const banner = getComputedStyle(within(canvasElement).getByRole("status"));
    await expect(banner.borderInlineStartColor).toBe(tokenColor(canvasElement, "line-strong"));
  },
};

/** The app's buttons at its end. */
export const WithActions: Story = {
  args: {
    actions: (
      <>
        <Button size="sm">Reload</Button>
        <Button size="sm" tone="primary">
          Keep mine
        </Button>
      </>
    ),
  },
};

/** A close button that asks the app to take it away. */
export const Dismissible: Story = {
  args: { onDismiss: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss" }));
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

/** The app's word for Dismiss, through `labels`. */
export const Labels: Story = {
  args: { onDismiss: fn(), labels: { dismiss: "Schließen" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  },
};

/** Long words wrap, and the actions drop under them in a narrow pane. */
export const Narrow: Story = {
  args: {
    tone: "err",
    children: "The edit was refused: the port it names is no longer there, so the link cannot be made.",
    actions: <Button size="sm">Show the port</Button>,
    onDismiss: fn(),
  },
  render: (args) => (
    <div style={{ width: "280px" }}>
      <Banner {...args} />
    </div>
  ),
};

/** Every tone together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "8px" }}>
      {["ok", "warn", "err", "quiet", "off", "accent", "muted", "sleeping"].map((tone) => (
        <Banner key={tone} {...args} tone={tone} actions={<Button size="sm">Act</Button>} onDismiss={() => {}}>
          A {tone} banner.
        </Banner>
      ))}
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
