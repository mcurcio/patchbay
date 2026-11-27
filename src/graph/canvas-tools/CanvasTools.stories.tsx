import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { Glyph, IconButton } from "../../primitives";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { CanvasTools, type CanvasToolsProps } from "./CanvasTools";

const nodes: BoxNode[] = [
  {
    id: "src",
    type: "box",
    position: { x: 0, y: 0 },
    data: { title: "Tone 1", subtitle: "oscillator", outputs: [{ id: "left", label: "left" }] },
  },
  {
    id: "mix",
    type: "box",
    position: { x: 320, y: 40 },
    data: { title: "mix-2", subtitle: "mixer", change: "added", inputs: [{ id: "in", label: "in" }] },
  },
];

/** The minimap draws each node in its change's colour, by the class the app gives it. */
const minimapClass = (node: BoxNode) => `story-minimap-${node.data.change ?? "kept"}`;

/** An app's canvas: its own <ReactFlow>, with the tools as a child and the minimap's state held here. */
function Demo(props: Omit<CanvasToolsProps<BoxNode>, "minimap" | "onMinimap"> & { onMinimap?: (on: boolean) => void }) {
  const [minimap, setMinimap] = useState(false);
  const { onMinimap, ...rest } = props;
  return (
    <ReactFlowProvider>
      <style>{`.story-minimap-added { fill: var(--pb-added); }`}</style>
      <div style={{ width: "100%", height: "320px" }}>
        <ReactFlow defaultNodes={nodes} nodeTypes={storyNodeTypes} defaultViewport={{ x: 24, y: 24, zoom: 1 }}>
          <CanvasTools<BoxNode>
            {...rest}
            minimap={minimap}
            onMinimap={(on) => {
              setMinimap(on);
              onMinimap?.(on);
            }}
            minimapNodeClassName={minimapClass}
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

const meta = {
  title: "Graph/CanvasTools",
  args: { onTidy: fn(), onMinimap: fn(), keyShortcuts: { fit: "F", tidy: "L", minimap: "M" } },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const viewport = (root: HTMLElement) => root.querySelector<HTMLElement>(".react-flow__viewport")?.style.transform;

/**
 * Every tool: one tab stop with the arrows between them, the app's bindings in the tooltips, zoom moving the view,
 * tidy asking the app, and the minimap tool pressed while React Flow's minimap is drawn, its node coloured by the app.
 */
export const All: Story = {
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    // The nodes come first in the tab order; the group is one stop after them, its first tool holding it.
    const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
    await expect(zoomIn).toHaveAttribute("tabindex", "0");
    zoomIn.focus();
    await userEvent.keyboard("{End}");
    const minimap = canvas.getByRole("button", { name: "Minimap" });
    await expect(minimap).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Fit the view" })).toHaveAttribute("title", "Fit the view (F)");

    const before = viewport(canvasElement);
    await userEvent.click(zoomIn);
    await waitFor(() => expect(viewport(canvasElement)).not.toBe(before));

    await userEvent.click(canvas.getByRole("button", { name: "Tidy the layout" }));
    await expect(args.onTidy).toHaveBeenCalledOnce();

    await userEvent.click(minimap);
    await expect(minimap).toHaveAttribute("aria-pressed", "true");
    await expect(args.onMinimap).toHaveBeenCalledWith(true);
    await waitFor(() => expect(canvasElement.querySelector(".story-minimap-added")).not.toBeNull());
  },
};

/** The same under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };

/** Only what every canvas has: zoom and fit, with the app's words, and one more tool of the app's after them. */
export const Plain: Story = {
  args: { onTidy: undefined, keyShortcuts: undefined, labels: { toolbar: "View", fit: "Show everything" } },
  render: (args) => (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "240px" }}>
        <ReactFlow defaultNodes={nodes} nodeTypes={storyNodeTypes} defaultViewport={{ x: 24, y: 24, zoom: 1 }}>
          <CanvasTools position="top-right" labels={args.labels}>
            <IconButton label="Lock the view">
              <Glyph>
                <path d="M4 7h8v6H4zM6 7V5a2 2 0 0 1 4 0v2" />
              </Glyph>
            </IconButton>
          </CanvasTools>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole("toolbar", { name: "View" });
    await expect(group.querySelectorAll("button")).toHaveLength(4);
    await expect(canvas.getByRole("button", { name: "Show everything" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Minimap" })).toBeNull();
  },
};
