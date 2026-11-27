// A ghost node (docs/graph.md#ghostnode): an add on its way, before the app's graph holds the node
// (docs/ux-rules.md#live-pending-queued-refused, U51, U52). A node type the app registers as `ghost` and places at the
// point the add was asked; it is drawn dashed in the quiet tone and faint, in the room the node will take (the one
// geometry formula, nodeBoxSize), and takes no pointer events. Its drawing is hidden from screen readers: the busy
// button that sent the request says it is on its way. The app removes it when the source answers.
import type { Node, NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";
import { type NodePorts, nodeBoxSize } from "../node-box";
import "./GhostNode.css";

/** A ghost node's look, as React Flow's node `data`: the words and the shape of the node being added. */
export type GhostNodeData = {
  /** The node's name, as it will be (`type 2`); one line, cut with an ellipsis. */
  title: ReactNode;
  /** The second header line in the muted colour (its type). */
  subtitle?: ReactNode;
  /** One row under the header ("Adding"); none by default. */
  line?: ReactNode;
  /** The input ports the node will have, so the ghost takes its room; none by default. */
  inputs?: number;
  /** The output ports the node will have; none by default. */
  outputs?: number;
  /** How its ports will be laid out; stacked by default. */
  ports?: NodePorts;
  /** Whether it will have a footer; no by default. */
  footer?: boolean;
  /** Its width in px; `NODE_WIDTH` by default. */
  width?: number;
};

/** A node drawn by `GhostNode`: register it as `nodeTypes={{ ghost: GhostNode }}`. */
export type GhostNodeNode = Node<GhostNodeData, "ghost">;

/** The ghost's size in px: `nodeBoxSize` of the node it stands for, its `line` counting as the node's line row. */
export function ghostNodeSize(data: GhostNodeData): { width: number; height: number } {
  return nodeBoxSize({
    inputs: data.inputs ?? 0,
    outputs: data.outputs ?? 0,
    ports: data.ports ?? "stacked",
    line: data.line !== undefined && data.line !== null,
    footer: data.footer ?? false,
    ...(data.width === undefined ? {} : { width: data.width }),
  });
}

/** Draws an add's node at its point while the request is on its way. */
export function GhostNode({ data }: NodeProps<GhostNodeNode>) {
  const { width, height } = ghostNodeSize(data);
  const line = data.line;
  return (
    <div className="pb-ghost-node" aria-hidden="true" style={{ width: `${width}px`, height: `${height}px` }}>
      <div className="pb-ghost-node-header">
        <div className="pb-ghost-node-title">{data.title}</div>
        {data.subtitle !== undefined && data.subtitle !== null && (
          <div className="pb-ghost-node-subtitle">{data.subtitle}</div>
        )}
      </div>
      {line !== undefined && line !== null && <div className="pb-ghost-node-line">{line}</div>}
    </div>
  );
}
