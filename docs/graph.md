# The graph layer

What patchbay has built of `/graph`, the parts an app draws its graph with. They keep the rules
every component keeps ([`components.md`](components.md#rules-every-component-keeps)); Storybook
shows every state of each under the base theme and the example brands, light and dark.

```ts
import { Meter } from "@mcurcio/patchbay/graph";
```

Importing the layer loads its stylesheet (`dist/graph.css`). The parts that sit inside React Flow's
canvas will need `@xyflow/react` (a peer dependency of this layer only); `Meter` does not, so an app
can use it without React Flow installed.

## `Meter`

A level bar on a decibel scale: the bar is the RMS, a tick is the held peak, and a lamp at the
full end lights when the signal clips. It is painted through refs and never re-renders through
React for a level: it reads its source through [`useLiveValue`](components.md#uselivevalue).

```tsx
<Meter subscribe={levels.subscribe} read={() => levels.get(portId)} label="Left output" ref={meter} />
```

| Prop | What it is |
|---|---|
| `subscribe` | `(listener) => unsubscribe`: the listener means a new value is ready to read |
| `read` | `() => readonly [peak, rms]`, linear amplitude, 1.0 being 0 dBFS. Not a number, or 0 and below, is silence |
| `orientation?` | `"horizontal"` (the default) or `"vertical"`; open, and one it does not know is drawn horizontal |
| `floor?` | dBFS at the bar's empty end, -60. The full end is 0 dBFS |
| `zones?` | `[mid, hot]` in dBFS, `[-18, -6]`: below `mid` the bar is `--pb-meter-low`, from `mid` `--pb-meter-mid`, from `hot` `--pb-meter-hot` |
| `holdMs?` | 1500: the tick (`--pb-meter-peak`) holds the highest peak this long |
| `fallDbPerS?` | 20: then the tick falls at this rate until it meets the current peak, which it then rides |
| `clipAt?` | 1.0 (0 dBFS), linear: a peak at or above it lights the clip lamp (`--pb-meter-hot`) |
| `clipHoldMs?` | 2000: how long the lamp stays lit after the last such peak |
| `label?` | Its accessible name (`role="img"`), "Level" by default; the numbers are never announced |
| `title?` | `(peakDb, rmsDb, clipped) => string`, the tooltip; `defaultMeterTitle` reads "peak -12.0 dB, rms -18.3 dB" (−∞ for silence) |
| `ref?` | A `MeterHandle`: `reset()` empties the bar and clears the hold and the lamp, as when the source closes |

Other native `<div>` props (`className`, `id`, `data-*`, pointer handlers) pass through.

- **The scale.** A level's place on the bar is `(dB - floor) / -floor`, clamped to the bar
  (`meterFraction`); `toDb` turns a linear amplitude into dBFS. `defaultMeterScale` holds the
  defaults above. A tick below the floor is not drawn.
- **Moving.** Times come from `performance.now()`, a monotonic clock. A new value asks for one
  animation frame; frames go on only while something moves: a held tick that will fall, a falling
  tick, a lit lamp counting down, or a tooltip not yet caught up with the level while hovered.
  When all is still, no frame is asked for. A new floor, hold, fall or lamp time redraws the level
  on it.
- **The tooltip** is written on pointer entry and then at most every 250 ms while the pointer stays
  (`meterTitleEveryMs`); it is never written while nobody hovers.
- **Size.** Horizontal fills its container's width (48 px when the container gives none) and is 6
  px thick, the lamp a 6 px square at the right end; vertical is 6 px wide and fills its
  container's height (48 px at least), filling from the bottom with the lamp on top. The zones keep
  their places along the bar: the bar is drawn whole and clipped to the level.
- **Its CSS variables.** It sets four fractions on its element, 0 at the floor and 1 at 0 dBFS:
  `--pb-meter-level` and `--pb-meter-tick` as the level moves, `--pb-meter-mid-at` and
  `--pb-meter-hot-at` from `zones`. They are its own, not tokens; a brand changes the meter's
  colours through the meter tokens ([`tokens.md`](tokens.md#the-tokens)).
- **Reduced motion.** The level is information, not decoration, so it still moves; nothing else
  animates. **Forced colours:** the bar in `Highlight`, the tick and the lit lamp in `CanvasText`,
  the track and an unlit lamp outlined in `CanvasText`.
- It takes no focus and has no keyboard path of its own: it shows, and does nothing.
