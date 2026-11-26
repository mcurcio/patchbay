import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { ReactFlow, ReactFlowProvider, useNodesState } from "@xyflow/react";
import { useState } from "react";
import { expect, fireEvent, waitFor } from "storybook/test";
import { Button } from "../../primitives";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { CanvasTools } from "../canvas-tools";
import { useFollowFit } from "./useFollowFit";

const node = (index: number): BoxNode => ({
  id: `n${String(index)}`,
  type: "box",
  position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 160 },
  data: { title: `Tone ${String(index + 1)}`, subtitle: "oscillator", outputs: [{ id: "out", label: "out" }] },
});

/**
 * An app's canvas that follows its graph: the key is the node count, the fit tool is the hook's fit, and the canvas
 * says the layout is ready once the first fit has landed, as an app's browser tests can wait on.
 */
function Demo() {
  const [nodes, setNodes, onNodesChange] = useNodesState([node(0), node(1)]);
  const [ready, setReady] = useState(false);
  const [fits, setFits] = useState(0);
  const follow = useFollowFit<BoxNode>({
    key: nodes.length,
    fitOptions: { padding: 0.2, maxZoom: 1 },
    onFitted: () => {
      setReady(true);
      setFits((count) => count + 1);
    },
  });
  return (
    <div>
      <p>
        <Button
          onClick={() => {
            setNodes((current) => [...current, node(current.length)]);
          }}
        >
          Add a node
        </Button>{" "}
        <output data-testid="state">
          {follow.following ? "following" : "not following"}, {String(fits)} fits
        </output>
      </p>
      <div style={{ width: "100%", height: "300px" }} data-layout={ready ? "ready" : "pending"}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={storyNodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          {...follow.flowProps}
        >
          <CanvasTools onFit={follow.fit} />
        </ReactFlow>
      </div>
    </div>
  );
}

const meta = {
  title: "Graph/useFollowFit",
  render: () => (
    <ReactFlowProvider>
      <Demo />
    </ReactFlowProvider>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every node's box lies inside the canvas. */
const allInView = (root: HTMLElement) => {
  const canvas = root.querySelector(".react-flow")?.getBoundingClientRect();
  const boxes = [...root.querySelectorAll(".react-flow__node")].map((each) => each.getBoundingClientRect());
  if (canvas === undefined || boxes.length === 0) return false;
  return boxes.every(
    (box) =>
      box.left >= canvas.left - 1 &&
      box.right <= canvas.right + 1 &&
      box.top >= canvas.top - 1 &&
      box.bottom <= canvas.bottom + 1,
  );
};

/**
 * Following from the start: the layout is ready after the first fit, and each node added is brought into view. The
 * person's own zoom stops following, so the next node is not; the fit tool fits and follows again.
 */
export const All: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-layout="ready"]')).not.toBeNull());
    const state = canvas.getByTestId("state");
    await expect(state).toHaveTextContent("following, 1 fits");

    const add = canvas.getByRole("button", { name: "Add a node" });
    await userEvent.click(add);
    await userEvent.click(add);
    await userEvent.click(add);
    await userEvent.click(add);
    await waitFor(() => expect(canvasElement.querySelectorAll(".react-flow__node")).toHaveLength(6));
    await waitFor(() => expect(allInView(canvasElement)).toBe(true));

    const pane = canvasElement.querySelector(".react-flow__pane");
    if (pane === null) throw new Error("no pane");
    await fireEvent.wheel(pane, { deltaY: -400, clientX: 200, clientY: 200 });
    await waitFor(() => expect(state).toHaveTextContent("not following"));
    // A fit begun before the zoom may still land; count from once it has.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const fits = state.textContent;
    await userEvent.click(add);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(state.textContent).toBe(fits);

    await userEvent.click(canvas.getByRole("button", { name: "Fit the view" }));
    await waitFor(() => expect(state).toHaveTextContent(/^following/));
    await waitFor(() => expect(allInView(canvasElement)).toBe(true));
  },
};

/** The same under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
