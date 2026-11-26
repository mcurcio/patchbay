// useLiveValue: it reads on subscribing and on every notification, hands each value to the paint callback and keeps it
// in its ref, never re-renders, follows a new read and paint without subscribing again, and unsubscribes on unmount.
import { render, renderHook } from "@testing-library/react";
import { Profiler } from "react";
import { describe, expect, it, vi } from "vitest";
import { type LiveSubscribe, useLiveValue } from "./useLiveValue";

function source<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe: LiveSubscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    subscribe,
    read: () => value,
    set(next: T) {
      value = next;
      for (const listener of listeners) listener();
    },
    listeners,
  };
}

describe("useLiveValue", () => {
  it("reads on subscribing and on every notification", () => {
    const hot = source(1);
    const paint = vi.fn();
    const { result } = renderHook(() => useLiveValue(hot.subscribe, hot.read, paint));
    expect(paint).toHaveBeenLastCalledWith(1);
    expect(result.current.current).toBe(1);
    hot.set(2);
    hot.set(3);
    expect(paint.mock.calls.map(([value]) => value as number)).toEqual([1, 2, 3]);
    expect(result.current.current).toBe(3);
  });

  it("works without a paint callback, keeping the value in its ref", () => {
    const hot = source("a");
    const { result } = renderHook(() => useLiveValue(hot.subscribe, hot.read));
    hot.set("b");
    expect(result.current.current).toBe("b");
  });

  it("never re-renders for a value", () => {
    const hot = source(0);
    const renders = vi.fn();
    function Reader() {
      useLiveValue(hot.subscribe, hot.read, () => undefined);
      return null;
    }
    render(
      <Profiler id="reader" onRender={renders}>
        <Reader />
      </Profiler>,
    );
    const before = renders.mock.calls.length;
    for (let i = 1; i <= 100; i++) hot.set(i);
    expect(renders.mock.calls.length).toBe(before);
  });

  it("uses the latest read and paint without subscribing again", () => {
    const hot = source(1);
    const subscribe = vi.fn(hot.subscribe);
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ paint, scale }) => useLiveValue(subscribe, () => hot.read() * scale, paint), {
      initialProps: { paint: first, scale: 1 },
    });
    rerender({ paint: second, scale: 10 });
    hot.set(2);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalledWith(20);
    expect(second).toHaveBeenLastCalledWith(20);
  });

  it("subscribes afresh to a new subscribe, reading it at once", () => {
    const one = source(1);
    const two = source(2);
    const paint = vi.fn();
    const { rerender } = renderHook(({ hot }) => useLiveValue(hot.subscribe, hot.read, paint), {
      initialProps: { hot: one },
    });
    rerender({ hot: two });
    expect(one.listeners.size).toBe(0);
    expect(two.listeners.size).toBe(1);
    expect(paint).toHaveBeenLastCalledWith(2);
    one.set(5);
    expect(paint).not.toHaveBeenCalledWith(5);
  });

  it("unsubscribes on unmount and ignores a late notification", () => {
    const hot = source(1);
    let late: (() => void) | undefined;
    const subscribe: LiveSubscribe = (listener) => {
      late = listener;
      return hot.subscribe(listener);
    };
    const paint = vi.fn();
    const { unmount } = renderHook(() => useLiveValue(subscribe, hot.read, paint));
    unmount();
    expect(hot.listeners.size).toBe(0);
    paint.mockClear();
    late?.();
    expect(paint).not.toHaveBeenCalled();
  });
});
