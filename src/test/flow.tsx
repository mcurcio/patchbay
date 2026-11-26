// The unit project's React Flow canvas: jsdom has no layout, so React Flow's measuring gets what it reads (a
// ResizeObserver that reports at once, DOMMatrixReadOnly for the zoom, an element's offset size from its inline
// style), `Flow` draws one node of a given component on a canvas, as an app's node type does, and `EdgeFlow` draws
// edges of given types between two plain nodes, `a` (output `out`) and `b` (input `in`).
import {
  type Edge,
  type EdgeTypes,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { ComponentType, ReactNode } from "react";

class ImmediateResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
}

class ScaleMatrix {
  m22: number;
  constructor(transform?: string) {
    const scale = /scale\(([\d.]+)\)/.exec(transform ?? "")?.[1];
    this.m22 = scale === undefined ? 1 : Number(scale);
  }
}

/** Gives jsdom what React Flow measures with; call once per test file, before rendering. */
export function installFlowMeasuring() {
  globalThis.ResizeObserver = ImmediateResizeObserver;
  globalThis.DOMMatrixReadOnly = ScaleMatrix as unknown as typeof DOMMatrixReadOnly;
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: {
      configurable: true,
      get(this: HTMLElement) {
        return Number.parseFloat(this.style.height) || 1;
      },
    },
    offsetWidth: {
      configurable: true,
      get(this: HTMLElement) {
        return Number.parseFloat(this.style.width) || 1;
      },
    },
  });
}

type BoxNode = Node<{ render: () => ReactNode }, "box">;

function Box({ data }: NodeProps<BoxNode>) {
  return <>{data.render()}</>;
}

const nodeTypes: Record<string, ComponentType<NodeProps<BoxNode>>> = { box: Box };

/** One React Flow node with the given id drawing `children`, on a canvas inside its own provider. */
export function Flow({ id = "n1", children }: { id?: string; children: ReactNode }) {
  const nodes: BoxNode[] = [{ id, type: "box", position: { x: 0, y: 0 }, data: { render: () => children } }];
  return (
    <ReactFlowProvider>
      <div style={{ width: "800px", height: "600px" }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>
  );
}

type EndNode = Node<Record<string, never>, "end">;

function End() {
  return (
    <div style={{ width: "100px", height: "40px" }}>
      <Handle type="target" id="in" position={Position.Left} />
      <Handle type="source" id="out" position={Position.Right} />
    </div>
  );
}

const endTypes = { end: End };

/** Kept across renders, as an app keeps its nodes while only an edge's data changes. */
const endNodes: EndNode[] = [
  { id: "a", type: "end", position: { x: 0, y: 0 }, data: {}, width: 100, height: 40 },
  { id: "b", type: "end", position: { x: 300, y: 0 }, data: {}, width: 100, height: 40 },
];

/** Two nodes, `a` and `b` 300 px apart, joined by `edges` drawn with `edgeTypes`. */
export function EdgeFlow({ edges, edgeTypes }: { edges: Edge[]; edgeTypes: EdgeTypes }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: "800px", height: "600px" }}>
        <ReactFlow nodes={endNodes} edges={edges} nodeTypes={endTypes} edgeTypes={edgeTypes} />
      </div>
    </ReactFlowProvider>
  );
}
