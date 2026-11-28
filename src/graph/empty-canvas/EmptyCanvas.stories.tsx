import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { ReactFlow, ReactFlowProvider, useNodesState } from "@xyflow/react";
import { useRef } from "react";
import { expect, waitFor, within } from "storybook/test";
import { Button } from "../../primitives";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { EmptyCanvas, type EmptyCanvasProps } from "./EmptyCanvas";

const none: BoxNode[] = [];

/** An app's empty canvas with its own empty state: words and a button that adds the first node, taking it away. */
function Demo({ slot = true, ...props }: EmptyCanvasProps & { slot?: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(none);
  const count = useRef(0);
  const add = () => {
    count.current += 1;
    const id = `mix-${String(count.current)}`;
    setNodes((current) => [
      ...current,
      {
        id,
        type: "box",
        position: { x: 40, y: 40 },
        data: { title: id, subtitle: "mixer", inputs: [{ id: "in", label: "in" }] },
      },
    ]);
  };
  return (
    <div style={{ width: "100%", height: "320px" }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={storyNodeTypes}
        defaultViewport={{ x: 24, y: 24, zoom: 1 }}
      >
        {slot ? (
          <EmptyCanvas {...props}>
            <div style={{ display: "grid", gap: "8px", justifyItems: "center", textAlign: "center" }}>
              <p style={{ margin: 0 }}>This graph has no nodes yet.</p>
              <Button tone="primary" onClick={add}>
                Add a mixer
              </Button>
            </div>
          </EmptyCanvas>
        ) : (
          <EmptyCanvas {...props} />
        )}
      </ReactFlow>
    </div>
  );
}

const meta = {
  title: "Graph/EmptyCanvas",
  component: EmptyCanvas,
  argTypes: { children: { control: false } },
  render: (args) => (
    <ReactFlowProvider>
      <Demo {...args} />
    </ReactFlowProvider>
  ),
} satisfies Meta<typeof EmptyCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The app's own empty state on the canvas; its button adds the first node, and the slot goes with it. */
export const Slot: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("This graph has no nodes yet.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Add a mixer" }));
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(1));
    await expect(canvasElement.querySelector(".pb-empty-canvas-slot")).toBeNull();
  },
};

/** Under the example harbor brand in dark. */
export const SlotHarborDark: Story = { ...Slot, globals: { brand: "harbor", theme: "dark" } };

/** Without children: EmptyCanvasHint's default, its first sentence alone. */
export const Default: Story = {
  render: (args) => (
    <ReactFlowProvider>
      <Demo {...args} slot={false} />
    </ReactFlowProvider>
  ),
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.getByText("This graph has no nodes yet.")).toBeVisible();
    await expect(canvasElement.querySelector(".pb-empty-canvas")).not.toHaveTextContent("Double-click");
  },
};
