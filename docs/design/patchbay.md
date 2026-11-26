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

`Banner`, `StatusWords`, `Toaster`, `DiffView`, `CommandPalette`, `ShortcutSheet`, `CodeEditor` and
`CodeText` are built: [`docs/components.md`](../components.md#composites-composites). Still to
build:

| Component | Props (sketch) |
|---|---|
| `SchemaForm` | Deferred by the owner (2026-11-26), not in the first version. `schema` (JSON Schema subset), `value`, `onChange`, `errors?`, `fieldSlot?` |

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

Built: [`docs/graph.md`](../graph.md). What is left of its design is the check on the React Flow
range below.

#### Supported React Flow

[`docs/graph.md`](../graph.md) states the range, `@xyflow/react` 12.1.0 or newer, below 13.
`tokens.css`'s `--xy-*` map sets 18 of React Flow's variables; every one is declared in React
Flow's stylesheet from 12.0.0 through 12.12.1, whose variable sets are identical (85 names; checked
2026-11-26). The check that keeps this true (pb-nx9.39) is a unit test that every `--xy-*` name
`tokens.css` sets is declared in the installed React Flow's `style.css`, run against the dev
dependency, kept at the newest supported minor; `docs/tokens.md` points at the range.

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
- **Peer dependencies:** React 19 and React DOM 19 for all; `@xyflow/react` 12 (12.1.0 or newer) for `/graph`;
  `knobly`, optional, for `/composites`' built-in knobly highlighting. None is bundled.
- **Releases:** semantic-release on `main` from Conventional Commits, publishing to npm with
  provenance; how it works is in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#releases).

## 7. Open questions

1. **A headless graph-overlay helper**: pure functions that lay edits not yet confirmed over the
   app's confirmed graph (requests on their way, or edits queued until a save). Not in the first
   version; revisit once `/graph` is in use.
