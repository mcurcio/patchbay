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
 * An app's canvas that follows its graph: the key is the node count, the fit tool is the hook's fit, the tools' view
 * moves (the zoom tools, the minimap) call its stop, and the canvas says the layout is ready once the first fit has
 * landed, as an app's browser tests can wait on.
 */
function Demo() {
  const [nodes, setNodes, onNodesChange] = useNodesState([node(0), node(1)]);
  const [ready, setReady] = useState(false);
  const [fits, setFits] = useState(0);
  const [minimap, setMinimap] = useState(false);
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
          <CanvasTools onFit={follow.fit} onViewMove={follow.stop} minimap={minimap} onMinimap={setMinimap} />
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

/**
 * Every view move the person asks for stops following, the tools' too (U63): a press of a zoom tool, and a drag on the
 * minimap. Each time, the fit tool follows again.
 */
export const ToolsStopFollowing: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-layout="ready"]')).not.toBeNull());
    const state = canvas.getByTestId("state");
    const fitTool = canvas.getByRole("button", { name: "Fit the view" });

    await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
    await expect(state).toHaveTextContent("not following");
    await userEvent.click(fitTool);
    await waitFor(() => expect(state).toHaveTextContent(/^following/));
    await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
    await expect(state).toHaveTextContent("not following");
    await userEvent.click(fitTool);
    await waitFor(() => expect(state).toHaveTextContent(/^following/));

    await userEvent.click(canvas.getByRole("button", { name: "Minimap" }));
    const svg = await waitFor(() => {
      const found = canvasElement.querySelector(".pb-canvas-minimap svg");
      if (found === null) throw new Error("no minimap");
      return found;
    });
    // React Flow's minimap pans by d3-zoom's mouse events, after the press's pointer event.
    const box = svg.getBoundingClientRect();
    const at = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, view: window, button: 0 };
    await fireEvent.pointerDown(svg, at);
    await fireEvent.mouseDown(svg, at);
    await fireEvent.mouseMove(window, { ...at, clientX: at.clientX + 20, clientY: at.clientY + 10 });
    await fireEvent.mouseMove(window, { ...at, clientX: at.clientX + 40, clientY: at.clientY + 20 });
    await fireEvent.pointerUp(window, at);
    await fireEvent.mouseUp(window, at);
    await waitFor(() => expect(state).toHaveTextContent("not following"));
    await userEvent.click(fitTool);
    await waitFor(() => expect(state).toHaveTextContent(/^following/));
  },
};

/** The same under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
