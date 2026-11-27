import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { type Edge, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useEffect, useState } from "react";
import { expect, waitFor } from "storybook/test";
import { type BoxNode, StoryCanvas, storyNodeTypes } from "../../test/story-canvas";
import { tokenColor } from "../../test/token-color";
import { Wire, type WireData } from "./Wire";

const edgeTypes = { wire: Wire };

const box = (id: string, x: number, y: number, data: BoxNode["data"]): BoxNode => ({
  id,
  type: "box",
  position: { x, y },
  data,
});

/** A source with outputs `o0`… and a sink with inputs `i0`…, 300 px apart. */
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

const wire = (index: number, data: WireData, selected = false): Edge => ({
  id: `w${index}`,
  source: "src",
  sourceHandle: `o${index}`,
  target: "dst",
  targetHandle: `i${index}`,
  type: "wire",
  data,
  selected,
});

const nodesOfOne = pair(1);

const meta = {
  title: "Graph/Wire",
  args: {},
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
        "refused",
      ],
    },
    emphasis: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    label: { control: "text" },
  },
  render: (args) => <StoryCanvas height={200} nodes={nodesOfOne} edges={[wire(0, args)]} edgeTypes={edgeTypes} />,
} satisfies Meta<WireData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The plain wire: React Flow's edge stroke, 1.5 px. */
export const Plain: Story = {
  play: async ({ canvasElement }) => {
    const path = await waitFor(() => {
      const found = canvasElement.querySelector(".pb-wire-path");
      if (found === null) throw new Error("no wire yet");
      return found;
    });
    await expect(path).toHaveClass("react-flow__edge-path");
    await expect(getComputedStyle(path).strokeWidth).toBe("1.5px");
  },
};

/** A tone: here the ok tone, as a signal that flows. */
export const Tone: Story = { args: { tone: "ok" } };

/** A tone it does not know: the muted stroke. */
export const UnknownTone: Story = {
  args: { tone: "maybe" },
  play: async ({ canvasElement }) => {
    const path = await waitFor(() => {
      const found = canvasElement.querySelector(".pb-wire-path");
      if (found === null) throw new Error("no wire yet");
      return found;
    });
    await expect(canvasElement.querySelector(".pb-wire")).toHaveAttribute("data-tone", "maybe");
    await expect(getComputedStyle(path).stroke).toBe(tokenColor(canvasElement, "muted"));
  },
};

/** A queued edit: a change's tone, dashed. */
export const Dashed: Story = { args: { tone: "added", dashed: true } };

const changes = ["added", "removed", "renamed", "changed"];

/** Each change tone, a queued edit: always dashed, so it never rests on colour alone, with or without `dashed`. */
export const Changes: Story = {
  render: () => (
    <StoryCanvas
      height={240}
      nodes={pair(changes.length)}
      edges={changes.map((tone, index) => wire(index, { tone, label: tone }))}
      edgeTypes={edgeTypes}
    />
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-wire-path")).toHaveLength(changes.length));
    for (const path of canvasElement.querySelectorAll(".pb-wire-path")) {
      await expect(getComputedStyle(path).strokeDasharray).not.toBe("none");
    }
  },
};

/** A refused or failed wire says why in words, here its label; a longer reason goes in the inspector. */
export const Refused: Story = { args: { tone: "refused", dashed: true, label: "refused: types differ" } };

/** Dots moving toward the input; under reduced motion they are not drawn. */
export const Flow: Story = { args: { tone: "ok", flow: true, emphasis: 0.6 } };

/** An arrowhead at the input end, in the wire's tone. */
export const Arrow: Story = { args: { tone: "accent", arrow: true } };

/** Words at the midpoint, and a tooltip on the wire. */
export const LabelAndTitle: Story = { args: { label: "x 2", title: "out 1 to in 1" } };

/** A moving level, 30 a second: the width and brightness change while the path stays as it was built. */
function LiveDemo() {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => {
      setLevel(0.5 - 0.5 * Math.cos(((performance.now() - start) / 2000) * Math.PI));
    }, 33);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  // The edges are the story's (controlled), so each new level reaches the wire.
  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "200px" }}>
        <ReactFlow
          defaultNodes={nodesOfOne}
          edges={[wire(0, { tone: "ok", emphasis: level, flow: true })]}
          nodeTypes={storyNodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 24, y: 24, zoom: 1 }}
        />
      </div>
    </ReactFlowProvider>
  );
}

/** A level that moves: the path is not rebuilt for it. */
export const Live: Story = {
  render: () => <LiveDemo />,
  play: async ({ canvasElement }) => {
    const path = await waitFor(() => {
      const found = canvasElement.querySelector(".pb-wire-path");
      if (found === null) throw new Error("no wire yet");
      return found;
    });
    const built = path.getAttribute("d");
    const group = canvasElement.querySelector<SVGGElement>(".pb-wire");
    const first = group?.style.getPropertyValue("--pb-wire-emphasis");
    await waitFor(() => expect(group?.style.getPropertyValue("--pb-wire-emphasis")).not.toBe(first));
    await expect(canvasElement.querySelector(".pb-wire-path")).toBe(path);
    await expect(path.getAttribute("d")).toBe(built);
  },
};

/** Selected: the accent, whatever its tone. Focus a wire with Tab and select it with Enter. */
export const Keyboard: Story = {
  args: { tone: "ok" },
  play: async ({ canvasElement, userEvent }) => {
    const edge = await waitFor(() => {
      const found = canvasElement.querySelector<SVGGElement>(".react-flow__edge");
      if (found === null) throw new Error("no wire yet");
      return found;
    });
    edge.focus();
    await expect(document.activeElement).toBe(edge);
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvasElement.querySelector(".pb-wire")).toHaveAttribute("data-selected"));
  },
};

const levels = [0, 0.25, 0.5, 0.75, 1];

/** Levels from silent to full: 1.5 px to 3.5 px, dim to bright. */
export const Levels: Story = {
  render: () => (
    <StoryCanvas
      height={240}
      nodes={pair(levels.length)}
      edges={levels.map((emphasis, index) => wire(index, { tone: "ok", emphasis, label: String(emphasis) }))}
      edgeTypes={edgeTypes}
    />
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-wire-path")).toHaveLength(levels.length));
    const widths = [...canvasElement.querySelectorAll(".pb-wire-path")].map(
      (path) => getComputedStyle(path).strokeWidth,
    );
    await expect(widths).toEqual(["1.5px", "2px", "2.5px", "3px", "3.5px"]);
  },
};

const looks: WireData[] = [
  {},
  { tone: "ok", emphasis: 0.8, flow: true },
  { tone: "warn" },
  { tone: "err" },
  { tone: "quiet" },
  { tone: "off" },
  { tone: "accent", arrow: true },
  { tone: "muted" },
  { tone: "added", dashed: true, label: "added" },
  { tone: "removed", dashed: true, label: "removed" },
  { tone: "renamed", dashed: true, label: "renamed" },
  { tone: "changed", dashed: true, label: "changed" },
  { tone: "refused", label: "refused" },
  { tone: "maybe" },
];

/** Every tone and look, one selected. */
export const All: Story = {
  render: () => (
    <StoryCanvas
      height={460}
      nodes={pair(looks.length)}
      edges={looks.map((data, index) => wire(index, data, index === 2))}
      edgeTypes={edgeTypes}
    />
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-wire")).toHaveLength(looks.length));
    await expect(canvasElement.querySelectorAll(".pb-wire[data-selected]")).toHaveLength(1);
  },
};

/** The same under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
