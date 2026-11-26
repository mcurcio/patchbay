// A splitter's maths, pure: a size kept within its bounds, a drag, and a key. Splitter.tsx draws and listens; this
// file decides the size.

/** The smallest and largest size, in px. */
export interface Bounds {
  min: number;
  max: number;
}

/** `value` within `bounds`, in whole px. A max below the min is read as the min. */
export function clamp(value: number, bounds: Bounds): number {
  const max = Math.max(bounds.min, bounds.max);
  return Math.round(Math.min(max, Math.max(bounds.min, value)));
}

/** The text's direction where the splitter is: it decides which side a vertical splitter's start and end are on. */
export type Direction = "ltr" | "rtl";

/**
 * A drag: the size at the drag's start plus the pointer's travel times `sign`, clamped. `sign` is `dragSign`'s: -1
 * where moving left or up grows what the splitter resizes, 1 where moving right or down does.
 */
export function dragged(start: number, travel: number, sign: 1 | -1, bounds: Bounds): number {
  return clamp(start + sign * travel, bounds);
}

/**
 * Whether the pointer's travel (clientX for a vertical splitter, clientY for a horizontal one) grows the pane (1) or
 * shrinks it (-1). The start edge is the pane's inline start for a vertical splitter (the left, or the right in
 * right-to-left text) and its top for a horizontal one; moving outward, away from the pane, grows it.
 */
export function dragSign(orientation: "vertical" | "horizontal", edge: "start" | "end", direction: Direction): 1 | -1 {
  const outward = edge === "start" ? -1 : 1;
  return orientation === "vertical" && direction === "rtl" ? (-outward as 1 | -1) : outward;
}

/** Which arrow grows what the splitter resizes: the one pointing outward from the edge it sits on. */
export function growKey(orientation: "vertical" | "horizontal", edge: "start" | "end", direction: Direction): string {
  if (orientation === "vertical") return dragSign(orientation, edge, direction) === -1 ? "ArrowLeft" : "ArrowRight";
  return edge === "start" ? "ArrowUp" : "ArrowDown";
}

const opposite: Record<string, string> = {
  ArrowLeft: "ArrowRight",
  ArrowRight: "ArrowLeft",
  ArrowUp: "ArrowDown",
  ArrowDown: "ArrowUp",
};

/**
 * A key on a focused splitter: `grow` adds `step` and its opposite arrow takes it away, clamped; Home goes to the min
 * and End to the max; any other key gives undefined (the key is not the splitter's).
 */
export function keyed(value: number, key: string, grow: string, step: number, bounds: Bounds): number | undefined {
  if (key === grow) return clamp(value + step, bounds);
  if (key === opposite[grow]) return clamp(value - step, bounds);
  if (key === "Home") return clamp(bounds.min, bounds);
  if (key === "End") return clamp(bounds.max, bounds);
  return undefined;
}
