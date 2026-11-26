// The shell's three widths and whether the screen is touch (docs/components.md#usemediabreakpoint): wide from 760 px,
// narrow below 760 px, phone below 600 px, and touch where the main pointer is coarse and cannot hover, the same
// query the components' stylesheets use for their touch sizes. It reads the media queries through
// useSyncExternalStore, so it updates as the window resizes and answers "wide", not touch, with no window (on a
// server, or before hydration).
import { useSyncExternalStore } from "react";

/** The window's width class: wide, narrow (below 760 px) or phone (below 600 px). */
export type MediaWidth = "wide" | "narrow" | "phone";

export type MediaBreakpoint = {
  width: MediaWidth;
  /** The main pointer is coarse and cannot hover: targets grow to their touch sizes. */
  touch: boolean;
};

/** Narrow below this many CSS px. */
export const narrowBelow = 760;
/** Phone below this many CSS px. */
export const phoneBelow = 600;

/** The media queries the hook reads, for an app's own stylesheet or matchMedia. */
export const mediaQueries = {
  narrow: `(max-width: ${narrowBelow - 0.02}px)`,
  phone: `(max-width: ${phoneBelow - 0.02}px)`,
  touch: "(hover: none) and (pointer: coarse)",
} as const;

/** The width class of a window `px` CSS px wide. */
export function widthOf(px: number): MediaWidth {
  if (px < phoneBelow) return "phone";
  if (px < narrowBelow) return "narrow";
  return "wide";
}

// One object per answer, so a snapshot that has not changed is the same object (useSyncExternalStore's rule).
const answers: Record<`${MediaWidth} ${boolean}`, MediaBreakpoint> = {
  "wide false": { width: "wide", touch: false },
  "wide true": { width: "wide", touch: true },
  "narrow false": { width: "narrow", touch: false },
  "narrow true": { width: "narrow", touch: true },
  "phone false": { width: "phone", touch: false },
  "phone true": { width: "phone", touch: true },
};

/** The answer with no window to ask. */
export const serverBreakpoint: MediaBreakpoint = answers["wide false"];

function canQuery(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/** The answer now, from the window's media queries. */
export function readBreakpoint(): MediaBreakpoint {
  if (!canQuery()) return serverBreakpoint;
  const width: MediaWidth = window.matchMedia(mediaQueries.phone).matches
    ? "phone"
    : window.matchMedia(mediaQueries.narrow).matches
      ? "narrow"
      : "wide";
  return answers[`${width} ${window.matchMedia(mediaQueries.touch).matches}`];
}

function subscribe(onChange: () => void): () => void {
  if (!canQuery()) return () => {};
  const lists = Object.values(mediaQueries).map((query) => window.matchMedia(query));
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

function getServerSnapshot(): MediaBreakpoint {
  return serverBreakpoint;
}

/** The window's width class and touch flag, kept current as either changes. */
export function useMediaBreakpoint(): MediaBreakpoint {
  return useSyncExternalStore(subscribe, readBreakpoint, getServerSnapshot);
}
