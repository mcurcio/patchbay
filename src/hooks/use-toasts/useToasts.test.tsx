// useToasts: show returns the id at once and coalesces, one timer expires the soonest toast on the clock, a hold from
// the toaster stops expiry, the newest few are the toaster's, and dismiss and clear take toasts away.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToasts } from "./useToasts";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useToasts", () => {
  it("shows toasts, returning each id at once, and coalesces by key", () => {
    const { result } = renderHook(() => useToasts());
    let ids: number[] = [];
    act(() => {
      ids = [
        result.current.show({ tone: "ok", text: "One.", key: "a" }),
        result.current.show({ tone: "ok", text: "Two.", key: "a" }),
        result.current.show({ tone: "err", text: "Three." }),
      ];
    });
    expect(ids).toEqual([1, 1, 2]);
    expect(result.current.toasts.map((toast) => [toast.text, toast.count])).toEqual([
      ["Two.", 2],
      ["Three.", 1],
    ]);
  });

  it("expires each toast after 8 s on the monotonic clock", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
    });
    act(() => {
      vi.advanceTimersByTime(4000);
      result.current.show({ tone: "ok", text: "Two." });
    });
    act(() => {
      vi.advanceTimersByTime(4001);
    });
    expect(result.current.toasts.map((toast) => toast.text)).toEqual(["Two."]);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toasts).toEqual([]);
  });

  it("sets its timer again when it fires before the clock says the toast is over", () => {
    let now = 0;
    const { result } = renderHook(() => useToasts({ now: () => now, duration: 100 }));
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
    });
    // The timer fires (at 101 ms on the timers) while the app's clock still reads 50.
    now = 50;
    act(() => {
      vi.advanceTimersByTime(101);
    });
    expect(result.current.toasts).toHaveLength(1);
    now = 101;
    act(() => {
      vi.advanceTimersByTime(52);
    });
    expect(result.current.toasts).toEqual([]);
  });

  it("reads its own clock and duration when given", () => {
    let now = 0;
    const { result } = renderHook(() => useToasts({ now: () => now, duration: 100 }));
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
    });
    expect(result.current.toasts[0]?.expiresAt).toBe(100);
    now = 101;
    act(() => {
      vi.advanceTimersByTime(102);
    });
    expect(result.current.toasts).toEqual([]);
  });

  it("expires nothing while the toaster holds it, and moves the expiry on when let go", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.toasterProps.onHold(true);
    });
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      result.current.toasterProps.onHold(false);
    });
    act(() => {
      vi.advanceTimersByTime(6990);
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current.toasts).toEqual([]);
  });

  it("gives the toaster the newest four and the count of the rest", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      for (let each = 1; each <= 6; each += 1) result.current.show({ tone: "ok", text: `Toast ${each}.` });
    });
    const { toasts, more } = result.current.toasterProps;
    expect(toasts.map((toast) => toast.text)).toEqual(["Toast 3.", "Toast 4.", "Toast 5.", "Toast 6."]);
    expect(more).toBe(2);
  });

  it("shows as many as asked", () => {
    const { result } = renderHook(() => useToasts({ visible: 1 }));
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
      result.current.show({ tone: "ok", text: "Two." });
    });
    expect(result.current.toasterProps.toasts.map((toast) => toast.text)).toEqual(["Two."]);
    expect(result.current.toasterProps.more).toBe(1);
  });

  it("dismisses one and clears all, through itself or the toaster", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
      result.current.show({ tone: "ok", text: "Two." });
      result.current.show({ tone: "ok", text: "Three." });
    });
    act(() => {
      result.current.dismiss(1);
      result.current.toasterProps.onDismiss(2);
    });
    expect(result.current.toasts.map((toast) => toast.text)).toEqual(["Three."]);
    act(() => {
      result.current.clear();
    });
    expect(result.current.toasts).toEqual([]);
  });

  it("keeps its functions and the toaster's props while nothing changes", () => {
    const { result, rerender } = renderHook(() => useToasts());
    const first = result.current;
    rerender();
    expect(result.current.show).toBe(first.show);
    expect(result.current.dismiss).toBe(first.dismiss);
    expect(result.current.toasterProps).toBe(first.toasterProps);
  });

  it("sets no timer after unmounting", () => {
    const { result, unmount } = renderHook(() => useToasts());
    act(() => {
      result.current.show({ tone: "ok", text: "One." });
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
