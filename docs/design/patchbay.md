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
[`docs/graph.md`](../graph.md), where `Meter`, the node geometry, `NodeBox`, `PortRow`,
`useConnectHints`, `Wire` and `GhostWire` already are. The props were checked against two neutral
node shapes, which the stories draw:

- **A level node**: title "Tone 1", subtitle "oscillator", a `Pill` status, two outputs ("left",
  "right"), each with a [`Meter`](../graph.md#meter) as its trailing slot, and a footer of badges
  ("48 kHz", "2 ch").
- **A staged-edit node**: title "mix-2", subtitle "mixer", `change: "added"`, typed ports
  ("in · audio", "side · control", "out · audio") with inputs and outputs side by side, one port
  with a problem, drawn while a wire is dragged (its ports' hints).

#### Supported React Flow

`@xyflow/react` 12.1.0 or newer, below 13. `useAddAt` reads the connection state that
`onConnectEnd` passes, first in 12.1.0, so the peer range narrows from `^12.0.0` to `^12.1.0`
when `useAddAt` ships. `tokens.css`'s `--xy-*` map sets 18 of React Flow's variables; every one is
declared in React Flow's stylesheet from 12.0.0 through 12.12.1, whose variable sets are identical
(85 names; checked 2026-11-26). The check that keeps this true (pb-nx9.39) is a unit test that
every `--xy-*` name `tokens.css` sets is declared in the installed React Flow's `style.css`, run
against the dev dependency, kept at the newest supported minor; `docs/tokens.md` states the range.

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
[`nodeBoxSize`](../graph.md#geometry).

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
