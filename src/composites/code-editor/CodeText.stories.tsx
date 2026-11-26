import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { CodeText } from "./CodeText";
import type { CodeSpan } from "./highlight";

const sample = `# The mixer's settings
@set rate 48000;

mixer {
\tchannels 2;
\tname "main";
\tgain $rate;
\tbroken "unterminated;
}`;

/** A neutral app highlighter: every number. */
function numbers(text: string): CodeSpan[] {
  return [...text.matchAll(/\d+(\.\d+)?/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    class: "number",
  }));
}

const meta = {
  title: "Composites/CodeText",
  component: CodeText,
  args: { value: sample, language: "knobly", "aria-label": "Settings" },
} satisfies Meta<typeof CodeText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** knobly text, read-only and highlighted once the knobly peer has loaded. */
export const Knobly: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-class="variable"]')).toHaveTextContent("$rate"));
    await expect(canvasElement.querySelector('[data-class="error"]')).not.toBeNull();
  },
};

/** The app's own highlighter. */
export const AppHighlighter: Story = {
  args: { value: "rate = 48000\ngain = 0.8\n", language: undefined, highlight: numbers },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-class="number"]')).toHaveLength(2);
  },
};

/** A wide line scrolls sideways; the box is a tab stop, so it scrolls from the keyboard too. */
export const Wide: Story = {
  args: { value: `note "${"a long value that keeps going ".repeat(10)}";` },
  render: (args) => (
    <div style={{ width: "320px" }}>
      <CodeText {...args} />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.keyboard("{Tab}");
    await expect(canvas.getByLabelText("Settings")).toHaveFocus();
  },
};

/** Plain text, in a language it does not know. */
export const Plain: Story = { args: { language: "unknown" } };

/** Each form together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "560px" }}>
      <CodeText {...args} />
      <CodeText value={"rate = 48000\ngain = 0.8"} highlight={numbers} aria-label="Numbers" />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
