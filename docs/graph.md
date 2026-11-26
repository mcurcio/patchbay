# The graph layer

What patchbay has built of `/graph`, the parts an app draws its graph with. They keep the rules
every component keeps ([`components.md`](components.md#rules-every-component-keeps)); Storybook
shows every state of each under the base theme and the example brands, light and dark.

```ts
import "@xyflow/react/dist/style.css";
import { Meter, NodeBox, nodeBoxSize, PortRow } from "@mcurcio/patchbay/graph";
```

Importing the layer loads its stylesheet (`dist/graph.css`) and imports `@xyflow/react` (React Flow
12), a peer dependency of this layer only: an app that uses `/graph` installs it, and loads React
Flow's own stylesheet as above. patchbay draws the nodes React Flow places, not a wrapper around the
canvas: the app renders React Flow's `<ReactFlow>` itself, turns its graph into React Flow nodes,
lays them out and handles the events. `tokens.css` points React Flow's own variables at the tokens
([`tokens.md`](tokens.md#the-tokens)).

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

## Geometry

An app sizes its nodes before they render (dagre and ELK take sizes), so a node box's sizes are
fixed: exported constants, mirrored by `tokens.css` tokens of the same values that a brand may not
set. `NodeBox` and `PortRow` size themselves from the tokens; layout code reads the constants.

| Constant | Token | px | What it is |
|---|---|---|---|
| `NODE_WIDTH` | `--pb-node-width` | 240 | The default width; `NodeBox`'s `width` overrides it per node |
| `NODE_HEADER` | `--pb-node-header` | 46 | The header (title and subtitle), with or without a subtitle |
| `NODE_LINE` | `--pb-node-line` | 22 | The `line` row, when there is one |
| `NODE_ROW` | `--pb-node-row` | 22 | One port row |
| `NODE_PAD` | `--pb-node-pad` | 8 | Above the first port row and below the last |
| `NODE_FOOTER` | `--pb-node-footer` | 28 | The footer, when there is one |
| `HANDLE_SIZE` | `--pb-node-handle` | 10 | A handle's dot |
| `HANDLE_HIT` | `--pb-node-handle-hit` | 20 | A handle's hit area, centred on the dot; 32 on a touch screen |

`nodeBoxSize({ inputs, outputs, ports, line, footer, width? }) → { width, height }` is the one
formula, from counts and presences: `NODE_HEADER`, plus `NODE_LINE` with a line, plus
`2 × NODE_PAD + rows × NODE_ROW` when there are ports (rows is inputs plus outputs stacked, the
larger of the two side by side; a layout it does not know is stacked), plus `NODE_FOOTER` with a
footer. The box's 1 px border is inside these sizes; the selection ring is an outline outside them.

```ts
const { width, height } = nodeBoxSize({ inputs: 1, outputs: 2, ports: "stacked", line: false, footer: true });
```

- **The tests.** `src/graph/node-box/geometry.test.ts` holds each token equal to its constant;
  `tokens.test.ts` fails on an example brand that sets a `--pb-node-*` token; the `All` stories of
  `NodeBox` measure rendered boxes in Chromium, under each example brand, against `nodeBoxSize`.
- **Touch.** A touch screen's 36 px target rule has one exception here: handles sit 22 px apart, so
  their hit area grows to 32 px (`--pb-node-handle-hit` under `(hover: none) and (pointer:
  coarse)`), and React Flow's `connectionRadius` finishes a drop near a handle.

## `NodeBox`

The body of an app's own node type: the app writes a node component that maps its data onto
`NodeBox` and registers it in `nodeTypes` (defined outside render, as React Flow asks). It renders
inside a React Flow node.

```tsx
function SourceBox({ data, selected }: NodeProps<SourceNode>) {
  return <NodeBox title={data.name} subtitle={data.kind} selected={selected} outputs={data.outputs} />;
}
const nodeTypes = { source: SourceBox };
```

| Prop | What it is |
|---|---|
| `title` | `ReactNode`, one line, cut with an ellipsis; a string is also the header's tooltip. It names the box's group |
| `subtitle?` | `ReactNode`, the second header line in `--pb-muted` (the type) |
| `tone?` | `"ok" \| "warn" \| "err" \| "quiet" \| "off" \| "accent" \| "muted"`, open: a 4 px stripe down the box's start edge in the tone's token. None, or a tone it does not know, draws it in `--pb-line-strong` |
| `disabled?` | A dashed border, the stripe hatched (the tone and the surface in stripes), the words in `--pb-muted`. Drawing only: whether its ports still connect is the app's rule |
| `failed?` | The border in `--pb-err`, the header on `--pb-err-soft` and the line in `--pb-err`; the reason goes in `line`. With `disabled`, both looks |
| `change?` | `"added" \| "removed" \| "renamed" \| "changed"`, open: an edit not yet applied. A 2 px border in `--pb-added`, `--pb-removed`, `--pb-renamed` or `--pb-warn`, drawn inward so the size holds, and a [`Badge`](components.md#state) of the same tone in the header with the change's word, so it never rests on colour; `removed` also strikes the title through. A change it does not know: a `--pb-line-strong` border, and the string itself as the badge's word |
| `changeLabels?` | Partial `{ added, removed, renamed, changed }`, English defaults (`defaultChangeLabels`) |
| `status?` | Slot at the header's end (a `Pill`) |
| `line?` | `ReactNode`, one row under the header saying why the node is silent: `--pb-muted`, `--pb-err` when `failed`; one line, ellipsis; a string is also its tooltip |
| `inputs?`, `outputs?` | `PortSpec[]`: each [`PortRow`](#portrow)'s props without `side` (`NodeBox` sets it), keyed by `id` |
| `ports?` | `"stacked"` (the default: the inputs' rows, then the outputs') or `"side-by-side"` (two columns, the inputs on the left and the outputs on the right, row *n* of each on one line), open; one it does not know is stacked |
| `footer?` | Slot: one row at the foot (badges), above a `--pb-line` rule |
| `selected?` | From `NodeProps`: a 2 px outline in `--pb-accent` |
| `width?` | px, `NODE_WIDTH` by default |

Other native `<div>` props (`className`, `data-*`, `ref`) pass through to the root.

- **Focus and keys.** The root is `role="group"`, named by the title (`aria-labelledby`). React
  Flow's node wrapper keeps the focus, the selection, the dragging and the Delete key; it draws no
  focus ring, so the box draws one, 2 px in the accent and 2 px clear of the box, while the wrapper
  has `:focus-visible`. `NodeBox` adds no tab stop beyond what its slots hold.
- **Measuring.** When its ordered list of port ids or its `ports` layout changes, `NodeBox` calls
  React Flow's `updateNodeInternals` for its own node (`useNodeId`), so a handle added or moved is
  measured and a wire to it is drawn; React Flow measures a node's handles itself when it first
  renders.
- **Motion.** Only the selection's colour moves, at `--pb-motion-fast` (0 ms under reduced motion).
  **Forced colours:** the stripe and the border in `CanvasText` (hatched for disabled), the change
  keeping its word in the badge, the selection in `Highlight`.

## `PortRow`

One port: its handle at the box's edge and its words. `NodeBox` draws its rows with it; an app
drawing a box of its own may use it alone, inside a React Flow node.

| Prop | What it is |
|---|---|
| `id` | The handle id, passed to React Flow's `<Handle id>` unchanged (the app's own scheme) |
| `side` | `"input"` (a `target` handle on the left edge) or `"output"` (a `source` handle on the right). React Flow's positions are physical, so right-to-left text does not mirror the handles; the row's words follow its handle |
| `label` | `ReactNode`, the port's name; a string is also the row's tooltip |
| `typeLabel?` | `ReactNode`, after the label in `--pb-muted`, the code face (the port's type) |
| `hint?` | `"ok" \| "no" \| "origin" \| null`, open, while a wire is dragged: `origin` the handle the drag began at (an accent ring); `ok` accepts it (the dot in `--pb-ok`, grown to 12 px); `no` refuses it (the dot in `--pb-off`, the words muted, a not-allowed cursor); `null` (the default) no drag. One it does not know is drawn as `null` |
| `reason?` | Why `no`: the handle's and the row's tooltip while `hint` is `no` |
| `problem?` | `string`: a [`WarnMark`](components.md#state) beside the label, with this as its words |
| `trailing?` | Slot at the row's inner end, toward the box's centre (a [`Meter`](#meter)) |
| `connectable?` | `true` by default; `<Handle isConnectable>` |

- **React Flow's handle.** Its classes (`react-flow__handle`, `source`, `target`,
  `connectable…`, `react-flow__handle-left` or `-right`) stay, so its connection logic and
  `connectionRadius` work as on any handle; `PortRow` adds `pb-port-handle` and `data-hint`, and
  `data-side` and `data-hint` on the row.
- **Size.** The row is `--pb-node-row` high. The handle is the hit area, `--pb-node-handle-hit`
  square and transparent, centred on the box's edge; its dot is `--pb-node-handle`, drawn in React
  Flow's handle colours (`--xy-handle-*`, which `tokens.css` points at the tokens).
- **Motion.** The hint's change of size and colour is at `--pb-motion-fast`, none under reduced
  motion. **Forced colours:** the dot in `CanvasText`; a hint shows as the dot's border,
  `Highlight` for `ok` and `origin`, `GrayText` for `no`.

