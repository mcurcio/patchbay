import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { expect, waitFor } from "storybook/test";
import { type LiveSubscribe, useLiveValue } from "../../hooks";
import { Button } from "../../primitives";
import { formatMeterDb, Meter, type MeterHandle, toDb } from "./Meter";

type Level = readonly [peak: number, rms: number];

/** A level that stays put, for the stories that check what is drawn. */
function steady(peakDb: number, rmsDb: number) {
  const value: Level = [10 ** (peakDb / 20), 10 ** (rmsDb / 20)];
  const subscribe: LiveSubscribe = () => () => undefined;
  return { subscribe, read: () => value };
}

/**
 * A moving level, 30 values a second while anything listens: a slow swell with a little flutter, peaking now and
 * then at `top` (a linear amplitude; above 1.0 it clips).
 */
function swell(top = 0.9, periodMs = 4000) {
  let value: Level = [0, 0];
  const listeners = new Set<() => void>();
  let timer: number | undefined;
  const subscribe: LiveSubscribe = (listener) => {
    listeners.add(listener);
    if (timer === undefined) {
      const start = performance.now();
      timer = window.setInterval(() => {
        const phase = ((performance.now() - start) % periodMs) / periodMs;
        const body = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI);
        const peak = top * body * (0.85 + 0.15 * Math.random());
        value = [peak, peak * 0.5];
        for (const each of listeners) each();
      }, 33);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
  };
  return { subscribe, read: () => value };
}

const box = { width: "180px", padding: "var(--pb-space-3)", background: "var(--pb-raised)" };

const meta = {
  title: "Graph/Meter",
  component: Meter,
  args: { ...steady(-12, -18), label: "Level" },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
    subscribe: { control: false },
    read: { control: false },
    labels: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={box}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A steady level: the bar is the RMS (-18 dBFS), the tick the peak (-12 dBFS). */
export const Steady: Story = {
  play: async ({ canvas }) => {
    const meter = canvas.getByRole("img", { name: "Level" });
    await waitFor(() => expect(Number(meter.style.getPropertyValue("--pb-meter-level"))).toBeCloseTo(0.7));
    await expect(meter).toHaveAttribute("data-peak", "shown");
    await expect(meter).toHaveAttribute("data-clipped", "false");
  },
};

/** A level that swells and falls: the tick holds the highest peak, then falls. */
export const Moving: Story = { args: { ...swell() } };

/** Peaks above 0 dBFS light the clip lamp, which stays lit for two seconds after the last one. */
export const Clipping: Story = {
  args: { ...steady(1, -6) },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole("img")).toHaveAttribute("data-clipped", "true"));
  },
};

/** Silence: an empty bar and no tick. */
export const Silent: Story = {
  args: { subscribe: () => () => undefined, read: () => [0, 0] as const },
  play: async ({ canvas }) => {
    const meter = canvas.getByRole("img");
    await waitFor(() => expect(meter.style.getPropertyValue("--pb-meter-level")).toBe("0"));
    await expect(meter).toHaveAttribute("data-peak", "hidden");
  },
};

/** Its own scale: a -40 dBFS floor, zones at -20 and -10, a shorter hold and a faster fall. */
export const OwnScale: Story = {
  args: { ...swell(0.7, 3000), floor: -40, zones: [-20, -10], holdMs: 600, fallDbPerS: 40 },
};

/** Vertical: 6 px wide, filling its container's height, the lamp on top. */
export const Vertical: Story = {
  args: { ...swell(1.1), orientation: "vertical" },
  decorators: [
    (Story) => (
      <div style={{ height: "120px", display: "flex" }}>
        <Story />
      </div>
    ),
  ],
};

/** Where the drawn bar's clip leaves off and the lamp and tick sit, against the track's edges. */
function parts(root: HTMLElement) {
  const track = root.querySelector(".pb-meter-track");
  const bar = root.querySelector(".pb-meter-bar");
  const lamp = root.querySelector(".pb-meter-lamp");
  const peak = root.querySelector(".pb-meter-peak");
  if (track === null || bar === null || lamp === null || peak === null) throw new Error("no meter parts");
  return {
    track: track.getBoundingClientRect(),
    bar,
    lamp: lamp.getBoundingClientRect(),
    peak: peak.getBoundingClientRect(),
  };
}

