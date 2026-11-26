// How long a view move takes that a person asked for (a zoom, a fit; docs/graph.md#canvastools): the canvas's
// --pb-motion-slow, which tokens.css sets to 0 ms under reduced motion, so a brand's duration and the person's wish
// both hold. Read from the canvas's element at the move, since a brand or the theme can change it at any time.

const fallback = 180;

/** `--pb-motion-slow` on `element` in milliseconds; without the tokens loaded, 180 ms, or 0 under reduced motion. */
export function slowMotionMs(element: Element | null | undefined): number {
  const value =
    element === null || element === undefined ? "" : getComputedStyle(element).getPropertyValue("--pb-motion-slow");
  const parsed = /^\s*(\d+(?:\.\d+)?)(ms|s)\s*$/.exec(value);
  if (parsed !== null) return Number(parsed[1]) * (parsed[2] === "s" ? 1000 : 1);
  const reduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced ? 0 : fallback;
}
