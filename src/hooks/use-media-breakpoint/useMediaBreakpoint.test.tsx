// The shell's widths and touch: the thresholds, the queries, the answer as the window changes, and the answer with no
// window to ask.
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mediaQueries,
  narrowBelow,
  phoneBelow,
  readBreakpoint,
  serverBreakpoint,
  useMediaBreakpoint,
  widthOf,
} from "./useMediaBreakpoint";

/** A stand-in window whose width and pointer the test sets, answering the hook's three queries. */
function fakeMedia(start: { width: number; touch: boolean }) {
  const state = { ...start };
  const listeners = new Set<() => void>();
  const matches = (query: string) => {
    if (query === mediaQueries.touch) return state.touch;
    if (query === mediaQueries.phone) return state.width < phoneBelow;
    if (query === mediaQueries.narrow) return state.width < narrowBelow;
    return false;
  };
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    get matches() {
      return matches(query);
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    listeners,
    set(next: Partial<typeof state>) {
      Object.assign(state, next);
      for (const listener of [...listeners]) listener();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the widths", () => {
  it("are wide from 760 px, narrow below and phone below 600 px", () => {
    expect(narrowBelow).toBe(760);
    expect(phoneBelow).toBe(600);
    expect(widthOf(1280)).toBe("wide");
    expect(widthOf(760)).toBe("wide");
    expect(widthOf(759.5)).toBe("narrow");
    expect(widthOf(600)).toBe("narrow");
    expect(widthOf(599)).toBe("phone");
    expect(widthOf(0)).toBe("phone");
  });

  it("are read through the queries the stylesheets use", () => {
    expect(mediaQueries).toEqual({
      narrow: "(max-width: 759.98px)",
      phone: "(max-width: 599.98px)",
      touch: "(hover: none) and (pointer: coarse)",
    });
  });
});

describe("useMediaBreakpoint", () => {
  it("answers from the window and follows it as it changes", () => {
    const media = fakeMedia({ width: 1280, touch: false });
    const { result } = renderHook(() => useMediaBreakpoint());
    expect(result.current).toEqual({ width: "wide", touch: false });
    act(() => {
      media.set({ width: 700 });
    });
    expect(result.current).toEqual({ width: "narrow", touch: false });
    act(() => {
      media.set({ width: 390, touch: true });
    });
    expect(result.current).toEqual({ width: "phone", touch: true });
  });

  it("gives the same object while the answer is unchanged", () => {
    fakeMedia({ width: 700, touch: true });
    expect(readBreakpoint()).toBe(readBreakpoint());
  });

  it("stops listening when unmounted", () => {
    const media = fakeMedia({ width: 1280, touch: false });
    const { unmount } = renderHook(() => useMediaBreakpoint());
    expect(media.listeners.size).toBeGreaterThan(0);
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("answers wide and not touch with no matchMedia to ask", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(readBreakpoint()).toBe(serverBreakpoint);
    const { result } = renderHook(() => useMediaBreakpoint());
    expect(result.current).toEqual({ width: "wide", touch: false });
  });

  it("renders on a server as wide and not touch", () => {
    fakeMedia({ width: 390, touch: true });
    function Probe() {
      const { width, touch } = useMediaBreakpoint();
      return <p>{`${width} ${touch}`}</p>;
    }
    expect(renderToString(<Probe />)).toContain("wide false");
  });
});
