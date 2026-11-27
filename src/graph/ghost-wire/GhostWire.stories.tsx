import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import type { Edge } from "@xyflow/react";
import { expect, waitFor } from "storybook/test";
import { type BoxNode, StoryCanvas } from "../../test/story-canvas";
import { tokenColor } from "../../test/token-color";
import { Wire } from "../wire";
import { GhostWire, type GhostWireData } from "./GhostWire";

const edgeTypes = { ghost: GhostWire, wire: Wire };

const box = (id: string, x: number, y: number, data: BoxNode["data"]): BoxNode => ({
  id,
  type: "box",
  position: { x, y },
  data,
});

const pair = (count: number): BoxNode[] => [
  box("src", 0, 0, {
    title: "Tone 1",
    subtitle: "oscillator",
    outputs: Array.from({ length: count }, (_, index) => ({ id: `o${index}`, label: `out ${index + 1}` })),
  }),
  box("dst", 360, 0, {
    title: "mix-2",
    subtitle: "mixer",
    inputs: Array.from({ length: count }, (_, index) => ({ id: `i${index}`, label: `in ${index + 1}` })),
  }),
];

/** A request's edge, as an app adds it: unselectable, unfocusable and undeletable. */
const ghost = (index: number, data: GhostWireData): Edge => ({
  id: `g${index}`,
  source: "src",
  sourceHandle: `o${index}`,
  target: "dst",
  targetHandle: `i${index}`,
  type: "ghost",
  data,
  selectable: false,
  focusable: false,
  deletable: false,
});

const nodesOfOne = pair(1);

const meta = {
  title: "Graph/GhostWire",
  args: {},
  argTypes: {
    tone: { control: "select", options: ["pending", "refused", "maybe"] },
    label: { control: "text" },
  },
  render: (args) => <StoryCanvas height={200} nodes={nodesOfOne} edges={[ghost(0, args)]} edgeTypes={edgeTypes} />,
} satisfies Meta<GhostWireData>;

export default meta;
type Story = StoryObj<typeof meta>;

const found = (root: HTMLElement, selector: string) =>
  waitFor(() => {
    const element = root.querySelector<SVGElement>(selector);
    if (element === null) throw new Error(`no ${selector} yet`);
    return element;
  });

/** A request on its way: dashed in the quiet tone, dimmed, never under the pointer. */
export const Pending: Story = {
  play: async ({ canvasElement }) => {
    const group = await found(canvasElement, ".pb-ghost-wire");
    await expect(group).toHaveAttribute("data-tone", "pending");
    await expect(getComputedStyle(group).pointerEvents).toBe("none");
    await expect(canvasElement.querySelector(".react-flow__edge-interaction")).toBeNull();
  },
};

/** Refused: the error tone, until the app removes it. */
export const Refused: Story = { args: { tone: "refused", label: "refused" } };

/** A tone it does not know: the muted stroke, dashed and dimmed; its label's edge in line-strong. */
export const UnknownTone: Story = {
  args: { tone: "maybe", label: "on its way" },
  play: async ({ canvasElement }) => {
    await expect(await found(canvasElement, ".pb-ghost-wire")).toHaveAttribute("data-tone", "maybe");
    const path = await found(canvasElement, ".pb-ghost-wire-path");
    await expect(getComputedStyle(path).stroke).toBe(tokenColor(canvasElement, "muted"));
    const label = await found(canvasElement, ".pb-ghost-wire-label");
    await expect(getComputedStyle(label).borderTopColor).toBe(tokenColor(canvasElement, "line-strong"));
  },
};

/** It takes no focus: Tab passes it by. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    await found(canvasElement, ".pb-ghost-wire");
    await expect(canvasElement.querySelector(".react-flow__edge")).not.toHaveAttribute("tabindex");
  },
};

/** Beside a wire: a request plainly not yet an edge. */
export const All: Story = {
  render: () => (
    <StoryCanvas
      height={240}
      nodes={pair(4)}
      edges={[
        { id: "w", source: "src", sourceHandle: "o0", target: "dst", targetHandle: "i0", type: "wire", data: {} },
        ghost(1, {}),
        ghost(2, { tone: "refused", label: "refused" }),
        ghost(3, { tone: "maybe", label: "on its way" }),
      ]}
      edgeTypes={edgeTypes}
    />
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-ghost-wire")).toHaveLength(3));
  },
};

/** The same under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
