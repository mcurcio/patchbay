// A resize handle, as a WAI-ARIA separator: the edge of a pane, dragged with the pointer or moved by the arrow keys,
// Home and End while focused. It keeps only the drag in progress; the size is the app's (value and onChange). It sits
// absolutely on one edge of its positioned parent, the pane it resizes; start and end are logical, so in right-to-left
// text a vertical splitter's start is the pane's right edge and the keys and the drag mirror with it. The direction is
// read from the element when a drag starts or a key is pressed. splitter-math.ts holds the maths.
import { useRef, type ComponentPropsWithRef, type KeyboardEvent, type PointerEvent } from "react";
import { type Direction, dragged, dragSign, growKey, keyed } from "./splitter-math";
import "./Splitter.css";

/** vertical: a vertical bar that resizes a width; horizontal: a horizontal bar that resizes a height. */
export type SplitterOrientation = "vertical" | "horizontal";

/**
 * The edge of the resized pane the splitter sits on, in the text's direction: start is its inline start (the left, or
 * the right in right-to-left text) or its top, end the inline end or its bottom.
 */
export type SplitterEdge = "start" | "end";

export type SplitterProps = Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "children" | "role" | "aria-orientation" | "aria-valuenow" | "aria-valuemin" | "aria-valuemax"
> & {
  orientation: SplitterOrientation;
  /** The pane's size in px. */
  value: number;
  /** The smallest size in px. */
  min: number;
  /** The largest size in px. */
  max: number;
  /** A new size, in whole px within min and max. */
  onChange: (px: number) => void;
  /** The separator's accessible name, such as "Resize the inspector". */
  label: string;
  /**
   * Which edge of the pane it sits on: start (its inline start, or its top) by default, end the other. Moving outward,
   * away from the pane, grows it; in right-to-left text a vertical splitter's start is on the right.
   */
  edge?: SplitterEdge;
  /** How far one arrow key moves it, in px; 16 by default. */
  step?: number;
};

/** The text's direction at the splitter, as the browser lays it out. */
function direction(element: Element): Direction {
  return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

/** Draws a pane's resize handle, dragged by pointer or moved by keys. */
export function Splitter({
  orientation,
  value,
  min,
  max,
  onChange,
  label,
  edge = "start",
  step = 16,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  ...rest
}: SplitterProps) {
  const drag = useRef<{ start: number; at: number; sign: 1 | -1 } | null>(null);
  const bounds = { min, max };
  const along = (event: PointerEvent) => (orientation === "vertical" ? event.clientX : event.clientY);

  function down(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    // Captured, the drag follows the pointer past the bar's few px; jsdom has no capture.
    if (typeof target.setPointerCapture === "function") target.setPointerCapture(event.pointerId);
    target.focus();
    target.dataset["dragging"] = "";
    drag.current = { start: value, at: along(event), sign: dragSign(orientation, edge, direction(target)) };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    const started = drag.current;
    if (started === null) return;
    const next = dragged(started.start, along(event) - started.at, started.sign, bounds);
    if (next !== value) onChange(next);
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (event.type === "pointercancel") onPointerCancel?.(event);
    else onPointerUp?.(event);
    if (drag.current === null) return;
    drag.current = null;
    const target = event.currentTarget;
    delete target.dataset["dragging"];
    if (typeof target.hasPointerCapture === "function" && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = keyed(value, event.key, growKey(orientation, edge, direction(event.currentTarget)), step, bounds);
    if (next === undefined) return;
    event.preventDefault();
    if (next !== value) onChange(next);
  }

  return (
    <div
      {...rest}
      role="separator"
      tabIndex={rest.tabIndex ?? 0}
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className={className === undefined ? "pb-splitter" : `pb-splitter ${className}`}
      data-orientation={orientation}
      data-edge={edge}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={key}
    />
  );
}
