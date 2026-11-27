import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { tokenColor } from "../../test/token-color";
import { StatusWords } from "./StatusWords";

const meta = {
  title: "Composites/StatusWords",
  component: StatusWords,
  args: {
    "aria-label": "Status",
    items: [
      { tone: "err", label: "2 errors", title: "Lines 4 and 9" },
      { tone: "warn", label: "1 warning" },
      { tone: "ok", label: "saved" },
    ],
  },
} satisfies Meta<typeof StatusWords>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Most urgent first, in the order given; one polite live region. */
export const Mixed: Story = {
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list", { name: "Status" });
    await expect(list).toHaveAttribute("aria-live", "polite");
    const words = canvas.getAllByRole("listitem").map((item) => item.textContent);
    await expect(words).toEqual(["2 errors", "1 warning", "saved"]);
  },
};

export const One: Story = { args: { items: [{ tone: "ok", label: "saved" }] } };

/** Nothing to say: an empty region, still live for the next change. */
export const Empty: Story = { args: { items: [] } };

/** A tone the words do not know: drawn neutrally, in muted words. */
export const UnknownTone: Story = {
  args: {
    items: [
      { tone: "sleeping", label: "sleeping" },
      { tone: "quiet", label: "connecting" },
    ],
  },
  play: async ({ canvasElement }) => {
    const word = within(canvasElement).getByText("sleeping");
    await expect(getComputedStyle(word).color).toBe(tokenColor(canvasElement, "muted"));
  },
};

/** Every tone together, for a glance under each brand and theme. */
export const All: Story = {
  args: {
    items: ["err", "warn", "ok", "quiet", "off", "accent", "muted", "sleeping"].map((tone) => ({ tone, label: tone })),
  },
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
