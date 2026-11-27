import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { type Node, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "../../primitives";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { GhostNode, type GhostNodeData, type GhostNodeNode, ghostNodeSize } from "./GhostNode";

/** Defined outside render, as React Flow asks: the app's own node type beside the ghost. */
const nodeTypes = { ...storyNodeTypes, ghost: GhostNode };

const source: BoxNode = {
  id: "src",
  type: "box",
  position: { x: 0, y: 0 },
  data: { title: "Tone 1", subtitle: "oscillator", outputs: [{ id: "left", label: "left" }] },
};

/** How an app adds a ghost: at the point asked, out of the selection, the Tab order, deleting, dragging and wiring. */
const ghostAt = (data: GhostNodeData): GhostNodeNode => ({
  id: "adding",
  type: "ghost",
  position: { x: 320, y: 20 },
  data,
  selectable: false,
  focusable: false,
  deletable: false,
  draggable: false,
  connectable: false,
});

const mixer: GhostNodeData = { title: "mixer 2", subtitle: "mixer", inputs: 2, outputs: 1, line: "Adding" };

/** A canvas with one node and a ghost for the add in flight. */
function Pending({ data }: { data: GhostNodeData }) {
  const nodes: Node[] = [source, ghostAt(data)];
  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "240px" }}>
        <ReactFlow nodes={nodes} nodeTypes={nodeTypes} defaultViewport={{ x: 24, y: 24, zoom: 1 }} />
      </div>
    </ReactFlowProvider>
  );
}

const meta = {
  title: "Graph/GhostNode",
  render: (args) => <Pending {...args} />,
  args: { data: mixer },
} satisfies Meta<typeof Pending>;

export default meta;
type Story = StoryObj<typeof meta>;

const ghostOf = (root: HTMLElement) => root.querySelector<HTMLElement>(".pb-ghost-node");

/**
 * An add on its way: dashed in the quiet tone and faint, in the room the node will take; not focusable, selectable or
 * under the pointer.
 */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await waitFor(() => expect(ghostOf(canvasElement)).not.toBeNull());
    const ghost = ghostOf(canvasElement);
    if (ghost === null) return;
    const rect = ghost.getBoundingClientRect();
    const size = ghostNodeSize(args.data);
    await expect([rect.width, rect.height]).toEqual([size.width, size.height]);
    const style = getComputedStyle(ghost);
    await expect(style.borderTopStyle).toBe("dashed");
    await expect(style.opacity).toBe("0.6");
    await expect(getComputedStyle(ghost.parentElement ?? ghost).pointerEvents).toBe("none");
    const under = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    await expect(under).toHaveClass("react-flow__pane");
    await expect(ghost.parentElement).not.toHaveAttribute("tabindex");
  },
};

/** Under the example harbor brand in dark. */
export const DefaultHarborDark: Story = { ...Default, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const DefaultEmberLight: Story = { ...Default, globals: { brand: "ember", theme: "light" } };

/** Only a header: a node with no ports or line yet. */
export const HeaderOnly: Story = { args: { data: { title: "mixer 2", subtitle: "mixer" } } };

/** A long name is cut, as a node's title is. */
export const LongTitle: Story = {
  args: { data: { title: "a mixer whose name runs on well past the box's width", subtitle: "mixer", line: "Adding" } },
};

/**
 * The asking and the answer: Add sends the request, the button busy and the ghost at the point; the source's answer
 * replaces the ghost with the node it holds.
 */
function AskDemo() {
  const [state, setState] = useState<"idle" | "pending" | "added">("idle");
  const nodes: Node[] = [source];
  if (state === "pending") nodes.push(ghostAt(mixer));
  if (state === "added")
    nodes.push({
      id: "mix-2",
      type: "box",
      position: { x: 320, y: 20 },
      data: {
        title: "mixer 2",
        subtitle: "mixer",
        line: "Silent: nothing drives it",
        inputs: [
          { id: "a", label: "a" },
          { id: "b", label: "b" },
        ],
        outputs: [{ id: "out", label: "out" }],
      },
    } satisfies BoxNode);
  return (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <div style={{ display: "flex", gap: "var(--pb-space-2)" }}>
        <Button
          tone="primary"
          busy={state === "pending"}
          busyLabel="Adding"
          disabled={state === "added"}
          onClick={() => {
            setState("pending");
          }}
        >
          Add the mixer
        </Button>
        <Button
          disabled={state !== "pending"}
          onClick={() => {
            setState("added");
          }}
        >
          The source answers
        </Button>
      </div>
      <ReactFlowProvider>
        <div style={{ width: "100%", height: "240px" }}>
          <ReactFlow nodes={nodes} nodeTypes={nodeTypes} defaultViewport={{ x: 24, y: 24, zoom: 1 }} />
        </div>
      </ReactFlowProvider>
    </div>
  );
}

export const Asking: Story = {
  render: () => <AskDemo />,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add the mixer" }));
    await waitFor(() => expect(ghostOf(canvasElement)).not.toBeNull());
    await expect(canvas.getByRole("button", { name: "Adding" })).toHaveAttribute("aria-busy", "true");
    await userEvent.click(canvas.getByRole("button", { name: "The source answers" }));
    await waitFor(() => expect(ghostOf(canvasElement)).toBeNull());
    await expect(canvas.getByRole("group", { name: "mixer 2" })).toBeInTheDocument();
  },
};
