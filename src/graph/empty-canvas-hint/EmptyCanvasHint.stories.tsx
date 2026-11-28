import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { ReactFlow, ReactFlowProvider, useNodesState } from "@xyflow/react";
import { useRef } from "react";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { type OnAddAt, useAddAt } from "../add-at";
import { EmptyCanvasHint, type EmptyCanvasHintProps } from "./EmptyCanvasHint";

const none: BoxNode[] = [];

/** An app's empty canvas: the hint says how to add, and a double-click (on the hint too) adds a node, taking it away. */
function Demo({ add = true, ...hint }: EmptyCanvasHintProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(none);
  const count = useRef(0);
  const onAddAt: OnAddAt = (point) => {
    count.current += 1;
    const id = `mix-${String(count.current)}`;
    setNodes((current) => [
      ...current,
      { id, type: "box", position: point, data: { title: id, subtitle: "mixer", inputs: [{ id: "in", label: "in" }] } },
    ]);
  };
  const { flowProps } = useAddAt(onAddAt, { enabled: add });
  return (
    <div style={{ width: "100%", height: "320px" }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={storyNodeTypes}
        defaultViewport={{ x: 24, y: 24, zoom: 1 }}
        {...flowProps}
      >
        <EmptyCanvasHint add={add} {...hint} />
      </ReactFlow>
    </div>
  );
}

const meta = {
  title: "Graph/EmptyCanvasHint",
  component: EmptyCanvasHint,
  args: { keys: "A", children: <p>This graph has no nodes yet.</p> },
  argTypes: { children: { control: false } },
  render: (args) => (
    <ReactFlowProvider>
      <Demo {...args} />
    </ReactFlowProvider>
  ),
} satisfies Meta<typeof EmptyCanvasHint>;

export default meta;
type Story = StoryObj<typeof meta>;

const hintOf = (root: HTMLElement) => root.querySelector<HTMLElement>(".pb-empty-canvas");

/** The app's words and the gestures on the empty canvas; a double-click on the hint reaches the canvas and adds. */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("This graph has no nodes yet.")).toBeVisible();
    await expect(canvas.getByText("Double-click to add a node, or press A")).toBeVisible();
    const hint = hintOf(canvasElement);
    const rect = hint?.getBoundingClientRect() ?? new DOMRect();
    const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    const under = document.elementFromPoint(point.clientX, point.clientY);
    await expect(under).toHaveClass("react-flow__pane");
    if (under !== null) await fireEvent.doubleClick(under, point);
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(1));
    await expect(hintOf(canvasElement)).toBeNull();
  },
};

/** Under the example harbor brand in dark. */
export const EmptyHarborDark: Story = { ...Empty, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const EmptyEmberLight: Story = { ...Empty, globals: { brand: "ember", theme: "light" } };

/** Its own words alone: with no key or command of the app's, no gesture is said, as one would name a pointer alone. */
export const NoKey: Story = {
  args: { keys: undefined, children: undefined },
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.getByText("This graph has no nodes yet.")).toBeVisible();
    await expect(hintOf(canvasElement)).not.toHaveTextContent("Double-click");
  },
};

/** With the app's add command and no key: the gestures, then the command by name. */
export const Command: Story = {
  args: { keys: undefined, command: "Add node", children: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("This graph has no nodes yet.")).toBeVisible();
    await expect(canvas.getByText("Double-click to add a node, or use “Add node”")).toBeVisible();
  },
};

/** Adding switched off, as on a read-only graph: the app's words, and no gesture that would not add. */
export const ReadOnly: Story = {
  args: { add: false, children: <p>This graph is read-only: its file is open elsewhere.</p> },
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.getByText("This graph is read-only: its file is open elsewhere.")).toBeVisible();
    await expect(hintOf(canvasElement)).not.toHaveTextContent("add a node");
  },
};

/** Its words through labels. */
export const Labels: Story = {
  args: {
    children: undefined,
    labels: {
      noNodes: "Dieser Graph hat noch keine Knoten.",
      add: (gesture, keys) =>
        `${gesture === "touch" ? "Doppeltippen" : "Doppelklicken"}${keys === undefined ? "" : ` oder ${keys}`}`,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Dieser Graph hat noch keine Knoten.")).toBeVisible();
    await expect(canvas.getByText("Doppelklicken oder A")).toBeVisible();
  },
};
