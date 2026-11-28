// The empty canvas's slot (docs/graph.md#emptycanvas): the app's own empty state, its words and its controls, drawn
// on the canvas in React Flow's <Panel> while the graph has no nodes and gone with the first (docs/ux-rules.md#states,
// U35). Without children it draws EmptyCanvasHint's default instead. Unlike the hint it takes pointer events, since
// what the app puts there may be pressed.
import { Panel, type PanelPosition, type ReactFlowState, useStore } from "@xyflow/react";
import type { ReactNode } from "react";
import { EmptyCanvasHint } from "../empty-canvas-hint";
import "./EmptyCanvas.css";

export type EmptyCanvasProps = {
  /** The app's own empty state; without it, EmptyCanvasHint's default ("This graph has no nodes yet."). */
  children?: ReactNode;
  /** Whether the graph is empty; without it, while React Flow holds no nodes. An app drawing a ghost node passes it. */
  empty?: boolean;
  /** Where it sits on the canvas, React Flow's `PanelPosition`: "top-center" by default. */
  position?: PanelPosition | (string & {});
  /** Added to the panel's own `pb-empty-canvas-slot` class (or, without children, the hint's). */
  className?: string;
};

const noNodes = (state: ReactFlowState): boolean => state.nodes.length === 0;

/** Draws the app's empty state on the canvas while the graph has no nodes; nothing once it has one. */
export function EmptyCanvas({ children, empty, position = "top-center", className }: EmptyCanvasProps) {
  const none = useStore(noNodes);
  if (children === undefined) return <EmptyCanvasHint empty={empty} position={position} className={className} />;
  if (!(empty ?? none)) return null;
  return (
    <Panel
      position={position as PanelPosition}
      className={className === undefined ? "pb-empty-canvas-slot" : `pb-empty-canvas-slot ${className}`}
    >
      {children}
    </Panel>
  );
}
