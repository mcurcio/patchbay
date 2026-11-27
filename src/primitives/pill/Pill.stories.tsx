import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { tokenColor } from "../../test/token-color";
import { Pill } from "./Pill";

const meta = {
  title: "Primitives/Pill",
  component: Pill,
  args: { tone: "ok", label: "running" },
  argTypes: {
    tone: { control: "select", options: ["ok", "warn", "err", "quiet", "off", "accent", "muted", "unknown-tone"] },
  },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {};
export const Warn: Story = { args: { tone: "warn", label: "degraded" } };
export const Err: Story = { args: { tone: "err", label: "failed" } };
export const Quiet: Story = { args: { tone: "quiet", label: "idle" } };
export const Off: Story = { args: { tone: "off", label: "stopped" } };
export const Accent: Story = { args: { tone: "accent", label: "reconfiguring" } };
export const Muted: Story = { args: { tone: "muted", label: "offline" } };

/** A tone the pill does not know: drawn neutrally, by its own word, its dot and word muted. */
export const UnknownTone: Story = {
  args: { tone: "sleeping", label: "sleeping" },
  play: async ({ canvasElement }) => {
    const pill = within(canvasElement).getByText("sleeping");
    await expect(getComputedStyle(pill).color).toBe(tokenColor(canvasElement, "muted"));
  },
};

/** The dot pulses while a state is on its way; the word stays still. */
export const Pulsing: Story = {
  args: { tone: "quiet", label: "configuring", pulse: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("configuring")).toHaveAttribute("data-pulse");
  },
};

/** A failure's code after the word, and its meaning on hover. */
export const WithDetail: Story = {
  args: { tone: "err", label: "failed", detail: "E_GONE", title: "The device went away" },
  play: async ({ canvasElement }) => {
    const detail = within(canvasElement).getByText("E_GONE");
    await expect(detail.tagName).toBe("CODE");
  },
};

/** Every tone side by side, for a glance under each brand and theme. */
export const All: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Pill tone="ok" label="running" />
      <Pill tone="warn" label="degraded" />
      <Pill tone="err" label="failed" detail="E_GONE" />
      <Pill tone="quiet" label="configuring" pulse />
      <Pill tone="off" label="stopped" />
      <Pill tone="accent" label="reconfiguring" />
      <Pill tone="muted" label="offline" />
      <Pill tone="sleeping" label="sleeping" />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
