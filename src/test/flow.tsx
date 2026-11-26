// The unit project's React Flow canvas: jsdom has no layout, so React Flow's measuring gets what it reads (a
// ResizeObserver that reports at once, DOMMatrixReadOnly for the zoom, an element's offset size from its inline
// style), and `Flow` draws one node of a given component on a canvas, as an app's node type does.
import { type Node, type NodeProps, ReactFlow, ReactFlowProvider } from "@xyflow/react";
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