/**
 * Right-to-left text: a horizontal bar fills from the inline start, the right, its lamp at the inline end, the left;
 * a vertical one still fills from the bottom.
 */
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const meter = canvas.getByRole("img", { name: "Level" });
    await waitFor(() => expect(Number(meter.style.getPropertyValue("--pb-meter-level"))).toBeCloseTo(0.7));
    const { track, bar, lamp, peak } = parts(canvasElement);
    await expect(lamp.right).toBeLessThanOrEqual(track.left);
    // The clip takes the empty part off the left, the inline end; the RMS is 70 % of the bar, from the right.
    await expect(getComputedStyle(bar).clipPath).toMatch(/^inset\(0px 0px 0px /);
    // The tick, -12 dBFS (80 %), sits 80 % of the way along from the right.
    await expect((track.right - peak.right) / (track.width - peak.width)).toBeCloseTo(0.8, 1);
  },
};

/** An orientation it does not know is drawn horizontal. */
export const UnknownOrientation: Story = { args: { orientation: "diagonal" } };

/** The meter's own words are the app's, through `labels`: its default name and the tooltip, here in the app's own
 * phrasing. A `label` (what the meter measures) wins over `labels.name`. */
export const Labels: Story = {
  args: {
    label: undefined,
    labels: {
      name: "Signal level",
      title: (peak, rms, clipped) =>
        `${clipped ? "Clipped. " : ""}Peak ${peak.toFixed(0)} dBFS, average ${rms.toFixed(0)} dBFS`,
    },
  },
  play: async ({ canvas, userEvent }) => {
    const meter = canvas.getByRole("img");
    await expect(meter).toHaveAccessibleName("Signal level");
    await userEvent.hover(meter);
    await expect(meter).toHaveAttribute("title", "Peak -12 dBFS, average -18 dBFS");
  },
};

/**
 * The numbers in words, as an app's inspector writes them beside the meter (U47): read from the same source through
 * useLiveValue and painted into a text node, never through React state, with formatMeterDb so they read as the
 * tooltip does.
 */
function NumbersDemo({ source }: { source: { subscribe: LiveSubscribe; read: () => Level } }) {
  const words = useRef<HTMLSpanElement>(null);
  useLiveValue(source.subscribe, source.read, ([peak, rms]) => {
    if (words.current !== null) {
      words.current.textContent = `Peak ${formatMeterDb(toDb(peak))} dB, RMS ${formatMeterDb(toDb(rms))} dB`;
    }
  });
  return (
    <div style={box}>
      <Meter {...source} label="Left output" />
      <p style={{ margin: "var(--pb-space-2) 0 0", fontSize: "var(--pb-text-sm)" }}>
        <span ref={words} data-testid="numbers" />
      </p>
    </div>
  );
}

export const NumbersInWords: Story = {
  render: () => <NumbersDemo source={steady(-12, -18)} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("numbers")).toHaveTextContent("Peak -12.0 dB, RMS -18.0 dB");
  },
};

/** reset(): when the source closes, the bar empties and the hold and the lamp clear. */
function ResetDemo() {
  const meter = useRef<MeterHandle>(null);
  const [source, setSource] = useState(() => swell(1.1, 2000));
  return (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <Meter ref={meter} {...source} label="Output level" />
      <Button
        onClick={() => {
          setSource(steady(-Infinity, -Infinity));
          meter.current?.reset();
        }}
      >
        Close the source
      </Button>
    </div>
  );
}

export const Reset: Story = {
  render: () => <ResetDemo />,
  play: async ({ canvas, userEvent }) => {
    const meter = canvas.getByRole("img", { name: "Output level" });
    await userEvent.click(canvas.getByRole("button", { name: "Close the source" }));
    await expect(meter.style.getPropertyValue("--pb-meter-level")).toBe("0");
    await expect(meter).toHaveAttribute("data-peak", "hidden");
    await expect(meter).toHaveAttribute("data-clipped", "false");
  },
};

/** A level, a clip, silence and a vertical pair, for a glance under each brand and theme. */
export const All: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <Meter {...steady(-8, -14)} label="Left" />
      <Meter {...steady(-3, -9)} label="Right" />
      <Meter {...steady(1, -4)} label="Clipping" />
      <Meter {...steady(-Infinity, -Infinity)} label="Silent" />
      <div style={{ display: "flex", gap: "var(--pb-space-2)", height: "64px" }}>
        <Meter {...steady(-20, -30)} orientation="vertical" label="Low" />
        <Meter {...steady(-10, -15)} orientation="vertical" label="Mid" />
        <Meter {...steady(-2, -5)} orientation="vertical" label="Hot" />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(7);
    await waitFor(() => expect(canvas.getByRole("img", { name: "Clipping" })).toHaveAttribute("data-clipped", "true"));
  },
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
