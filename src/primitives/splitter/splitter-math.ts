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

/**
 * A drag: the size at the drag's start plus the pointer's travel times `sign`, clamped. The sign is -1 for a splitter on
 * the start edge (left or top) of what it resizes, where moving left or up grows it, and 1 on the end edge.
 */
export function dragged(start: number, travel: number, sign: 1 | -1, bounds: Bounds): number {
  return clamp(start + sign * travel, bounds);
}

/** Which arrow grows what the splitter resizes, from its orientation and the edge it sits on. */
export function growKey(orientation: "vertical" | "horizontal", edge: "start" | "end"): string {
  if (orientation === "vertical") return edge === "start" ? "ArrowLeft" : "ArrowRight";
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
