# patchbay: design

Status: **proposed**, for the owner's review. This page is the design for the first version's
unbuilt parts; when a part is built, what lasts of it moves into the library docs and is
deleted from here (the rule in [`AGENTS.md`](../../AGENTS.md#docs)).

## 1. What patchbay is

patchbay is the component library behind the graph editors of ear (mcurcio/ear, `web/`) and rasl
(mcurcio/rasl, `js/packages/web`). Both are React apps that draw an engine's graph with React
Flow, edit a knobly file, and show live state; today each has its own widgets, tokens and shell.
patchbay holds what they share, so that it is built, tested and themed once.

**A library, not a framework.** A library is code the app calls; a framework calls the app.
patchbay draws and handles interaction; each app keeps what gives the drawing its meaning:

| patchbay owns | Each app owns |
|---|---|
| Design tokens, the light and dark themes, each app's brand | Its protocol client and wire types (ear: JSON-RPC over WebSocket; rasl: GraphQL) |
| Primitives, composites and graph components that draw what they are given | Its graph store and reducers |
| `AppShell`: the layout of a graph-editing app and the sizes it keeps | Its editing model (ear applies each edit at once; rasl queues edits until Save) |
| UI-only hooks: theme, shortcuts, toasts, kept preferences, live values | Mapping its data onto patchbay's props; layout of the graph; routing |
| The words patchbay needs by default (overridable) | Every word about its own domain |

*Why not a framework:* what differs between the two apps (transport, commit model, port typing,
lifecycle) is exactly what a framework would have to own, so it would end up as the union of both.

**Similar look and feel, each app its own variation** (owner, 2026-11-25). One structure and one
set of interactions; each app's brand changes the accent, the state hues where it needs to, the
density and the type ([`docs/tokens.md`](../tokens.md#brands)).

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

| Component | Props (sketch) | From |
|---|---|---|
| `CommandPalette` | `open`, `onClose`, `commands: { id, label, group, keys?, run, disabled? }[]`, `placeholder?` | ear `Palette`, `palette.ts` (`matchLabel`, `rank`) |
| `ShortcutSheet` | `shortcuts: { keys, label, group }[]`, `onClose` | ear |
| `Toaster` | (provider) | ear `Toasts`, `notices.ts` |
| `CodeEditor` | `value`, `onChange`, `language: "knobly"`, `diagnostics?: { line, column?, severity, message }[]`, `readOnly?`, `onCaret?` | ear `TextPane`, `KnoblyText`, `gutter.ts`, `highlight.ts` |
| `CodeText` | `value`, `language` (read-only, highlighted) | ear `KnoblyText` |
| `DiffView` | `diff` (unified text) or `files: { path, diff }[]` | rasl `pending-panel` |
| `SchemaForm` | `schema` (JSON Schema subset), `value`, `onChange`, `errors?`, `fieldSlot?` | rasl `settings-editor` |
| `Banner` | `tone`, `children`, `actions?` | ear's drawer banners |
| `StatusWords` | `items: { tone, label }[]` (most urgent first) | ear drawer header |

`CodeEditor` takes the highlighter from the `knobly` package, as a peer dependency of
`/composites` only, so an app that never shows code never loads it. Its diagnostics shape is what
both ear's `Diagnostic` and rasl's `ConfigProblem` map onto.

### 4.3 Shell (`/shell`)

`AppShell` is the layout both apps already have: a top bar, the canvas, an inspector on the right
and a drawer along the bottom. It is ear's (`ear/docs/editor.md#the-shell`), generalised:

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
components and a thin canvas; the app turns its graph into React Flow nodes and edges, lays them
out and handles the events.

| Component | Props (sketch) |
|---|---|
| `GraphCanvas` | React Flow's props, plus `tools` (the floating `ToolGroup`: zoom, fit, tidy, minimap), `onAddAt(point, from?)` (double-click on empty canvas, or a wire dropped there), `followFit` (fit again on changes until the person moves the view) |
| `NodeBox` | `title`, `subtitle?` (type), `tone?` (the stripe), `status?` (slot: a `Pill`), `line?` (why it is silent), `inputs`, `outputs`, `footer?` (slot: badges), `selected`, `change?: "added" \| "removed" \| "renamed" \| "changed"` |
| `PortRow` | `id`, `label`, `typeLabel?`, `side`, `hint?: "ok" \| "no" \| null` (while a wire is dragged), `problem?`, `trailing?` (slot: a meter) |
| `Wire` (edge type) | `tone` (`ok`, `pending`, `refused`, `added`, `removed`, open), `emphasis?: 0..1` (thickness and brightness), `dashed?`, `flow?`, `label?` (at the midpoint) |
| `GhostWire` | a request on its way: `from`, `to` |
| `Meter` | `subscribe(listener) → unsubscribe`, `read() → [peak, rms]`, `orientation?` |
| `useConnectHints` | `canConnect(from, to) → boolean \| string` → the `hint` of every handle while a wire is dragged |

- ear's level-driven wires and rasl's dashed queued wires are one `Wire` with different props;
  ear's ghost wires and rasl's queued edits are both drawn with `change` and `tone`.
- `Meter` takes a subscription rather than a store, so it never re-renders through React; it keeps
  its own peak hold.
- Layout is out of scope for the first version: ear lays out with dagre and keeps places the person
  dragged to; rasl lays out with ELK every time (owner, rasl, 2026-11-16: positions are not stored).

### 4.5 Hooks (`/hooks`)

`useTheme` and `usePersistentState` are built: [`docs/components.md`](../components.md#hooks-hooks).
Still to build:

| Hook | What it does |
|---|---|
| `useShortcuts(map)` | Key bindings, Cmd on macOS and Ctrl elsewhere, never inside a text field |
| `useToasts()` | `show({ tone, text, action? })`, where `action: { label, run }` |
| `useLiveValue(subscribe, read)` | For hot values outside React state; what `Meter` uses |
| `useMediaBreakpoint()` | The shell's three widths (wide, narrow, phone) and touch |

## 5. Storybook

Storybook (owner, 2026-11-25) is the catalogue, the documentation and the test surface.

- Every component has stories for its states; a toolbar switches **brand** (ear, rasl) and
  **theme** (light, dark), and a viewport switch covers the shell's three widths.
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

- **One package**, `patchbay` (name to confirm: [§8](#8-open-questions)), ES modules with
  `.d.ts`, built with Vite's library mode. Subpath exports: `patchbay/tokens.css`, `patchbay/base.css`,
  `patchbay/brands/ear.css`, `patchbay/brands/rasl.css`, `patchbay/primitives`,
  `patchbay/composites`, `patchbay/shell`, `patchbay/graph`, `patchbay/hooks`. Each layer's CSS is
  a file of its own beside its JS.
- **Peer dependencies:** React 19 and React DOM 19 for all; `@xyflow/react` 12 for `/graph`;
  `knobly` for `/composites`' code views. None is bundled.
- **Toolchain:** Node 24, pnpm through corepack (as knobly), TypeScript, Vitest, Storybook.
- **Releases:** semantic-release on `main` from Conventional Commits, as ear does. Each release
  attaches the `npm pack` tarball to its GitHub Release; ear and rasl install it by URL and pin it
  by SHA-512 integrity, as ear already does for knobly (GitHub Packages wants a token even to read).

## 7. Migration

1. **patchbay 0.1: tokens and themes.** ear's tokens move with the `--pb-` prefix and its contrast
   test; ear's and rasl's brands are written. ear and rasl load `tokens.css` and their brand; a
   change in how either looks is a token value, reviewed in Storybook.
2. **Primitives, then composites**, moved from ear one at a time with its tests, and from rasl for
   `DiffView` and `SchemaForm`. ear switches to each as it lands; ear's `docs/editor.md` points at
   patchbay's docs for what moved.
3. **rasl adopts layers 1–3.** Before this, rasl moves to React 19 and React Flow 12.12 (it is on
   18.3.1 and 12.3.6). `@rasl/ui`, which nothing imports, is deleted (rasl's bead `rasl-2x2`).
4. **`AppShell`**, then **`/graph`**, once both apps are on the same React and React Flow.

Each step is a patchbay release and one pull request per app.

## 8. Open questions

1. **Package name.** `patchbay` is likely taken on npm. Installed by URL that does not break
   anything, but a scoped name (`@mcurcio/patchbay`) avoids confusion. Proposal: scoped.
2. **Licence.** knobly is MIT; ear and rasl ship it in their images. Proposal: MIT.
3. **Where brands live.** Proposal above: in patchbay, so tests and Storybook cover them. The
   alternative is each app keeping its brand, and patchbay testing only its own default.
4. **`GraphCanvas` or only node and edge types.** A thin wrapper gives the shared tools, fit
   behaviour and add-at-point; leaving React Flow to each app keeps patchbay smaller. Proposal:
   the wrapper.
5. **A headless graph-overlay helper** (pure functions laying edits that are not yet truth over
   the server's truth: ear's requests in flight, rasl's queue). Not in the first version; revisit
   once both apps draw with `/graph`.
6. **Brand differences.** What should ear's and rasl's variations be: an accent each, type, density?
   Needs the owner's eye, in Storybook, once tokens land.
