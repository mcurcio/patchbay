import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { expect, waitFor } from "storybook/test";
import type { LiveSubscribe } from "../../hooks";
import { Button } from "../../primitives";
import { Meter, type MeterHandle } from "./Meter";

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
    title: { control: false },
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

/** An orientation it does not know is drawn horizontal. */
export const UnknownOrientation: Story = { args: { orientation: "diagonal" } };

/** The tooltip's words are the app's: here in the app's own phrasing. */
export const OwnTitle: Story = {
  args: {
    title: (peak, rms, clipped) =>
      `${clipped ? "Clipped. " : ""}Peak ${peak.toFixed(0)} dBFS, average ${rms.toFixed(0)} dBFS`,
  },
  play: async ({ canvas, userEvent }) => {
    const meter = canvas.getByRole("img");
    await userEvent.hover(meter);
    await expect(meter).toHaveAttribute("title", "Peak -12 dBFS, average -18 dBFS");
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
