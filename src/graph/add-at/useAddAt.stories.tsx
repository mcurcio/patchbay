import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { type Edge, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState } from "@xyflow/react";
import { useRef } from "react";
import { expect, fireEvent, waitFor } from "storybook/test";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { type OnAddAt, useAddAt } from "./useAddAt";

const start: BoxNode[] = [
  {
    id: "src",
    type: "box",
    position: { x: 0, y: 0 },
    data: { title: "Tone 1", subtitle: "oscillator", outputs: [{ id: "left", label: "left" }] },
  },
];
const noEdges: Edge[] = [];

/**
 * An app's canvas: a double-click on empty canvas adds a node there, and a wire dropped on empty canvas adds a node
 * there joined to the port it came from. What to add is the app's; here a mixer with one input.
 */
function Demo({ enabled = true }: { enabled?: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(start);
  const [edges, setEdges, onEdgesChange] = useEdgesState(noEdges);
  const count = useRef(0);
  const onAddAt: OnAddAt = (point, from) => {
    count.current += 1;
    const id = `mix-${String(count.current)}`;
    setNodes((current) => [
      ...current,
      {
        id,
        type: "box",
        position: point,
        data: { title: id, subtitle: "mixer", change: "added", inputs: [{ id: "in", label: "in" }] },
      },
    ]);
    if (from?.side === "output") {
      setEdges((current) => [
        ...current,
        {
          id: `${from.nodeId}-${id}`,
          source: from.nodeId,
          sourceHandle: from.handleId,
          target: id,
          targetHandle: "in",
        },
      ]);
    }
  };
  const { flowProps } = useAddAt(onAddAt, { enabled });
  return (
    <div style={{ width: "100%", height: "320px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={storyNodeTypes}
        defaultViewport={{ x: 24, y: 24, zoom: 1 }}
        {...flowProps}
      />
    </div>
  );
}

/** The hook reads React Flow's store, so the provider is outside the component that calls it. */
function Canvas(props: { enabled?: boolean }) {
  return (
    <ReactFlowProvider>
      <Demo {...props} />
    </ReactFlowProvider>
  );
}

const meta = {
  title: "Graph/useAddAt",
  render: (args) => <Canvas {...args} />,
} satisfies Meta<typeof Canvas>;

export default meta;
type Story = StoryObj<typeof meta>;

const pane = (root: HTMLElement) => {
  const found = root.querySelector<HTMLElement>(".react-flow__pane");
  if (found === null) throw new Error("no pane");
  return found;
};

const at = (element: Element, dx: number, dy: number) => {
  const rect = element.getBoundingClientRect();
  return { clientX: rect.left + dx, clientY: rect.top + dy };
};

/** A double-click on empty canvas adds a node; a wire dropped on empty canvas adds one joined to it. */
export const All: Story = {
  play: async ({ canvasElement }) => {
    const handle = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>('[data-nodeid="src"][data-handleid="left"]');
      if (found === null) throw new Error("no handle yet");
      return found;
    });
    await fireEvent.doubleClick(pane(canvasElement), at(pane(canvasElement), 400, 60));
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(2));

    const from = at(handle, 3, 3);
    const to = at(pane(canvasElement), 300, 240);
    await fireEvent.mouseDown(handle, { ...from, button: 0 });
    await fireEvent.mouseMove(document, to);
    await fireEvent.mouseUp(pane(canvasElement), to);
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(3));
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__edge")).toHaveLength(1));
  },
};

/** The same under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };

/** Switched off, as while the graph is read-only: a double-click adds nothing, and does not zoom. */
export const Off: Story = {
  args: { enabled: false },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(1));
    const transform = canvasElement.querySelector<HTMLElement>(".react-flow__viewport")?.style.transform;
    await fireEvent.doubleClick(pane(canvasElement), at(pane(canvasElement), 400, 60));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(1);
    await expect(canvasElement.querySelector<HTMLElement>(".react-flow__viewport")?.style.transform).toBe(transform);
  },
};
