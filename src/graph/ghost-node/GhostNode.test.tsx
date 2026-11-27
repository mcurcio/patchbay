// GhostNode on a React Flow canvas: its words, hidden from screen readers; its size from nodeBoxSize of the node it
// stands for; the app's flags leaving it out of the Tab order and the selection; and the stylesheet's rules (dashed in
// the quiet tone, faint, no pointer events even on React Flow's wrapper, forced colours).
import { render } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { beforeAll, describe, expect, it } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { NODE_HEADER, NODE_LINE, NODE_PAD, NODE_ROW, NODE_WIDTH, nodeBoxSize } from "../node-box";
import { GhostNode, type GhostNodeData, type GhostNodeNode, ghostNodeSize } from "./GhostNode";
import css from "./GhostNode.css?raw";

beforeAll(installFlowMeasuring);

const nodeTypes = { ghost: GhostNode };

const draw = (data: GhostNodeData) => {
  const node: GhostNodeNode = {
    id: "g",
    type: "ghost",
    position: { x: 40, y: 40 },
    data,
    selectable: false,
    focusable: false,
    deletable: false,
    draggable: false,
    connectable: false,
  };
  return render(
    <ReactFlowProvider>
      <div style={{ width: "800px", height: "600px" }}>
        <ReactFlow nodes={[node]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
};

describe("GhostNode", () => {
  it("draws the node's words, hidden from screen readers, and no handles", () => {
    const { container } = draw({ title: "mixer 2", subtitle: "mixer", line: "Adding" });
    const ghost = container.querySelector(".pb-ghost-node");
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost?.querySelector(".pb-ghost-node-title")).toHaveTextContent("mixer 2");
    expect(ghost?.querySelector(".pb-ghost-node-subtitle")).toHaveTextContent("mixer");
    expect(ghost?.querySelector(".pb-ghost-node-line")).toHaveTextContent("Adding");
    expect(container.querySelector(".react-flow__handle")).toBeNull();
    const wrapper = ghost?.parentElement;
    expect(wrapper).toHaveClass("react-flow__node");
    expect(wrapper).not.toHaveAttribute("tabindex");
    expect(wrapper).not.toHaveClass("selectable");
  });

  it("takes the room of the node it stands for", () => {
    const { container } = draw({ title: "mixer 2", inputs: 2, outputs: 1, width: 300 });
    const ghost = container.querySelector<HTMLElement>(".pb-ghost-node");
    expect(ghost?.style.width).toBe("300px");
    expect(ghost?.style.height).toBe(`${String(NODE_HEADER + 2 * NODE_PAD + 3 * NODE_ROW)}px`);
    expect(container.querySelector(".pb-ghost-node-line")).toBeNull();
  });

  it("sizes by the one formula, its line counting as the node's", () => {
    expect(ghostNodeSize({ title: "a" })).toEqual({ width: NODE_WIDTH, height: NODE_HEADER });
    expect(
      ghostNodeSize({ title: "a", line: "Adding", inputs: 1, outputs: 2, ports: "side-by-side", footer: true }),
    ).toEqual(nodeBoxSize({ inputs: 1, outputs: 2, ports: "side-by-side", line: true, footer: true }));
    expect(ghostNodeSize({ title: "a", line: "Adding" }).height).toBe(NODE_HEADER + NODE_LINE);
  });
});

describe("GhostNode's stylesheet", () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("is dashed in the quiet tone, faint, and never under the pointer", () => {
    expect(plain).toMatch(
      /\.pb-ghost-node \{[^}]*border: 1px dashed var\(--pb-quiet\);[^}]*opacity: 0\.6;[^}]*pointer-events: none;/,
    );
    expect(plain).toMatch(/\.react-flow__node:has\(> \.pb-ghost-node\) \{\s*pointer-events: none !important;/);
  });

  it("keeps its dashes under forced colours", () => {
    expect(plain).toMatch(/@media \(forced-colors: active\)[^@]*GrayText/);
  });
});
