# The graph layer

What patchbay has built of `/graph`, the parts an app draws its graph with. They keep the rules
every component keeps ([`components.md`](components.md#rules-every-component-keeps)); Storybook
shows every state of each under the base theme and the example brands, light and dark. The graph
stories draw two neutral node shapes: a level node (title "Tone 1", subtitle "oscillator", a `Pill`
status, outputs with a [`Meter`](#meter) each, a footer of badges) and a staged-edit node (title
"mix-2", subtitle "mixer", `change: "added"`, typed ports side by side, one with a problem, drawn
while a wire is dragged).

```ts
import "@xyflow/react/dist/style.css";
import { CanvasTools, ConnectHints, GhostWire, mergeFlowProps, Meter, NodeBox, nodeBoxSize, PortRow, useAddAt, useConnectHints, useFollowFit, Wire } from "@mcurcio/patchbay/graph";
```

Importing the layer loads its stylesheet (`dist/graph.css`) and imports `@xyflow/react` (React Flow
12.1.0 or newer, below 13: `useAddAt` reads the connection state `onConnectEnd` passes, first in
12.1.0), a peer dependency of this layer only: an app that uses `/graph` installs it, and loads React
Flow's own stylesheet as above. patchbay draws the nodes and edges React Flow places, and the
canvas's tools and hooks beside it (the hooks that need React Flow live here, not in `/hooks`), not a
wrapper around the canvas: the app renders React Flow's
`<ReactFlow>` itself, inside its `ReactFlowProvider`, turns its graph into React Flow nodes and
edges, lays them out (with the library it prefers, sizing nodes with [`nodeBoxSize`](#geometry))
and handles the events. `tokens.css` points React Flow's own variables at the tokens
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
| `hint?` | `"ok" \| "no" \| "origin" \| null`, open, while a wire is dragged: `origin` the handle the drag began at (an accent ring); `ok` accepts it (the dot in `--pb-ok`, grown to 12 px); `no` refuses it (the dot in `--pb-off`, the words muted, a not-allowed cursor); `null` no drag. One it does not know is drawn as `null`. Not given, the row takes its hint from the nearest [`<ConnectHints>`](#useconnecthints) (none outside one); given, even as `null`, it wins over that |
| `reason?` | Why `no`: the handle's and the row's tooltip while `hint` is `no`. A reason from `<ConnectHints>` comes first |
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

## `useConnectHints`

One rule for which ports may be joined, used both for the hints every [`PortRow`](#portrow) shows
while a wire is dragged and for React Flow's own check on the drop.

```tsx
const hints = useConnectHints(canConnect);
<ConnectHints value={hints.value}>
  <ReactFlow {...mergeFlowProps(hints.flowProps, { onConnect })} … />
</ConnectHints>
```

- **The rule.** `canConnect(from, to) → true | false | string`, where `PortRef` is
  `{ nodeId, handleId: string | null }` (`null` for a handle without an id). `from` is always the
  output and `to` the input, whichever end the drag began at. `true` accepts; `false` refuses; a
  string refuses and is the reason, which becomes the refusing handle's and row's tooltip. The
  newest `canConnect` is used; it need not be stable.
- **Once per candidate per drag.** Each pair's verdict is asked of the rule once between the drag's
  start and its end and kept, for the hints and the drop check alike; the next drag asks again.
  Outside a drag, React Flow's check asks the rule each time.
- **`flowProps`**: `onConnectStart`, `onConnectEnd` and `isValidConnection`, for `<ReactFlow>`. The
  check accepts only when `canConnect` says `true` for React Flow's source and target. The object
  is the same across renders. The hints' state changes twice per drag, at its start and its end,
  never per pointer move, so the rows re-render twice per drag.
- **`value`** goes to `<ConnectHints>`, a context every `PortRow` inside it reads (`null` while no
  wire is dragged): the handle the drag began at is `origin`; each handle on the other side `ok` or
  `no` with its reason; handles on the origin's side `null`, as they are not candidates in React
  Flow's strict connection mode. A row given its own `hint` keeps it. `value.origin` is the drag's
  `PortRef` and `side`; `value.hintFor(port, side)` is the hint for one handle, as `PortRow` asks.
- It draws nothing and has no keyboard path of its own: React Flow's connections are made with a
  pointer (or touch).

### `mergeFlowProps`

`mergeFlowProps(...objects)` joins the props several hooks and the app give `<ReactFlow>` into one
object. A handler given by more than one object calls each in order, with the same arguments;
`isValidConnection` accepts only when each accepts, stopping at the first that refuses. Any other
prop is the last object's that gives it, and an `undefined` object or prop gives nothing. It
returns a new object each call (its handlers new too); React Flow takes changed handlers as they
come.

## `Wire`

An edge type the app registers in `edgeTypes` (defined outside render, as React Flow asks); its
look arrives as the edge's `data`, a `WireData` (`type WireEdge = Edge<WireData, "wire">`).

```tsx
const edgeTypes = { wire: Wire, ghost: GhostWire };
const edge: WireEdge = { id, source, sourceHandle, target, targetHandle, type: "wire", data: { tone: "ok", emphasis } };
```

| `WireData` | What it is |
|---|---|
| `tone?` | [`Pill`](components.md#state)'s tones (`ok`, `warn`, `err`, `quiet`, `off`, `accent`, `muted`), the changes (`added` in `--pb-added`, `removed` in `--pb-removed`, `changed` in `--pb-warn`), `pending` (`--pb-quiet`) and `refused` (`--pb-err`); open. None, or one it does not know, is React Flow's edge stroke (`--xy-edge-stroke`, which `tokens.css` points at `--pb-muted`). Selected, the wire is `--pb-accent` whatever its tone |
| `emphasis?` | The signal's level, `0` to `1` (clamped; not a number is `0`): 1.5 px to 3.5 px thick and from 45 % to full opacity. None is the plain wire, 1.5 px at full opacity |
| `dashed?` | Dashes (6 on, 4 off): an edit not yet saved. A queued edit is `tone` (a change) and `dashed` |
| `flow?` | Round dots 12 px apart moving along the wire toward the input, one period per `--pb-motion-flow` |
| `arrow?` | An arrowhead at the input end, its tip on the handle and pointing into the node from the handle's side, 8 px long; drawn by `Wire` (not an SVG `<marker>`), so it takes the tone |
| `label?` | `ReactNode` at the midpoint, on the raised surface in `--pb-text-sm`, through React Flow's `EdgeLabelRenderer`; it takes no pointer events |
| `title?` | `string`: a `<title>` on the hit path, the wire's tooltip |

- **React Flow's edge.** The visible path is React Flow's `BaseEdge`, so it keeps
  `react-flow__edge-path` (`Wire` adds `pb-wire-path`) and the edge's `markerStart`, `markerEnd`
  and `style`. The hit path is `Wire`'s own, with the same `react-flow__edge-interaction` class
  and the edge's `interactionWidth` (20 px by default, none at 0), so it can carry the `<title>`.
  React Flow's wrapper keeps the edge's focus, selection and Delete key. The path is React Flow's
  bezier.
- **The level without a rebuild.** The path, the flow and the arrow are built only when an end, the
  flow, the arrow or the tooltip changes. The level is set as `--pb-wire-emphasis` on the wire's
  group (`.pb-wire`, which also carries `data-tone`, `data-selected`, `data-dashed` and
  `data-emphasis`), and the stylesheet draws the width and the opacity from it, so a new level
  restyles the path without touching it. It is the wire's own variable, not a token.
- **Motion.** A change of width or opacity takes `--pb-motion-fast`. The flow is an infinite
  animation, so under reduced motion its dots are not drawn at all. **Forced colours:** the stroke
  and the arrow in `CanvasText` (`Highlight` selected); the dashes and the arrow stay.

## `GhostWire`

A request on its way, before the app's graph holds the edge. The app adds it as an edge of type
`ghost` between the two handle ids, with `selectable`, `focusable` and `deletable` false, and
removes it when the request is answered: how long a refused one stays is the app's.
`data` is a `GhostWireData` (`type GhostWireEdge = Edge<GhostWireData, "ghost">`):

| `GhostWireData` | What it is |
|---|---|
| `tone?` | `"pending"` (the default: dashed in `--pb-quiet` at 60 % opacity) or `"refused"` (dashed in `--pb-err`, at full opacity); open, and one it does not know is drawn as `pending` |
| `label?` | `ReactNode` at the midpoint, through `EdgeLabelRenderer`, its border in the tone |

- It draws with React Flow's `BaseEdge` (`react-flow__edge-path`, plus `pb-ghost-wire-path`) and
  no hit path, and takes no pointer events: it is a sign of a request, not a thing to act on. Its
  drawing is `aria-hidden`; React Flow's wrapper names the edge as it names any.
- **Forced colours:** the dashes in `GrayText`, `CanvasText` when refused.

## `CanvasTools`

A canvas's tools, as a child of the app's `<ReactFlow>`: zoom in, zoom out, fit, and when the app
gives them, tidy and the minimap, as one [`ToolGroup`](components.md#layout) in React Flow's
`<Panel>` (one Tab stop, the arrow keys between the tools, 40 px tools on touch), and React Flow's
`<MiniMap>` while the minimap is on.

```tsx
const follow = useFollowFit({ key: layoutKey, onFitted });
<ReactFlow {...mergeFlowProps(follow.flowProps, addAt.flowProps)} … >
  <CanvasTools onFit={follow.fit} onTidy={tidy} minimap={minimap} onMinimap={setMinimap} />
</ReactFlow>
```

| Prop | What it is |
|---|---|
| `position?` | The panel's place, React Flow's `PanelPosition`: `"bottom-left"` by default. One it does not know is passed on, and React Flow places nothing |
| `fitOptions?` | React Flow's `FitViewOptions` for the fit tool |
| `onFit?` | Replaces the fit tool's own fit; pass `useFollowFit`'s `fit`, so the tool also follows again |
| `onTidy?` | The tidy tool, shown only when given: the layout is the app's |
| `minimap?`, `onMinimap?` | The minimap tool, shown only with `onMinimap(next)`, pressed (`aria-pressed`) while `minimap` is true; `<MiniMap>` is drawn while `minimap` is true, named by the tool's word |
| `minimapNodeClassName?` | `string` or `(node) → string`, React Flow's `<MiniMap nodeClassName>`, so the app colours the minimap by its nodes' state |
| `keyShortcuts?` | Partial `{ zoomIn, zoomOut, fit, tidy, minimap }` of `aria-keyshortcuts` values: the app's own bindings, set on the tools and shown in their tooltips ("Fit the view (F)"), not bound |
| `labels?` | Partial `CanvasToolsLabels` `{ toolbar, zoomIn, zoomOut, fit, tidy, minimap }`; the defaults, `defaultCanvasToolsLabels`, are "Canvas", "Zoom in", "Zoom out", "Fit the view", "Tidy the layout" and "Minimap" |
| `className?` | Added to the panel's `pb-canvas-tools` |
| `children?` | More tools (`IconButton`s) after patchbay's, in the same group |

- **Motion.** Zoom and the fit tool's own fit move over `--pb-motion-slow`, read from the canvas's
  element at each move, so a brand's duration holds and reduced motion (where `tokens.css` sets it
  to 0 ms) moves at once; without the tokens loaded, 180 ms, or none under reduced motion.
- The minimap is React Flow's, coloured by `tokens.css`'s `--xy-minimap-*` map, framed in
  `--pb-line` with the group's radius and shadow (`pb-canvas-minimap`). **Forced colours:** the
  frame in `CanvasText`.
- The glyphs are SVG, hidden from screen readers; each tool is named by its word.

## `useAddAt`

Adding a node at a place on the canvas: `useAddAt(onAddAt, options?)` → `{ flowProps }`.

- **`onAddAt(point, from?)`.** `point` is in flow coordinates (React Flow's
  `screenToFlowPosition`). A double-click on empty canvas gives no `from`. A wire dropped on empty
  canvas, where no handle took it, gives `from`, the [`PortRef`](#useconnecthints) the wire began
  at with its `side` (`"output"` or `"input"`). What to add, and whether to join it, is the app's.
- **Only empty canvas.** A double-click counts only on React Flow's pane, not on a node, an edge, a
  handle or a panel; a drop counts only where no handle took it (React Flow's `toHandle` is none)
  and the pane is under the drop. A touch drop's point is read from `changedTouches`, and the
  element under it from the page, as a touch's end is on the element it began on.
- **`flowProps`**: `onDoubleClick`, `onConnectStart`, `onConnectEnd` and `zoomOnDoubleClick:
  false`, for `<ReactFlow>` (with others through [`mergeFlowProps`](#mergeflowprops)). React Flow's
  zoom on double-click stays off, as the double-click is the add. The object is the same across
  renders, and the newest `onAddAt` is called.
- **`options.enabled`** (`true`) switches adding off, as while the graph is read-only: neither a
  double-click nor a drop adds, and a double-click does not zoom either.
- A double-click has no keyboard path; the app's own add command (a palette entry, a button) is
  that path.

## `useFollowFit`

Keeping the whole graph in view until the person takes the view over:
`useFollowFit({ key, fitOptions?, onFitted? })` → `{ following, fit, flowProps }`.

- **Following** (from the start), the view fits again whenever `key` changes (`Object.is`; the
  app's value that changes when nodes are added, removed or laid out) and whenever the canvas
  changes size, each time once every shown node is measured. These fits are instant.
- **The person's move stops it.** `flowProps` holds `onMoveStart`: a move with an event (a drag, a
  wheel, a pinch) sets `following` to false; a move made by code has none and changes nothing, so
  CanvasTools' zoom tools do not stop following. `fit()` fits now, moving as the fit tool does (over
  `--pb-motion-slow`), and follows again.
- **`onFitted(viewport)`** is called after each fit has landed, in the frame after the viewport is
  set, with React Flow's viewport: an app, or its browser tests, can mark the layout ready on it
  instead of waiting on a timer. With no node there is nothing to fit; the view stays, and
  `onFitted` is still called.
- `fitOptions` (React Flow's `FitViewOptions`) apply to every fit, the newest each time.
