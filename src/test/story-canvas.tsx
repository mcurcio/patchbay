// The graph stories' canvas: React Flow's own <ReactFlow> inside a ReactFlowProvider, as an app renders it, with one
// node type, `box`, whose data is NodeBox's props: what an app's own node type does with its data.
import "@xyflow/react/dist/style.css";
import { type Edge, type Node, type NodeProps, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import type { ReactNode } from "react";
import { NodeBox, type NodeBoxProps } from "../graph";

/** A story's node: NodeBox's props as its data, `selected` coming from React Flow. */
export type BoxNode = Node<Omit<NodeBoxProps, "selected">, "box">;

function Box({ data, selected }: NodeProps<BoxNode>) {
  return <NodeBox {...data} selected={selected} />;
}

/** Defined outside render, as React Flow asks. */
export const storyNodeTypes = { box: Box };

/**
 * A canvas `height` px high showing the nodes at their own size (zoom 1), from the top left. React Flow holds the
 * nodes (uncontrolled), so they can be selected, dragged and deleted in the story.
 */
export function StoryCanvas({
  nodes,
  edges = [],
  height = 360,
  children,
}: {
  nodes: Node[];
  edges?: Edge[];
  height?: number;
  children?: ReactNode;
}) {
  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: `${height}px` }}>
        <ReactFlow
          defaultNodes={nodes}
          defaultEdges={edges}
          nodeTypes={storyNodeTypes}
          defaultViewport={{ x: 24, y: 24, zoom: 1 }}
        >
          {children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
