// Adding at a place on the canvas (docs/graph.md#useaddat): a double-click on empty canvas, or a wire dropped there,
// asks the app to add a node at that point, in flow coordinates, with the port the wire came from. Only the pane
// counts: a double-click or a drop on a node, an edge, a handle or a panel is not empty canvas.
import { type OnConnectEnd, type OnConnectStart, useReactFlow } from "@xyflow/react";
import { type MouseEvent as ReactMouseEvent, useLayoutEffect, useMemo, useRef } from "react";
import type { PortRef } from "../connect-hints";
import type { PortSide } from "../port-row";

/** A point in flow coordinates. */
export type FlowPoint = { x: number; y: number };

/** Called with where to add, and the port a dropped wire came from (absent for a double-click). */
export type OnAddAt = (point: FlowPoint, from?: PortRef & { side: PortSide }) => void;

/**
 * The props `useAddAt` gives `<ReactFlow>`. `zoomOnDoubleClick` is false while adding is on, as the double-click is
 * the add, and absent while it is off, so React Flow's own zoom on double-click (or the app's choice) holds.
 */
export type AddAtFlowProps = {
  onDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  zoomOnDoubleClick?: false;
};

export type AddAtOptions = {
  /**
   * false switches adding off (as while the graph is read-only), and gives double-click back to React Flow's zoom;
   * true by default.
   */
  enabled?: boolean;
};

/** Whether the element is this canvas's empty pane, not anything drawn on it. */
const isPane = (target: EventTarget | null) =>
  target instanceof Element && target.classList.contains("react-flow__pane");

/** Where a mouse or touch event ended, in the window's coordinates; a touch's end is in `changedTouches`. */
function endOf(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ("changedTouches" in event) {
    const touch = event.changedTouches[0];
    return touch === undefined ? null : { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

/** The element at a point in the window, or null where the browser cannot say. */
const elementAt = ({ x, y }: { x: number; y: number }) =>
  typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;

/**
 * Calls `onAddAt` for a double-click on empty canvas and for a wire dropped there where no handle took it. Its
 * `flowProps` go to `<ReactFlow>` (through `mergeFlowProps` with others); while adding is on it turns React Flow's
 * zoom on double-click off, as the double-click is the add.
 */
export function useAddAt(onAddAt: OnAddAt, options: AddAtOptions = {}): { flowProps: AddAtFlowProps } {
  const enabled = options.enabled ?? true;
  const { screenToFlowPosition } = useReactFlow();
  const latest = useRef({ onAddAt, enabled, screenToFlowPosition });
  useLayoutEffect(() => {
    latest.current = { onAddAt, enabled, screenToFlowPosition };
  });
  // The handle the wire in progress began at; null outside a drag.
  const origin = useRef<(PortRef & { side: PortSide }) | null>(null);

  const handlers = useMemo<Omit<AddAtFlowProps, "zoomOnDoubleClick">>(
    () => ({
      onDoubleClick: (event) => {
        const { onAddAt: add, enabled: on, screenToFlowPosition: toFlow } = latest.current;
        if (!on || !isPane(event.target)) return;
        add(toFlow({ x: event.clientX, y: event.clientY }));
      },
      onConnectStart: (_event, { nodeId, handleId, handleType }) => {
        origin.current =
          nodeId === null ? null : { nodeId, handleId, side: handleType === "target" ? "input" : "output" };
      },
      onConnectEnd: (event, state) => {
        const from = origin.current;
        origin.current = null;
        const { onAddAt: add, enabled: on, screenToFlowPosition: toFlow } = latest.current;
        if (!on || from === null || state.toHandle !== null) return;
        const end = endOf(event);
        if (end === null) return;
        // A mouse's up is on the element under it; a touch's end is on the element it began on, so ask the page.
        const target = "changedTouches" in event ? elementAt(end) : event.target;
        if (!isPane(target)) return;
        add(toFlow(end), from);
      },
    }),
    [],
  );
  // Off, the key is left out rather than set true: an app that turned the zoom off itself keeps it off.
  const flowProps = useMemo<AddAtFlowProps>(
    () => (enabled ? { ...handlers, zoomOnDoubleClick: false } : handlers),
    [enabled, handlers],
  );

  return { flowProps };
}
