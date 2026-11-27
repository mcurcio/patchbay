// Meter on fake timers (performance.now and requestAnimationFrame): the bar and tick on the dB scale, silence, the
// hold and fall, the clip lamp, frames only while something moves, reset, the tooltip, the open orientation, no
// re-renders for a level, and the stylesheet's rules.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveSubscribe } from "../../hooks";
import { defaultMeterLabels, defaultMeterTitle, Meter, type MeterHandle, meterFraction, toDb } from "./Meter";
import css from "./Meter.css?raw";

function source(initial: readonly [number, number] = [0, 0]) {
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
    set(next: readonly [number, number]) {
      value = next;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
    listeners,
  };
}

const meter = () => screen.getByRole("img");
const level = () => Number(meter().style.getPropertyValue("--pb-meter-level"));
const tick = () => Number(meter().style.getPropertyValue("--pb-meter-tick"));
/** One frame's worth of time, so the waiting frame paints. */
const frame = () => {
  act(() => {
    vi.advanceTimersByTime(16);
  });
};
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const db = (value: number) => 10 ** (value / 20);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the scale", () => {
  it("reads linear amplitude as dBFS, silence as -Infinity", () => {
    expect(toDb(1)).toBe(0);
    expect(toDb(0.1)).toBeCloseTo(-20);
    for (const quiet of [0, -0.5, Number.NaN, -Infinity]) expect(toDb(quiet)).toBe(-Infinity);
  });

  it("places a level between the floor and 0 dBFS, clamped", () => {
    expect(meterFraction(-60, -60)).toBe(0);
    expect(meterFraction(-30, -60)).toBe(0.5);
    expect(meterFraction(0, -60)).toBe(1);
    expect(meterFraction(6, -60)).toBe(1);
    expect(meterFraction(-90, -60)).toBe(0);
    expect(meterFraction(-Infinity, -60)).toBe(0);
    expect(meterFraction(Number.NaN, -60)).toBe(0);
  });

  it("writes the English tooltip with −∞ for silence", () => {
    expect(defaultMeterTitle(-12, -18.34, false)).toBe("peak -12.0 dB, rms -18.3 dB");
    expect(defaultMeterTitle(-Infinity, -Infinity, false)).toBe("peak −∞ dB, rms −∞ dB");
  });
});

