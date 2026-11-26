import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { KeyValue } from "../../primitives";
import { readBreakpoint, useMediaBreakpoint } from "./useMediaBreakpoint";

/** Shows the window's width class and touch flag; change the viewport to see them follow. */
function BreakpointDemo() {
  const { width, touch } = useMediaBreakpoint();
  return (
    <div
      style={{
        maxWidth: "360px",
        padding: "var(--pb-space-4)",
        background: "var(--pb-surface)",
        color: "var(--pb-text)",
        fontFamily: "var(--pb-font-ui)",
      }}
    >
      <KeyValue
        label="This window"
        rows={[
          { key: "Width", value: width, title: "wide from 760 px, narrow below, phone below 600 px" },
          { key: "Touch", value: touch ? "yes" : "no", title: "(hover: none) and (pointer: coarse)" },
        ]}
      />
    </div>
  );
}

const meta = {
  title: "Hooks/useMediaBreakpoint",
  component: BreakpointDemo,
} satisfies Meta<typeof BreakpointDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The window the story is drawn in. */
export const All: Story = {
  play: async ({ canvas }) => {
    const { width, touch } = readBreakpoint();
    await expect(canvas.getByText(width)).toBeVisible();
    await expect(canvas.getByText(touch ? "yes" : "no")).toBeVisible();
  },
};

/** Under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
