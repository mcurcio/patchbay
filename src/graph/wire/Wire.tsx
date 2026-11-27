// A wire (docs/graph.md#wire): an edge type an app registers in edgeTypes, its look from the edge's data. The visible
// path is React Flow's BaseEdge, so its react-flow__edge-path class and selection stay; the hit path keeps
// react-flow__edge-interaction and carries the tooltip. The path is rebuilt only when an end moves: the level arrives
// as --pb-wire-emphasis on the wire's group, so a change of level restyles it without touching the path.
import { BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, getBezierPath, Position } from "@xyflow/react";
import { type CSSProperties, memo, type ReactNode, useMemo } from "react";
import type { PillTone } from "../../primitives";
import "./Wire.css";

/** Pill's tones, the changes and `refused`; any other string is drawn in the edge stroke. */
export type WireTone = PillTone | "added" | "removed" | "renamed" | "changed" | "refused" | (string & {});

/** A wire's look, as React Flow's edge `data`. */
export type WireData = {
  /** The stroke's tone; none, or one it does not know, is React Flow's edge stroke. */
  tone?: WireTone;
  /** The signal's level, 0 to 1 (clamped; not a number is 0): thickness and brightness. None is the plain wire. */
  emphasis?: number;
  /** Dashes: with a change tone, an edit queued until a save. */
  dashed?: boolean;
  /** Dots moving along the wire toward the input; not drawn under reduced motion. */
  flow?: boolean;
  /** An arrowhead at the input end, facing the handle's side. */
  arrow?: boolean;
  /** At the midpoint, on the raised surface; it takes no pointer events. */
  label?: ReactNode;
  /** The wire's tooltip, on its hit path. */
  title?: string;
};

/** An edge drawn by `Wire`: register it as `edgeTypes={{ wire: Wire }}`. */
export type WireEdge = Edge<WireData, "wire">;

/** The arrowhead's length along the wire and half its width, in px. */
const ARROW_LENGTH = 8;
const ARROW_HALF = 4;

/** A level as the wire draws it: 0 to 1, anything not a number 0. */
function emphasisOf(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** A triangle with its tip on the handle, pointing into the node from the side the handle is on. */
function arrowPath(x: number, y: number, side: Position): string {
  // The way back from the tip, away from the node.
  const dx = side === Position.Left ? -1 : side === Position.Right ? 1 : 0;
  const dy = side === Position.Top ? -1 : side === Position.Bottom ? 1 : 0;
  const baseX = x + dx * ARROW_LENGTH;
  const baseY = y + dy * ARROW_LENGTH;
  // Perpendicular to the direction, for the base's two corners.
  const px = -dy * ARROW_HALF;
  const py = dx * ARROW_HALF;
  return `M ${x} ${y} L ${baseX + px} ${baseY + py} L ${baseX - px} ${baseY - py} Z`;
}

type WireBodyProps = {
  id: string;
  path: string;
  flow: boolean;
  arrow: string | undefined;
  title: string | undefined;
  interactionWidth: number;
  markerStart: string | undefined;
  markerEnd: string | undefined;
  style: CSSProperties | undefined;
};

/** The paths, which change only when an end, the flow, the arrow or the tooltip does. */
const WireBody = memo(function WireBody({
  id,
  path,
  flow,
  arrow,
  title,
  interactionWidth,
  markerStart,
  markerEnd,
  style,
}: WireBodyProps) {
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className="pb-wire-path"
        interactionWidth={0}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
      />
      {flow && <path d={path} fill="none" className="pb-wire-flow" aria-hidden="true" />}
      {arrow !== undefined && <path d={arrow} className="pb-wire-arrow" aria-hidden="true" />}
      {interactionWidth > 0 && (
        <path
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={interactionWidth}
          className="react-flow__edge-interaction"
        >
          {title !== undefined && <title>{title}</title>}
        </path>
      )}
    </>
  );
});

/** Draws a wire between two handles: its tone, level, dashes, flow, arrow, label and tooltip from the edge's data. */
export function Wire({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  interactionWidth = 20,
  markerStart,
  markerEnd,
  style,
}: EdgeProps<WireEdge>) {
  const [path, labelX, labelY] = useMemo(
    () => getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition],
  );
  const showArrow = data?.arrow === true;
  const arrow = useMemo(
    () => (showArrow ? arrowPath(targetX, targetY, targetPosition) : undefined),
    [showArrow, targetX, targetY, targetPosition],
  );
  const emphasis = data?.emphasis === undefined ? undefined : emphasisOf(data.emphasis);
  const level = emphasis === undefined ? undefined : ({ "--pb-wire-emphasis": emphasis } as CSSProperties);
  const label = data?.label;
  return (
    <>
      <g
        className="pb-wire"
        data-tone={data?.tone}
        data-selected={selected === true ? "" : undefined}
        data-dashed={data?.dashed === true ? "" : undefined}
        data-emphasis={emphasis === undefined ? undefined : ""}
        style={level}
      >
        <WireBody
          id={id}
          path={path}
          flow={data?.flow === true}
          arrow={arrow}
          title={data?.title}
          interactionWidth={interactionWidth}
          markerStart={markerStart}
          markerEnd={markerEnd}
          style={style}
        />
      </g>
      {label !== undefined && label !== null && (
        <EdgeLabelRenderer>
          <div
            className="pb-wire-label"
            data-tone={data?.tone}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
