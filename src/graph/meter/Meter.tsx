// A level bar on a decibel scale (docs/graph.md#meter). It is painted through refs and never re-renders through
// React for a level: useLiveValue hands each new value to paint(), which sets CSS variables and data attributes on
// the element, and requestAnimationFrame runs only while something moves (a new value, a held tick that will fall, a
// lit clip lamp counting down). Times come from performance.now(), a monotonic clock.
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type Ref,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useState,
} from "react";
import { type LiveSubscribe, useLiveValue } from "../../hooks";
import "./Meter.css";

/** Which way the bar fills: an open enum, and one it does not know is drawn horizontal. */
export type MeterOrientation = "horizontal" | "vertical" | (string & {});

/** Writes the tooltip from the current peak and RMS in dBFS (`-Infinity` for silence) and whether the lamp is lit. */
export type MeterTitle = (peakDb: number, rmsDb: number, clipped: boolean) => string;

/** What a parent can do to a meter through its `ref`. */
export type MeterHandle = {
  /** Empties the bar and clears the held peak and the clip lamp, as when the source closes. */
  reset(): void;
};

export type MeterProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "title" | "role"> & {
  /** Adds a listener that means a new value is ready to read; returns what removes it. */
  subscribe: LiveSubscribe;
  /** The current `[peak, rms]` as linear amplitude, 1.0 being 0 dBFS. Not a number, or 0 and below, is silence. */
  read: () => readonly [peak: number, rms: number];
  /** `horizontal` (the default) or `vertical`. */
  orientation?: MeterOrientation;
  /** dBFS at the bar's empty end; the full end is 0 dBFS. -60 by default. */
  floor?: number;
  /** `[mid, hot]` in dBFS, where the bar turns from `--pb-meter-low` to `--pb-meter-mid` and to `--pb-meter-hot`. */
  zones?: readonly [mid: number, hot: number];
  /** How long the peak tick holds the highest peak, in ms. 1500 by default. */
  holdMs?: number;
  /** How fast the tick then falls toward the current peak, in dB a second. 20 by default. */
  fallDbPerS?: number;
  /** A peak at or above this linear amplitude lights the clip lamp. 1.0 (0 dBFS) by default. */
  clipAt?: number;
  /** How long the lamp stays lit after the last such peak, in ms. 2000 by default. */
  clipHoldMs?: number;
  /** The accessible name ("Level" by default); the numbers are never announced. */
  label?: string;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<MeterLabels>;
  /** `reset()`, for when the source closes. */
  ref?: Ref<MeterHandle>;
};

/** The scale's defaults, each a prop. */
export const defaultMeterScale = {
  floor: -60,
  zones: [-18, -6] as const,
  holdMs: 1500,
  fallDbPerS: 20,
  clipAt: 1,
  clipHoldMs: 2000,
} as const;

/** How often, at most, the tooltip is refreshed while the pointer is over the meter, in ms. */
export const meterTitleEveryMs = 250;

/** A linear amplitude in dBFS; not a number, or 0 and below, is silence (`-Infinity`). */
export function toDb(linear: number): number {
  return Number.isFinite(linear) && linear > 0 ? 20 * Math.log10(linear) : linear === Infinity ? Infinity : -Infinity;
}

/** Where a level in dBFS sits on a bar from `floor` (0) to 0 dBFS (1), clamped. */
export function meterFraction(db: number, floor: number): number {
  if (Number.isNaN(db) || floor >= 0) return 0;
  return Math.min(1, Math.max(0, (db - floor) / -floor));
}

const formatDb = (db: number) => (db === -Infinity ? "−∞" : db.toFixed(1));

/** The English tooltip: "peak -12.0 dB, rms -18.3 dB", with −∞ for silence. */
export const defaultMeterTitle: MeterTitle = (peakDb, rmsDb) =>
  `peak ${formatDb(peakDb)} dB, rms ${formatDb(rmsDb)} dB`;

/** The meter's own words, each replaceable. */
export interface MeterLabels {
  /** Writes the tooltip from the level: `defaultMeterTitle`, "peak -12.0 dB, rms -18.3 dB". */
  title: MeterTitle;
}

export const defaultMeterLabels: MeterLabels = {
  title: defaultMeterTitle,
};

type Level = {
  peakDb: number;
  rmsDb: number;
  /** The tick's level when it was last set, and when; it holds, then falls from there. */
  heldDb: number;
  heldAt: number;
  /** When the last peak at or above `clipAt` came, or -Infinity. */
  clippedAt: number;
};

type Scale = Required<Pick<MeterProps, "floor" | "holdMs" | "fallDbPerS" | "clipAt" | "clipHoldMs">> & MeterLabels;

const silent = (): Level => ({
  peakDb: -Infinity,
  rmsDb: -Infinity,
  heldDb: -Infinity,
  heldAt: -Infinity,
  clippedAt: -Infinity,
});

/**
 * The meter's moving parts outside React: the level, the held tick and the lamp, the frame loop and the tooltip.
 * One is made per mounted meter; it paints into whatever element `attach` gave it.
 */
