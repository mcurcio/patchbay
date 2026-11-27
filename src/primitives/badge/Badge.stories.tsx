import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { tokenColor } from "../../test/token-color";
import { WarnMark } from "../warn-mark/WarnMark";
import { Badge } from "./Badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  args: { tone: "ok", children: "live" },
  argTypes: {
    tone: {
      control: "select",
      options: [
        "ok",
        "warn",
        "err",
        "quiet",
        "off",
        "accent",
        "muted",
        "added",
        "removed",
        "renamed",
        "changed",
        "unknown-tone",
      ],
    },
    variant: { control: "inline-radio", options: ["outlined", "filled"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {};
export const Warn: Story = { args: { tone: "warn", children: "3 retries" } };
export const Err: Story = { args: { tone: "err", children: "failing" } };
export const Quiet: Story = { args: { tone: "quiet", children: "idle" } };
export const Off: Story = { args: { tone: "off", children: "off" } };
export const Accent: Story = { args: { tone: "accent", children: "selected" } };
export const Muted: Story = { args: { tone: "muted", children: "read-only" } };

/** The change tones: an edit not yet applied. */
export const Added: Story = { args: { tone: "added", children: "added" } };
export const Removed: Story = { args: { tone: "removed", children: "removed" } };
export const Renamed: Story = { args: { tone: "renamed", children: "renamed" } };
export const Changed: Story = { args: { tone: "changed", children: "changed" } };

/** Filled: the tone's colour under on-strong words, for a fact that must stand out. */
export const Filled: Story = {
  args: { tone: "err", variant: "filled", children: "not ready" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("not ready")).toHaveAttribute("data-variant", "filled");
  },
};

/** A tone the badge does not know: muted words and a line-strong edge. */
export const UnknownTone: Story = {
  args: { tone: "mystery", children: "new" },
  play: async ({ canvasElement }) => {
    const badge = getComputedStyle(within(canvasElement).getByText("new"));
    await expect(badge.color).toBe(tokenColor(canvasElement, "muted"));
    await expect(badge.borderTopColor).toBe(tokenColor(canvasElement, "line-strong"));
  },
};

/** Its meaning on hover. */
export const WithTitle: Story = {
  args: { tone: "warn", children: "3 retries", title: "Retries in the last minute" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("3 retries")).toHaveAttribute("title", "Retries in the last minute");
  },
};

/** A warning mark inside, as a count that rose lately carries one. */
export const WithWarnMark: Story = {
  args: {
    tone: "warn",
    children: (
      <>
        <WarnMark label="rose lately" />3 retries
      </>
    ),
  },
};

const tones = [
  ["ok", "live"],
  ["warn", "3 retries"],
  ["err", "failing"],
  ["quiet", "idle"],
  ["off", "off"],
  ["accent", "selected"],
  ["muted", "read-only"],
  ["added", "added"],
  ["removed", "removed"],
  ["renamed", "renamed"],
  ["changed", "changed"],
  ["mystery", "new"],
] as const;

/** Every tone, outlined and filled, for a glance under each brand and theme. */
export const All: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      {(["outlined", "filled"] as const).map((variant) => (
        <div key={variant} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tones.map(([tone, words]) => (
            <Badge key={tone} tone={tone} variant={variant}>
              {words}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
