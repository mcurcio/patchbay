# patchbay: design

This page is the design for the first version's unbuilt parts; when a part is built, what lasts of it moves into the library docs and is
deleted from here (the rule in [`AGENTS.md`](../../AGENTS.md#docs)).

## 1. What patchbay is

Built: [`docs/language.md`](../language.md#principles) (what patchbay owns and what each app owns,
and one look with each app its own brand).

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

Built: [`docs/components.md`](../components.md#shell-shell).

### 4.4 Graph (`/graph`)

Built: [`docs/graph.md`](../graph.md).

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
- **Foundations and Patterns pages** (pb-nx9.93), beside `Introduction`: MDX pages under
  `src/patterns/`, titled `Foundations/…` and `Patterns/…`, each showing one section of
  [`foundations.md`](../foundations.md) or [`patterns.md`](../patterns.md) live, built from the
  components' own stories with neutral data, linking to that section rather than repeating it, and
  holding a play function where the pattern has a gesture, so it runs as a test:

  | Page | The live example | Reuses |
  |---|---|---|
  | `Foundations/Tones` | Every tone and change tone side by side as Pill, Badge (outlined and filled), NodeBox and Wire, each with its meaning; the brand and theme switch | `Primitives/Pill`, `Primitives/Badge`, `Graph/NodeBox`, `Graph/Wire` |
  | `Foundations/Motion` | The five durations moving at once (a hover, a sheet's slide, a pulse, a flow, a spin), with a toggle showing the reduced-motion result | `Primitives/Sheet`, `Primitives/Pill`, `Graph/Wire`, `Primitives/Spinner` |
  | `Foundations/Touch and density` | One toolbar, buttons, fields and node at `md`, `sm` and touch sizes, the 36 and 40 px targets outlined | `Primitives/ToolGroup`, `Primitives/Button`, `Primitives/TextInput`, `Graph/NodeBox` |
  | `Patterns/Live, pending, queued, refused` | One small graph in each state; a button steps a request through pending to live or refused | `Graph/GhostWire`, `Graph/Wire`, `Graph/NodeBox`, `Primitives/Button` |
  | `Patterns/Adding a node` | A double-click opens the palette at the point; a type opens the add form in the inspector; Add is busy, then the node lands at the point | `Graph/useAddAt`, `Composites/CommandPalette`, `Shell/AppShell` |
  | `Patterns/Connecting` | A drag with hints, a drop that shows a ghost, then live or refused with its reason; the inspector's "Connect to" path | `Graph/useConnectHints`, `Graph/PortRow`, `Graph/GhostWire`, `Composites/Toaster` |
  | `Patterns/Selecting and inspecting` | Selecting nothing, a node, a wire and several changes the inspector's subject | `Shell/AppShell`, `Primitives/KeyValue`, `Graph/NodeBox` |
  | `Patterns/Editing text` | A CodeEditor with diagnostics; a change underneath makes the draft stale with a Reload banner; a read-only copy | `Composites/CodeEditor`, `Composites/Banner` |
  | `Patterns/Saving or queuing changes` | A queued edit on the canvas, the list of changes, the diff of what Save writes, Save busy then saved; Mod+Z drops the last change | `Composites/DiffView`, `Graph/NodeBox`, `Graph/Wire`, `Primitives/Button` |
  | `Patterns/Feedback channels` | Triggers (a field error, a node failing, a lost connection, a refusal from a key, a save) and where each lands | `Primitives/Field`, `Composites/Banner`, `Composites/Toaster`, `Composites/StatusWords`, `Primitives/Pill` |
  | `Patterns/Following the view` | A growing graph the view follows, a readout of `following`, the moves that stop it and the Fit that resumes it | `Graph/useFollowFit`, `Graph/CanvasTools` |
  | `Patterns/Keyboard and Escape` | The standard keys in a ShortcutSheet, and a stack that Escape closes one at a time | `Shell/AppShell`, `Composites/ShortcutSheet`, `Composites/CommandPalette`, `Hooks/useShortcuts` |
  | `Patterns/Read-only, empty and offline` | An empty graph, a read-only graph, and a lost connection | `Graph/useAddAt`, `Primitives/Pill`, `Composites/Banner`, `Graph/PortRow` |
  | `Patterns/Narrow and phone` | The shell at wide, narrow and phone widths and in right-to-left text, with a draft in the inspector across the switch | `Shell/AppShell`, `Primitives/Sheet` |

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