describe("Meter", () => {
  it("is an image named by labels.name (Level by default), and by its label, which wins", () => {
    const hot = source();
    const { rerender } = render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    expect(meter()).toHaveAccessibleName(defaultMeterLabels.name);
    expect(defaultMeterLabels.name).toBe("Level");
    rerender(<Meter subscribe={hot.subscribe} read={hot.read} labels={{ name: "Signal" }} />);
    expect(meter()).toHaveAccessibleName("Signal");
    rerender(<Meter subscribe={hot.subscribe} read={hot.read} labels={{ name: "Signal" }} label="Left output" />);
    expect(meter()).toHaveAccessibleName("Left output");
  });

  it("draws the RMS as the bar and the peak as the tick, on a -60 dBFS floor by default", () => {
    const hot = source([db(-6), db(-20)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    expect(level()).toBeCloseTo(40 / 60);
    expect(tick()).toBeCloseTo(54 / 60);
    expect(meter()).toHaveAttribute("data-peak", "shown");
    hot.set([db(-3), db(-12)]);
    frame();
    expect(level()).toBeCloseTo(48 / 60);
    expect(tick()).toBeCloseTo(57 / 60);
  });

  it("draws on its own floor and zones", () => {
    const hot = source([db(-20), db(-20)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} floor={-40} zones={[-20, -10]} />);
    frame();
    expect(level()).toBeCloseTo(0.5);
    expect(meter().style.getPropertyValue("--pb-meter-mid-at")).toBe("0.5");
    expect(meter().style.getPropertyValue("--pb-meter-hot-at")).toBe("0.75");
  });

  it("sets the default zones at -18 and -6 dBFS", () => {
    const hot = source();
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    expect(Number(meter().style.getPropertyValue("--pb-meter-mid-at"))).toBeCloseTo(0.7);
    expect(Number(meter().style.getPropertyValue("--pb-meter-hot-at"))).toBeCloseTo(0.9);
  });

  it("reads not a number, zero and below as silence", () => {
    const hot = source([Number.NaN, 0]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    expect(level()).toBe(0);
    expect(meter()).toHaveAttribute("data-peak", "hidden");
    hot.set([-1, Number.NaN]);
    frame();
    expect(level()).toBe(0);
    expect(meter()).toHaveAttribute("data-peak", "hidden");
  });

  it("holds the peak for 1.5 s, then lets it fall at 20 dB/s until it meets the current peak", () => {
    const hot = source([db(-6), db(-12)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    hot.set([db(-40), db(-45)]);
    wait(1400);
    expect(tick()).toBeCloseTo(54 / 60);
    // 500 ms past the hold: 10 dB down.
    wait(616);
    expect(tick()).toBeCloseTo(44 / 60, 1);
    // Then it meets -40 dBFS and rides it.
    wait(2000);
    expect(tick()).toBeCloseTo(20 / 60);
  });

  it("takes a new higher peak at once, holding it afresh", () => {
    const hot = source([db(-30), db(-40)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    wait(1000);
    hot.set([db(-10), db(-20)]);
    hot.set([db(-50), db(-55)]);
    wait(1400);
    expect(tick()).toBeCloseTo(50 / 60);
  });

  it("follows its own hold and fall", () => {
    const hot = source([db(-10), db(-20)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} holdMs={100} fallDbPerS={40} />);
    frame();
    hot.set([0, 0]);
    // 100 ms of hold, then 500 ms at 40 dB/s: 20 dB down.
    wait(600);
    expect(tick()).toBeCloseTo(30 / 60, 1);
  });

  it("asks for frames only while something moves", () => {
    const hot = source([db(-6), db(-12)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    // A new value: one frame waits.
    expect(vi.getTimerCount()).toBe(1);
    frame();
    // The tick equals the current peak: nothing moves.
    expect(vi.getTimerCount()).toBe(0);
    // The level drops: the tick holds and falls, so frames run until it meets the new peak.
    hot.set([db(-30), db(-36)]);
    expect(vi.getTimerCount()).toBe(1);
    // 24 dB to fall at 20 dB/s: 1.2 s after the hold.
    wait(1500 + 1000);
    expect(vi.getTimerCount()).toBe(1);
    wait(300);
    expect(vi.getTimerCount()).toBe(0);
    expect(tick()).toBeCloseTo(30 / 60);
  });

  it("stops when silence lets the tick fall below the floor", () => {
    const hot = source([db(-50), db(-55)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    hot.set([0, 0]);
    wait(1500 + 600);
    expect(meter()).toHaveAttribute("data-peak", "hidden");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lights the clip lamp at 1.0 and keeps it lit for 2 s after the last clip", () => {
    const hot = source([0.99, 0.5]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    expect(meter()).toHaveAttribute("data-clipped", "false");
    hot.set([1, 0.5]);
    frame();
    expect(meter()).toHaveAttribute("data-clipped", "true");
    wait(1000);
    hot.set([1.2, 0.5]);
    hot.set([0.5, 0.25]);
    wait(1900);
    expect(meter()).toHaveAttribute("data-clipped", "true");
    wait(150);
    expect(meter()).toHaveAttribute("data-clipped", "false");
  });

  it("follows its own clip level and hold", () => {
    const hot = source([0.5, 0.25]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} clipAt={0.5} clipHoldMs={300} />);
    frame();
    expect(meter()).toHaveAttribute("data-clipped", "true");
    hot.set([0.1, 0.05]);
    wait(320);
    expect(meter()).toHaveAttribute("data-clipped", "false");
  });

  it("resets: empties the bar, clears the hold and the lamp, and stops its frames", () => {
    const hot = source([1, 0.5]);
    const handle = createRef<MeterHandle>();
    render(<Meter subscribe={hot.subscribe} read={hot.read} ref={handle} />);
    frame();
    expect(meter()).toHaveAttribute("data-clipped", "true");
    act(() => {
      handle.current?.reset();
    });
    expect(level()).toBe(0);
    expect(tick()).toBe(0);
    expect(meter()).toHaveAttribute("data-peak", "hidden");
    expect(meter()).toHaveAttribute("data-clipped", "false");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("writes the tooltip on pointer entry and at most every 250 ms while hovered", () => {
    const hot = source([db(-12), db(-18)]);
    const title = vi.fn(
      (peak: number, rms: number, clipped: boolean) => `${peak.toFixed(0)} ${rms.toFixed(0)} ${clipped}`,
    );
    render(<Meter subscribe={hot.subscribe} read={hot.read} labels={{ title }} />);
    frame();
    expect(meter()).not.toHaveAttribute("title");
    fireEvent.pointerEnter(meter());
    expect(meter()).toHaveAttribute("title", "-12 -18 false");
    hot.set([db(-6), db(-9)]);
    frame();
    expect(meter()).toHaveAttribute("title", "-12 -18 false");
    hot.set([db(-5), db(-8)]);
    wait(250);
    expect(meter()).toHaveAttribute("title", "-5 -8 false");
    fireEvent.pointerLeave(meter());
    title.mockClear();
    hot.set([1, 0.5]);
    wait(500);
    expect(title).not.toHaveBeenCalled();
  });

  it("uses the English tooltip by default", () => {
    const hot = source([db(-12), db(-18.3)]);
    render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    fireEvent.pointerEnter(meter());
    expect(meter().title).toBe("peak -12.0 dB, rms -18.3 dB");
  });

  it("is horizontal by default, and draws an orientation it does not know as horizontal", () => {
    const hot = source();
    const { rerender } = render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    expect(meter()).toHaveAttribute("data-orientation", "horizontal");
    rerender(<Meter subscribe={hot.subscribe} read={hot.read} orientation="diagonal" />);
    expect(meter()).toHaveAttribute("data-orientation", "diagonal");
    // The stylesheet keys on vertical alone, so any other word keeps the horizontal rules.
    const keyed = [...css.matchAll(/data-orientation="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(keyed)).toEqual(new Set(["vertical"]));
    rerender(<Meter subscribe={hot.subscribe} read={hot.read} orientation="vertical" />);
    expect(meter()).toHaveAttribute("data-orientation", "vertical");
  });

  it("fills a horizontal bar from the inline start in right-to-left text, and a vertical one from the bottom", () => {
    // The RTL rule names horizontal by excluding vertical, so an unknown orientation mirrors too.
    expect(css).toMatch(
      /\.pb-meter:not\(\[data-orientation="vertical"\]\):dir\(rtl\) \.pb-meter-bar \{\s*background: linear-gradient\(\s*to left,/,
    );
    expect(css).toMatch(/clip-path: inset\(0 0 0 calc\(\(1 - var\(--pb-meter-level\)\) \* 100%\)\);/);
    expect(css).toMatch(/\.pb-meter-peak \{[^}]*inset-inline-start: calc\(var\(--pb-meter-tick\) \* \(100% - 2px\)\);/);
    expect(css).not.toMatch(/\b(left|right):/);
  });

  it("never re-renders for a level", () => {
    const hot = source([0.1, 0.05]);
    const renders = vi.fn();
    render(
      <Profiler id="meter" onRender={renders}>
        <Meter subscribe={hot.subscribe} read={hot.read} />
      </Profiler>,
    );
    const before = renders.mock.calls.length;
    for (let i = 1; i <= 50; i++) {
      hot.set([i / 50, i / 100]);
      frame();
    }
    expect(renders.mock.calls.length).toBe(before);
  });

  it("keeps its painted level through a re-render", () => {
    const hot = source([db(-6), db(-20)]);
    const { rerender } = render(<Meter subscribe={hot.subscribe} read={hot.read} className="mine" />);
    frame();
    rerender(<Meter subscribe={hot.subscribe} read={hot.read} className="other" />);
    expect(meter()).toHaveClass("pb-meter", "other");
    expect(level()).toBeCloseTo(40 / 60);
  });

  it("redraws on a new floor", () => {
    const hot = source([db(-20), db(-20)]);
    const { rerender } = render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    frame();
    rerender(<Meter subscribe={hot.subscribe} read={hot.read} floor={-40} />);
    frame();
    expect(level()).toBeCloseTo(0.5);
  });

  it("unsubscribes and cancels its frame on unmount", () => {
    const hot = source([db(-6), db(-12)]);
    const { unmount } = render(<Meter subscribe={hot.subscribe} read={hot.read} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(hot.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes native props through", () => {
    const hot = source();
    render(<Meter subscribe={hot.subscribe} read={hot.read} data-testid="m" id="level-1" />);
    expect(screen.getByTestId("m")).toHaveAttribute("id", "level-1");
  });
});

describe("Meter's stylesheet", () => {
  it("animates nothing, so the level moves the same under reduced motion", () => {
    expect(css).not.toMatch(/\b(animation|transition)\s*:/);
  });

  it("keeps the bar, tick and lamp visible under forced colours", () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(forced).toMatch(/\.pb-meter-bar[\s\S]*?background: Highlight/);
    expect(forced).toMatch(/\.pb-meter-peak[\s\S]*?background: CanvasText/);
  });

  it("draws in the meter tokens", () => {
    for (const token of ["--pb-meter-low", "--pb-meter-mid", "--pb-meter-hot", "--pb-meter-peak"]) {
      expect(css).toContain(`var(${token})`);
    }
  });
});
