// A ghost wire (docs/graph.md#ghostwire): a request on its way, before the app's graph holds the edge. An edge type the
// app registers as `ghost`; it draws with React Flow's BaseEdge but has no hit path and takes no pointer events, so it
// can be neither hovered nor clicked. How long a refused one stays is the app's: it removes the edge.
import { BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from "@xyflow/react";
import { type ReactNode, useMemo } from "react";
import "./GhostWire.css";

/** `pending` (the default) or `refused`; any other string is drawn as `pending`. */
export type GhostWireTone = "pending" | "refused" | (string & {});

/** A ghost wire's look, as React Flow's edge `data`. */
export type GhostWireData = {
  /** `pending` (dashed in the quiet tone, dimmed) or `refused` (the error tone). */
  tone?: GhostWireTone;
  /** At the midpoint, on the raised surface; it takes no pointer events. */
  label?: ReactNode;
};

/** An edge drawn by `GhostWire`: register it as `edgeTypes={{ ghost: GhostWire }}`. */
export type GhostWireEdge = Edge<GhostWireData, "ghost">;

/** Draws a request's wire between two handles while it is on its way. */
export function GhostWire({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<GhostWireEdge>) {
  const [path, labelX, labelY] = useMemo(
    () => getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition],
  );
  const tone = data?.tone === "refused" ? "refused" : "pending";
  const label = data?.label;
  return (
    <>
      <g className="pb-ghost-wire" data-tone={tone} aria-hidden="true">
        <BaseEdge id={id} path={path} className="pb-ghost-wire-path" interactionWidth={0} />
      </g>
      {label !== undefined && label !== null && (
        <EdgeLabelRenderer>
          <div
            className="pb-ghost-wire-label"
            data-tone={tone}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
