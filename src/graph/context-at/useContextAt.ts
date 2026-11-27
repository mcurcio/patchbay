// A context menu at a point on the canvas (docs/graph.md#usecontextat): a right-click, or a long-press on a touch
// screen, on a node or on empty canvas asks the app to open its palette there (docs/ux-rules.md#the-view-and-the-canvas,
// U66), with the point in flow and window coordinates and the node pressed. React Flow gives the right-click; touch has
// no contextmenu on every browser (iOS fires none), so the hook times a still press itself, and takes a contextmenu
// that comes during the press (Android's) as that same long-press, so each press asks once.
import { type Node, type NodeMouseHandler, useReactFlow } from "@xyflow/react";
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { FlowPoint } from "../add-at";

/** How long a touch is held still to count as a long-press, in ms. */
export const LONG_PRESS_MS = 500;
/** How far, in px, a held touch may move and still count: one that moves further is a pan or a drag. */
export const LONG_PRESS_SLOP = 10;

/** Where a context menu was asked for, and on what. */
export type ContextAt = {
  /** The point in flow coordinates, as `useAddAt` gives it. */
  point: FlowPoint;
  /** The same point in the window's coordinates, as `CommandPalette`'s `at` takes it. */
  at: { x: number; y: number };
  /** The node pressed, as React Flow holds it; absent on empty canvas. */
  node?: Node;
  /** How it was asked: a right-click, or a long-press on touch. */
  by: "contextmenu" | "long-press";
};

/** Called with where a context menu was asked for. */
export type OnContextAt = (context: ContextAt) => void;

/** The props `useContextAt` gives `<ReactFlow>`. */
export type ContextAtFlowProps = {
  onPaneContextMenu: (event: ReactMouseEvent | MouseEvent) => void;
  onNodeContextMenu: NodeMouseHandler;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export type ContextAtOptions = {
  /** false switches it off: a right-click is the browser's again, and a long-press nothing; true by default. */
  enabled?: boolean;
};

/** What a press began on: empty canvas, a node (by id), or anything else (a handle, an edge, a panel). */
function pressedOn(target: EventTarget | null): { node?: string } | null {
  if (!(target instanceof Element)) return null;
  if (target.classList.contains("react-flow__pane")) return {};
  if (target.closest(".react-flow__handle, .react-flow__panel, .react-flow__edge") !== null) return null;
  const node = target.closest<HTMLElement>(".react-flow__node");
  const id = node?.dataset.id;
  return id === undefined ? null : { node: id };
}

/** A touch held for a long-press: where it began, its timer, and whether it has asked yet. */
type Press = { id: number; x: number; y: number; on: { node?: string }; timer: number; asked: boolean };

/**
 * Calls `onContextAt` for a right-click and for a long-press on touch, on a node or on empty canvas; its `flowProps`
 * go to `<ReactFlow>` (through `mergeFlowProps` with others). The browser's own menu is prevented where it asks.
 */
export function useContextAt(
  onContextAt: OnContextAt,
  options: ContextAtOptions = {},
): { flowProps: ContextAtFlowProps } {
  const enabled = options.enabled ?? true;
  const { screenToFlowPosition, getNode } = useReactFlow();
  const latest = useRef({ onContextAt, enabled, screenToFlowPosition, getNode });
  useLayoutEffect(() => {
    latest.current = { onContextAt, enabled, screenToFlowPosition, getNode };
  });
  const press = useRef<Press | null>(null);
  // The click a lifted long-press makes, swallowed so it neither selects nor clears what the menu is for.
  const swallow = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      if (press.current !== null) window.clearTimeout(press.current.timer);
      swallow.current?.();
    },
    [],
  );

  const flowProps = useMemo<ContextAtFlowProps>(() => {
    const ask = (x: number, y: number, on: { node?: string }, by: ContextAt["by"]) => {
      const { onContextAt: call, screenToFlowPosition: toFlow, getNode: nodeOf } = latest.current;
      const node = on.node === undefined ? undefined : nodeOf(on.node);
      const context: ContextAt = { point: toFlow({ x, y }), at: { x, y }, by };
      call(node === undefined ? context : { ...context, node });
    };
    const end = () => {
      if (press.current !== null) window.clearTimeout(press.current.timer);
      press.current = null;
    };
    /** Swallows the next click, in the capture phase, until the next press begins. */
    const swallowClick = () => {
      swallow.current?.();
      const onClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        stop();
      };
      const stop = () => {
        window.removeEventListener("click", onClick, true);
        swallow.current = null;
      };
      window.addEventListener("click", onClick, true);
      swallow.current = stop;
    };
    /** A contextmenu: during a held touch it is that long-press (once); otherwise a right-click. */
    const onMenu = (event: ReactMouseEvent | MouseEvent, on: { node?: string }) => {
      if (!latest.current.enabled) return;
      event.preventDefault();
      const held = press.current;
      if (held !== null) {
        if (!held.asked) {
          held.asked = true;
          window.clearTimeout(held.timer);
          swallowClick();
          ask(held.x, held.y, held.on, "long-press");
        }
        return;
      }
      ask(event.clientX, event.clientY, on, "contextmenu");
    };
    return {
      onPaneContextMenu: (event) => {
        onMenu(event, {});
      },
      onNodeContextMenu: (event, node) => {
        onMenu(event, { node: node.id });
      },
      onPointerDown: (event) => {
        swallow.current?.();
        // A second finger is a pinch, not a long-press.
        if (press.current !== null) {
          end();
          return;
        }
        if (!latest.current.enabled || event.pointerType !== "touch" || !event.isPrimary) return;
        const on = pressedOn(event.target);
        if (on === null) return;
        const { pointerId: id, clientX: x, clientY: y } = event;
        const timer = window.setTimeout(() => {
          const held = press.current;
          if (held === null || held.id !== id || held.asked) return;
          held.asked = true;
          swallowClick();
          ask(held.x, held.y, held.on, "long-press");
        }, LONG_PRESS_MS);
        press.current = { id, x, y, on, timer, asked: false };
      },
      onPointerMove: (event) => {
        const held = press.current;
        if (held === null || held.id !== event.pointerId || held.asked) return;
        if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > LONG_PRESS_SLOP) end();
      },
      onPointerUp: (event) => {
        if (press.current?.id === event.pointerId) end();
      },
      onPointerCancel: (event) => {
        if (press.current?.id === event.pointerId) end();
      },
    };
  }, []);

  return { flowProps };
}
