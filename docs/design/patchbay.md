# patchbay: design

This page is the design for the first version's unbuilt parts; when a part is built, what lasts of it moves into the library docs and is
deleted from here (the rule in [`AGENTS.md`](../../AGENTS.md#docs)).

## 1. What patchbay is

patchbay is a React component library for apps that draw a live graph (nodes, ports and the wires
between them) and let a person edit it: patch editors, pipeline and workflow builders, signal-flow
and routing tools, dashboards over a running engine. It draws with React Flow and themes with CSS
custom properties.

**A library, not a framework.** A library is code the app calls; a framework calls the app.
patchbay draws and handles interaction; each app keeps what gives the drawing its meaning:

| patchbay owns | Each app owns |
|---|---|
| Design tokens, the light and dark themes, and the brand mechanism | Its brand, its protocol client and its data types |
| Primitives, composites and graph components that draw what they are given | Its graph store, and turning its data into patchbay's props |
| `AppShell`: the layout of a graph-editing app and the sizes it keeps | Its editing model (apply each edit at once, or queue edits until a save) |
| UI-only hooks: theme, shortcuts, toasts, kept preferences, live values | Graph layout, routing, and every word about its own domain |
| The words patchbay needs by default (overridable) | |

*Why not a framework:* transport, commit model, port typing and lifecycle differ from one app to
the next, and a framework would have to own all of them.

**One look, each app its own variation.** One structure and one set of interactions; an app's brand
changes the accent, the state hues where it needs to, the density and the type
([`docs/tokens.md`](../tokens.md)).

## 2. Rules every component keeps

Built: [`docs/components.md`](../components.md#rules-every-component-keeps).

## 3. Tokens, themes and brands

Built: [`docs/tokens.md`](../tokens.md).

## 4. The components

Four layers, each a subpath export ([§6](#6-packaging-and-releases)). Props are sketches; each
lands with its stories and its tests, and the final names are settled there.

### 4.1 Primitives (`/primitives`)

Built: [`docs/components.md`](../components.md#primitives-primitives).

### 4.2 Composites (`/composites`)

`Banner`, `StatusWords`, `Toaster`, `DiffView`, `CommandPalette` and `ShortcutSheet` are built:
[`docs/components.md`](../components.md#composites-composites). Still to build:

| Component | Props (sketch) |
|---|---|
| `CodeEditor` | `value`, `onChange`, `language?: "knobly"`, `highlight?: (text) => spans`, `diagnostics?: { line, column?, severity, message }[]`, `readOnly?`, `onCaret?` |
| `CodeText` | `value`, `language?` or `highlight?` (read-only, highlighted) |
| `SchemaForm` | Deferred by the owner (2026-11-26), not in the first version. `schema` (JSON Schema subset), `value`, `onChange`, `errors?`, `fieldSlot?` |

**Highlighting.** `CodeEditor` and `CodeText` highlight [knobly](https://github.com/mcurcio/knobly)
configuration text built in (`language: "knobly"`), through the optional `knobly` peer dependency,
loaded only by `/composites` and only when that language is asked for. Any other language comes
through `highlight`, a function from the text to coloured spans, so an app brings its own
highlighter. The diagnostics shape is generic: an app maps its own errors onto it.

### 4.3 Shell (`/shell`)

`AppShell` is the usual layout of a graph editor: a top bar, the canvas, an inspector on the right
and a drawer along the bottom:

```tsx
<AppShell
  topBar={{ brand, status, start, end }}           // slots, left to right
  inspector={{ content, width, onWidth, open, onOpen }}
  drawer={{ header, content, height, onHeight, open, onOpen }}
>
  {canvas}
</AppShell>
```

- Sizes are bounded (inspector 280–560 px, drawer 120 px to 70 % of the window) and dragged by a
  `Splitter`.
- **Narrow windows:** below 760 px the inspector is a sheet over the canvas's right edge; below
  600 px it rises from the bottom (at most 62 % of the workspace). Escape closes it after the
  palette and the shortcut sheet.
- **The whole screen:** `100dvh`, padded by the safe-area insets (`viewport-fit=cover`).
- The shell keeps no data. Its sizes and open states are props; `usePersistentState`
  ([`docs/components.md`](../components.md#usepersistentstate)) is how an app keeps them.

### 4.4 Graph (`/graph`)

On React Flow 12 (a peer dependency of `/graph` only). patchbay provides the node and edge
components and sugar for the canvas, not a wrapper around it: the app renders React Flow's own
`<ReactFlow>`, so every React Flow prop and future feature stays within reach, turns its graph into
React Flow nodes and edges, lays them out and handles the events (decided by the owner,
2026-11-25). Only `/graph` imports `@xyflow/react`; the hooks below that need React Flow live in
`/graph`, not `/hooks`.

The props below are settled for build (owner, 2026-11-26: patchbay's model is the standard, the
correct general model rather than one app's habits). Each part keeps the rules every component
keeps (open enums drawn neutrally, slots over flags, tokens only, words as props with English
defaults, keyboard, touch, reduced motion and forced colours); what is built moves to
[`docs/graph.md`](../graph.md), where `Meter` already is. The props were checked against two
neutral node shapes, which the stories draw:

- **A level node**: title "Tone 1", subtitle "oscillator", a `Pill` status, two outputs ("left",
  "right"), each with a [`Meter`](../graph.md#meter) as its trailing slot, and a footer of badges
  ("48 kHz", "2 ch").
- **A staged-edit node**: title "mix-2", subtitle "mixer", `change: "added"`, typed ports
  ("in · audio", "side · control", "out · audio") with inputs and outputs side by side, one port
  with a problem, drawn while a wire is dragged (its ports' hints).

#### Supported React Flow

`@xyflow/react` 12.1.0 or newer, below 13. `useAddAt` reads the connection state that
`onConnectEnd` passes, first in 12.1.0, so the peer range narrows from `^12.0.0` to `^12.1.0`
when `/graph` ships. `tokens.css`'s `--xy-*` map sets 18 of React Flow's variables; every one is
declared in React Flow's stylesheet from 12.0.0 through 12.12.1, whose variable sets are identical
(85 names; checked 2026-11-26). The check that keeps this true (pb-nx9.39) is a unit test that
every `--xy-*` name `tokens.css` sets is declared in the installed React Flow's `style.css`, run
against the dev dependency, kept at the newest supported minor; `docs/tokens.md` states the range.

#### Geometry

An app sizes its nodes before they render (dagre and ELK take sizes), so a node box's geometry is
fixed: exported constants, mirrored by tokens of the same values that a brand may not change. A
unit test holds each token equal to its constant, and the brand tests fail on a brand that sets
one. Components size themselves from the tokens; layout code reads the constants.

| Constant | Token | Value | What it is |
|---|---|---|---|
| `NODE_WIDTH` | `--pb-node-width` | 240 | The default width; `NodeBox`'s `width` prop overrides it per node |
| `NODE_HEADER` | `--pb-node-header` | 46 | The header (title and subtitle), with or without a subtitle |
| `NODE_LINE` | `--pb-node-line` | 22 | The `line` row, when there is one |
| `NODE_ROW` | `--pb-node-row` | 22 | One port row |
| `NODE_PAD` | `--pb-node-pad` | 8 | Above the first port row and below the last |
| `NODE_FOOTER` | `--pb-node-footer` | 28 | The footer, when there is one |
| `HANDLE_SIZE` | `--pb-node-handle` | 10 | A handle's dot |
| `HANDLE_HIT` | `--pb-node-handle-hit` | 20 | A handle's hit area, centred on the dot (32 on touch) |

`nodeBoxSize({ inputs, outputs, ports, line, footer, width? }) → { width, height }` (counts and
presences) is the one formula: `NODE_HEADER`, plus `NODE_LINE` with a line, plus
`2 × NODE_PAD + rows × NODE_ROW` when there are ports (rows is inputs plus outputs when stacked,
the larger of the two side by side), plus `NODE_FOOTER` with a footer. The box is
`box-sizing: border-box`, so its 1 px border is inside these sizes; the selection ring is an
outline outside them. A story measures a rendered box in Chromium against `nodeBoxSize`.
`--pb-row` stays the compact control's height (buttons, icon buttons), which a brand may change;
`docs/tokens.md` drops "a port row's height" from it when `NodeBox` ships.

A touch screen's 36 px target rule has one exception here: handles sit 22 px apart, so their hit
area grows to 32 px on touch and React Flow's `connectionRadius` finishes a drop near a handle.

#### `NodeBox`

The body of the app's own node type: the app writes a node component that maps its data onto
`NodeBox` and registers it in `nodeTypes` (defined outside render, as React Flow asks).

```tsx
function SourceBox({ data, selected }: NodeProps<SourceNode>) {
  return (
    <NodeBox title={data.name} subtitle={data.kind} selected={selected} inputs={…} outputs={…} />
  );
}
const nodeTypes = { source: SourceBox };
```

| Prop | Settled |
|---|---|
| `title` | `ReactNode`, one line, cut with an ellipsis; a string is also the header's tooltip |
| `subtitle?` | `ReactNode`, the second header line in `--pb-muted` (the type) |
| `tone?` | `"ok" \| "warn" \| "err" \| "quiet" \| "off" \| "accent" \| "muted" \| (string & {})`: a 4 px stripe down the box's start edge, in the tone's token. None, or a tone it does not know, draws the stripe in `--pb-line-strong` |
| `disabled?` | A dashed border, the stripe hatched (the tone and the surface in stripes), the words in `--pb-muted`. Drawing only: whether its ports still connect is the app's rule |
| `failed?` | The border in `--pb-err` and the header on `--pb-err-soft`; the reason goes in `line`. With `disabled`, both looks |
| `change?` | `"added" \| "removed" \| "renamed" \| "changed" \| (string & {})`, an edit not yet applied: a 2 px border in `--pb-added`, `--pb-removed`, `--pb-renamed` or `--pb-warn` (2 px drawn inward, so the size holds) and a `Badge` of the same tone in the header with the change's word, so it never rests on colour; `removed` also strikes the title through. A change it does not know: a `--pb-line-strong` border and the string itself as the badge's word |
| `changeLabels?` | Partial `{ added, removed, renamed, changed }`, English defaults (`defaultChangeLabels`) |
| `status?` | Slot at the header's end (a `Pill`) |
| `line?` | `ReactNode`, one row under the header saying why the node is silent: `--pb-muted`, `--pb-err` when `failed`; one line, ellipsis, a string is also its tooltip |
| `inputs?`, `outputs?` | `PortSpec[]`: each `PortRow`'s props without `side` (`NodeBox` sets it), keyed by `id` |
| `ports?` | `"stacked" \| "side-by-side"` (open; one it does not know is stacked). Stacked: the inputs' rows, then the outputs'. Side by side: two columns, the inputs at the start and the outputs at the end, row *n* of each on one line |
| `footer?` | Slot: one row at the foot (badges) |
| `selected?` | From `NodeProps`: a 2 px outline in `--pb-accent` |
| `width?` | Number of px, `NODE_WIDTH` by default |
| others | Native `div` props pass through to the root (`className`, `data-*`, `ref`) |

- The root is `role="group"` named by the title. React Flow's node wrapper keeps the focus, the
  selection, the dragging and the Delete key; `NodeBox` adds no tab stop of its own beyond what its
  slots hold.
- When its ordered list of port ids or its `ports` layout changes, `NodeBox` calls React Flow's
  `updateNodeInternals` for its node itself (`useNodeId`), so handles added or moved are measured;
  it must render inside a React Flow node.
- Forced colours: the stripe and the change are borders (`CanvasText`, `Highlight` for selected)
  and the change keeps its word. Only the selection's colour moves, at `--pb-motion-fast`.

#### `PortRow`

One port: its handle at the box's edge and its words. `NodeBox` draws its rows with it; an app
drawing a box of its own may use it alone, inside a React Flow node.

| Prop | Settled |
|---|---|
| `id` | The handle id, passed to React Flow's `<Handle id>` unchanged (the app's own scheme) |
| `side` | `"input" \| "output"`: an input is a `target` handle on the left edge, an output a `source` handle on the right. React Flow's positions are physical, so right-to-left text does not mirror them |
| `label` | `ReactNode`, the port's name; a string is also its tooltip |
| `typeLabel?` | `ReactNode`, after the label in `--pb-muted`, the code face (the port's type) |
| `hint?` | `"ok" \| "no" \| "origin" \| null \| (string & {})`, while a wire is dragged: `origin` the handle the drag began at (accent ring); `ok` accepts it (the dot in `--pb-ok`, grown to 12 px); `no` refuses it (the dot in `--pb-off`, the words muted, a not-allowed cursor); `null` no drag. One it does not know is drawn as `null`. Given, it wins over `useConnectHints`' context |
| `reason?` | Why `no`: the handle's and the row's tooltip while `hint` is `no` |
| `problem?` | `string`: a `WarnMark` beside the label, with this as its words |
| `trailing?` | Slot at the row's inner end, toward the box's centre (a `Meter`) |
| `connectable?` | `true` by default; `<Handle isConnectable>` |

- React Flow's handle classes (`react-flow__handle`, `source`, `target`, `connectable…`) are kept,
  so its connection logic and `connectionRadius` work as on any handle; `PortRow` adds
  `pb-port-handle` and `data-hint`.
- The dot is `HANDLE_SIZE` with a `HANDLE_HIT` hit area (32 px on touch). The hint's change of
  size and colour is at `--pb-motion-fast`, none under reduced motion; under forced colours the
  hint shows as the dot's border (`Highlight` for ok and origin, `GrayText` for no).

#### `useConnectHints`

One rule for which ports may be joined, used both for the hints while a wire is dragged and for
React Flow's own check on the drop.

```tsx
const hints = useConnectHints(canConnect);
<ConnectHints value={hints.value}>
  <ReactFlow {...mergeFlowProps(hints.flowProps, addAt.flowProps)} … />
</ConnectHints>
```

- `canConnect(from: PortRef, to: PortRef) → true | false | string`, where
  `PortRef = { nodeId, handleId: string | null }`. `from` is always the output and `to` the input,
  whichever end the drag began at. `true` accepts; `false` refuses; a string refuses and is the
  reason. Called at most once per candidate handle per drag.
- `flowProps`: `onConnectStart`, `onConnectEnd` and `isValidConnection` (`canConnect(...) === true`
  on React Flow's source and target), for `<ReactFlow>`. State changes twice per drag, at its start
  and end, never per pointer move.
- `value` goes to `<ConnectHints>`, a context every `PortRow` reads: the origin is `origin`, each
  handle on the other side `ok` or `no` with its reason, handles on the origin's side `null` (not
  candidates, in React Flow's strict connection mode).
- `mergeFlowProps(...objects)`: one object whose handlers call each object's handler in order, for
  `useConnectHints`, `useAddAt`, `useFollowFit` and the app's own.

#### `Wire` and `GhostWire`

Edge types the app registers in `edgeTypes`; their props arrive as React Flow's edge `data`
(`WireData`, `type WireEdge = Edge<WireData, "wire">`). Both draw with React Flow's `BaseEdge`, so
its `react-flow__edge-path` and `react-flow__edge-interaction` classes, its interaction width and
its selection stay. The path is React Flow's bezier, rebuilt only when an end moves.

| `WireData` | Settled |
|---|---|
| `tone?` | `Pill`'s tones, the changes (`added`, `removed`, `changed` in `--pb-warn`), `pending` (`--pb-quiet`) and `refused` (`--pb-err`); open. None, or one it does not know, is `--xy-edge-stroke` (`--pb-muted`). Selected: `--pb-accent` |
| `emphasis?` | `0..1` (clamped; not a number is 0): the signal's level as thickness (1.5 px to 3.5 px) and brightness, set as `--pb-wire-emphasis` on the edge, so a change of level restyles without rebuilding the path |
| `dashed?` | Dashes: an edit not yet saved |
| `flow?` | Dots move along the wire toward the input, one cycle per `--pb-motion-flow`; under reduced motion the dots are not drawn |
| `arrow?` | An arrowhead at the input end, drawn by `Wire` facing the handle's side (not an SVG `<marker>`, so CSS colours it with the tone) |
| `label?` | `ReactNode` at the midpoint, on the raised surface in `--pb-text-sm`, through React Flow's `EdgeLabelRenderer`; it takes no pointer events |
| `title?` | `string`, a `<title>` on the interaction path: the wire's tooltip |

- A wire drawn by its signal's level and a dashed wire for an edit not yet saved are one `Wire`
  with different props; a queued edit is drawn with `tone` (a change) and `dashed`.
- Forced colours: the stroke is `CanvasText` (`Highlight` selected); dashes and the arrow stay.

**`GhostWire`**: a request on its way, before the app's graph holds the edge. The app adds it as an
edge of type `ghost` between the two handle ids, with `selectable`, `focusable` and `deletable`
false; `data: { tone?: "pending" | "refused" | (string & {}), label? }` (`pending` by default,
dashed in `--pb-quiet` at reduced opacity; `refused` in `--pb-err`; one it does not know as
`pending`). It takes no pointer events. How long a refused one stays is the app's: it removes the
edge.

#### Canvas sugar: `CanvasTools`, `useAddAt`, `useFollowFit`

Beside the app's own `<ReactFlow>`, inside its `ReactFlowProvider`.

**`CanvasTools`**, a child of `<ReactFlow>`: a `ToolGroup` (one Tab stop, arrow keys between
tools, 40 px tools on touch) in React Flow's `<Panel>`, and React Flow's `<MiniMap>` while the
minimap is on.

| Prop | Settled |
|---|---|
| `position?` | The panel's `PanelPosition`, `"bottom-left"` |
| `fitOptions?` | React Flow's `FitViewOptions` for the fit tool |
| `onFit?` | Replaces the fit tool's own `fitView` (pass `useFollowFit`'s `fit`, so the tool also resumes following) |
| `onTidy?` | The tidy tool, shown only when given (the layout is the app's) |
| `minimap?`, `onMinimap?` | The minimap tool (`aria-pressed`), shown only with `onMinimap`; `<MiniMap>` drawn while `minimap` is true |
| `minimapNodeClassName?` | `string \| (node) → string`, passed to `<MiniMap nodeClassName>`, so the app colours the minimap by its nodes' state |
| `keyShortcuts?` | Partial `{ zoomIn, zoomOut, fit, tidy, minimap }` of `aria-keyshortcuts` strings: the app's own bindings, shown, not bound |
| `labels?` | Partial `{ toolbar, zoomIn, zoomOut, fit, tidy, minimap }`, English defaults (`defaultCanvasToolsLabels`: "Canvas", "Zoom in", "Zoom out", "Fit the view", "Tidy the layout", "Minimap") |
| `children?` | More tools (`IconButton`s) after patchbay's |

Zoom and fit move over `--pb-motion-slow`'s 180 ms, at once under reduced motion.

**`useAddAt(onAddAt, options?)`** → `{ flowProps }`. `onAddAt(point, from?)`: `point` in flow
coordinates; `from` a `PortRef` plus `side` when a wire was dropped on empty canvas, absent for a
double-click on empty canvas. `flowProps` holds `onDoubleClick` (only on the pane, not on a node,
edge or panel), `onConnectStart`, `onConnectEnd` (a drop where no handle took it, on the pane; a
touch drop reads `changedTouches`) and `zoomOnDoubleClick: false`. `options.enabled` (true)
switches it off, as while the graph is read-only. A double-click has no keyboard path; the app's
own add command (a palette entry, a button) is that path.

**`useFollowFit({ key, fitOptions?, onFitted? })`** → `{ following, fit, flowProps }`. While
following (from the start), the view fits again whenever `key` changes (the app's value that
changes when nodes are added, removed or laid out) and whenever the canvas changes size, each time
once every node is measured. The person moving the view (`onMoveStart` with an event; a move made
by code has none) stops following; `fit()` fits now and follows again. `onFitted(viewport)` is
called after each fit has landed, in the frame after the viewport is set: an app, or its browser
tests, can mark the layout ready on it instead of waiting on a timer. `flowProps` holds
`onMoveStart`. Automatic fits are instant; `fit()` moves as the fit tool does.

#### Out of scope

Layout, for the first version: an app lays out its graph with the library it prefers (dagre, ELK,
or places the person dragged to) and hands React Flow the positions, sizing nodes with
`nodeBoxSize`.

### 4.5 Hooks (`/hooks`)

Built: [`docs/components.md`](../components.md#hooks-hooks).

## 5. Storybook

Storybook is the catalogue, the documentation and the test surface.

- Every component has stories for its states; a toolbar switches **brand** (the base theme
  and the example brands in `examples/brands/`) and **theme** (system, light, dark), and a viewport switch covers the shell's three widths.
- Stories double as tests through Storybook's test runner on Playwright: interaction tests
  (`play`), the accessibility check, and screenshot comparison per brand × theme.
  *As built:* the runner is Storybook's Vitest addon (`@storybook/addon-vitest`, Vitest's browser
  mode on Playwright's Chromium) rather than the standalone `@storybook/test-runner`: it runs the
  stories straight from source with no Storybook server, and shares Vitest with the unit tests.
  Interaction tests and the accessibility check (a violation fails the story) are built; screenshot
  comparison is not yet (baselines must come from one pinned browser and font set, or CI and a
  laptop disagree on every pixel of text).
- It is built and published to GitHub Pages from `main`.

## 6. Packaging and releases

- **One package**, `@mcurcio/patchbay` on npm, ES modules with `.d.ts`, built with Vite's library
  mode. Subpath exports: `tokens.css`, `base.css`, `primitives`, `composites`, `shell`, `graph`,
  `hooks`. Each layer's CSS is a file of its own beside its JS. Brands are the app's own
  stylesheets ([`docs/tokens.md`](../tokens.md)); patchbay ships none.
- **Peer dependencies:** React 19 and React DOM 19 for all; `@xyflow/react` 12 for `/graph`;
  `knobly`, optional, for `/composites`' built-in knobly highlighting. None is bundled.
- **Releases:** semantic-release on `main` from Conventional Commits, publishing to npm with
  provenance; how it works is in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#releases).

## 7. Open questions

1. **A headless graph-overlay helper**: pure functions that lay edits not yet confirmed over the
   app's confirmed graph (requests on their way, or edits queued until a save). Not in the first
   version; revisit once `/graph` is in use.