function createPainter(initial: Scale) {
  let element: HTMLElement | null = null;
  let scale = initial;
  let level = silent();
  let frame: number | undefined;
  let hovered = false;
  let titledAt = -Infinity;
  /** A level came since the tooltip was last written. */
  let stale = false;

  /** The tick's level at `now`: the held peak, then falling at the set rate, never below the current peak. */
  const tickAt = (now: number) => {
    const falling = Math.max(0, now - level.heldAt - scale.holdMs);
    const fallen = falling === 0 ? level.heldDb : level.heldDb - (Math.max(0, scale.fallDbPerS) * falling) / 1000;
    return Math.max(level.peakDb, fallen);
  };

  const writeTitle = (now: number) => {
    if (element === null) return;
    const clipped = now - level.clippedAt < scale.clipHoldMs;
    element.title = scale.title(level.peakDb, level.rmsDb, clipped);
    titledAt = now;
    stale = false;
  };

  /** Draws the level at `now`; says whether anything will still move. */
  const paint = (now: number) => {
    if (element === null) return false;
    const tick = tickAt(now);
    const lit = now - level.clippedAt < scale.clipHoldMs;
    element.style.setProperty("--pb-meter-level", String(meterFraction(level.rmsDb, scale.floor)));
    element.style.setProperty("--pb-meter-tick", String(meterFraction(tick, scale.floor)));
    element.dataset["peak"] = tick > scale.floor ? "shown" : "hidden";
    element.dataset["clipped"] = String(lit);
    if (hovered && now - titledAt >= meterTitleEveryMs) writeTitle(now);
    // Still moving while the tick is above the current peak and the floor (held, or falling), or the lamp is lit; and,
    // while hovered, until the tooltip has caught up with the last level.
    return (tick > level.peakDb && tick > scale.floor) || lit || (hovered && stale);
  };

  const run = () => {
    frame = undefined;
    if (paint(performance.now())) frame = requestAnimationFrame(run);
  };

  const wake = () => {
    if (frame === undefined && element !== null) frame = requestAnimationFrame(run);
  };

  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };

  return {
    attach(next: HTMLElement | null) {
      element = next;
      if (next === null) stop();
      else wake();
    },
    setScale(next: Scale) {
      const moved =
        next.floor !== scale.floor ||
        next.holdMs !== scale.holdMs ||
        next.fallDbPerS !== scale.fallDbPerS ||
        next.clipHoldMs !== scale.clipHoldMs;
      scale = next;
      if (moved) wake();
    },
    take: ([peak, rms]: readonly [number, number]) => {
      const now = performance.now();
      const peakDb = toDb(peak);
      const tick = tickAt(now);
      level.peakDb = peakDb;
      level.rmsDb = toDb(rms);
      if (peakDb >= tick) {
        level.heldDb = peakDb;
        level.heldAt = now;
      }
      if (peak >= scale.clipAt) level.clippedAt = now;
      stale = true;
      wake();
    },
    reset: () => {
      level = silent();
      stop();
      const now = performance.now();
      paint(now);
      if (hovered) writeTitle(now);
    },
    hover(on: boolean) {
      hovered = on;
      if (on) writeTitle(performance.now());
    },
  };
}

export function Meter({
  subscribe,
  read,
  orientation = "horizontal",
  floor = defaultMeterScale.floor,
  zones = defaultMeterScale.zones,
  holdMs = defaultMeterScale.holdMs,
  fallDbPerS = defaultMeterScale.fallDbPerS,
  clipAt = defaultMeterScale.clipAt,
  clipHoldMs = defaultMeterScale.clipHoldMs,
  label = "Level",
  labels,
  ref,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: MeterProps) {
  const { title } = { ...defaultMeterLabels, ...labels };
  const [painter] = useState(() => createPainter({ floor, holdMs, fallDbPerS, clipAt, clipHoldMs, title }));
  // Every render hands the painter the scale and words; a new scale redraws the level on it.
  useLayoutEffect(() => {
    painter.setScale({ floor, holdMs, fallDbPerS, clipAt, clipHoldMs, title });
  });
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      painter.attach(element);
    },
    [painter],
  );
  useLiveValue(subscribe, read, painter.take);
  useImperativeHandle(ref, () => ({ reset: painter.reset }), [painter]);

  const [mid, hot] = zones;
  const classes = className === undefined ? "pb-meter" : `pb-meter ${className}`;
  const zoneStyle = {
    ...style,
    "--pb-meter-mid-at": String(meterFraction(mid, floor)),
    "--pb-meter-hot-at": String(meterFraction(hot, floor)),
  } as CSSProperties;

  return (
    <div
      {...rest}
      ref={attach}
      className={classes}
      role="img"
      aria-label={label}
      data-orientation={orientation}
      data-peak="hidden"
      data-clipped="false"
      style={zoneStyle}
      onPointerEnter={(event) => {
        painter.hover(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        painter.hover(false);
        onPointerLeave?.(event);
      }}
    >
      <span className="pb-meter-track" aria-hidden="true">
        <span className="pb-meter-bar" />
        <span className="pb-meter-peak" />
      </span>
      <span className="pb-meter-lamp" aria-hidden="true" />
    </div>
  );
}
