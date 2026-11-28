# Foundations

What patchbay draws with, and what each part of it means. The tokens themselves, their values and
the tests that hold them are in [`tokens.md`](tokens.md#the-tokens); this page says which role
each one plays. How to read a rule (Built, The app's, Not yet):
[`language.md`](language.md#reading-these-pages).

## Colour roles

- **F1. Surfaces.** `surface` is the canvas. `raised` is anything on it: boxes, panels, controls,
  banners, toasts. `sunken` is a track, a chip, read-only text, and a control's hover and pressed
  face. **Built:** every component's stylesheet.
- **F2. Lines.** `line` draws borders and the dot grid. `line-strong` draws a control's edge, a code
  box's border, and the edge or stripe of a tone a component does not know (F7). **Built:** the
  control and news stylesheets.
- **F3. Text.** `text` for body text; `muted` for secondary text, hints, group headings and
  disabled words; `on-strong` for text on a filled chip. **Built:** every stylesheet.
- **F4. The accent means "yours".** It draws selection and focus, a primary or pressed control, a
  palette's matched letters and the port a drag began at. It never means a state of
  [the source](language.md#the-source). **Built:** Button, ToolGroup, NodeBox, Wire, PortRow,
  CommandPalette.
- **F5. Derived colours follow.** The scrim and the accent's hover face are mixed from tokens, so
  they follow the theme and a brand ([`tokens.md`](tokens.md#the-tokens), Derived).

## Tones

A tone says what a state is. These meanings are patchbay's, and an app maps each of its states to
one of them:

| Tone | Means | Use it for | Drawn in |
|---|---|---|---|
| `ok` | Working as asked | A running node, a live connection, a port that accepts a drop | `--pb-ok` |
| `warn` | Needs attention, still working | A rise in errors, a stale draft, a change that applies later | `--pb-warn`, on `--pb-warn-soft` where it fills a surface |
| `err` | Failed or refused | A failed node, a refused edit, a lost connection | `--pb-err`, on `--pb-err-soft` where it fills a surface |
| `quiet` | In progress, nothing wrong | A state starting, a request pending, a note that asks nothing | `--pb-quiet`, a slate grey (F9) |
| `off` | Stopped, or not a candidate | A stopped node, a port that refuses a drop | `--pb-off` |
| `accent` | Yours: chosen or selected | A chip for the person's own choice | `--pb-accent` |
| `muted` | Neutral by choice | A fact with no state, such as a kind or a count | `--pb-muted` |

The change tones draw an edit that is queued, not true yet (F10):

| Change | Means | Drawn in |
|---|---|---|
| `added` | Will exist after the save | `--pb-added` |
| `removed` | Will be gone after the save (its title struck through) | `--pb-removed` |
| `renamed` | Will have a new name | `--pb-renamed` |
| `changed` | Its settings will differ | `--pb-warn` |

- **F6. One tone set.** Every component that takes a tone takes all seven state tones, and every
  one that draws edits takes all four change tones, so an app maps a state once, whatever draws it.
  **Built:** Pill, Badge, Banner, StatusWords, Toaster, KeyValue, NodeBox, Wire, ChangeList
  (through its Badge).
- **F7. One look for a tone it does not know:** its words in `muted`, its edge or stripe in
  `line-strong`, and a wire, which has no words, in the `muted` stroke. It is drawn, never refused
  ([`components.md`](components.md#rules-every-component-keeps), rule 2). **Built:** Pill, Badge,
  Banner, StatusWords, Toaster, KeyValue, NodeBox, Wire, GhostWire.
- **F8. A severity is not a tone.** CodeEditor's diagnostics say `error` and `warning`, the words
  checkers emit; they are drawn as `err` and `warn`, and any other severity as `muted`
  ([`components.md`](components.md#code), CodeEditor). **Built:** CodeEditor, DiagnosticList.
- **F9. Pending is `quiet`, not `off`.** A request on its way is drawn in `--pb-quiet`, as
  GhostWire's `pending` is ([`graph.md`](graph.md#ghostwire)); `off` is stopped, or not a
  candidate. So the two never read alike, nor quiet as the person's own choice, `--pb-quiet` is a
  slate grey of its own, apart from both `--pb-off` and `--pb-accent` in every theme and brand
  ([`tokens.md`](tokens.md#the-tests)). **Built:** GhostWire, the tokens.
- **F10. Pending and queued are two words.** **Pending** is a request sent and not answered yet:
  GhostWire's `pending` tone, a busy Button. **Queued** is a change held here until a save: a change
  tone with dashes (U53). Wire has no `pending` tone. **Built:** GhostWire, Button, Wire.
- **F11. warn and err fill on their soft surfaces.** An outlined Badge, a Banner, a Toast and a
  failed node's header put the tone on `warn-soft` or `err-soft`. **Built:** Badge, Banner,
  Toaster, NodeBox.
- **F12. Contrast.** Every text, tone, change, on-strong and code token is at least 4.5:1 on each
  surface it is drawn on, in each theme and under every brand; a failing pair changes the value,
  not the rule ([`tokens.md`](tokens.md#checking-a-brand)).
- **F13. Never colour alone.** A tone always comes with a word, a shape or a mark: Pill's word,
  Badge's word, NodeBox's change badge and struck title, DiffView's `+` and `-`, CodeEditor's
  gutter circle, diamond and ring, PortRow's accepting handle growing. A wire's change tone is
  always dashed; an `err` or `refused` wire carries a label, or its reason in the inspector; a
  KeyValue value's tone adds a dot, as Pill's. **Built:** Pill, Badge, NodeBox, DiffView,
  CodeEditor, PortRow, KeyValue, Wire (a change tone dashed whatever `dashed` says). **The app's:**
  the words of an `err` or `refused` wire, as its `label` or, for a longer reason, in the
  inspector when it is selected.

## Type

- **F14. Two UI sizes.** `--pb-text-md` for body text and titles; `--pb-text-sm` for secondary
  text, badges, hints, ports and group headings ([`tokens.md`](tokens.md#the-tokens), Type).
- **F15. Titles, headings and emphasis.** Panel, Dialog, Sheet, SectionTitle and NodeBox titles are
  `text-md` at weight 600. Group headings (a palette's, a shortcut sheet's) are `text-sm` at 600 in
  `muted`. Emphasis is 600, never more, the palette's matched letters and WarnMark's "!" included
  ([`tokens.md`](tokens.md#the-tests)). **Built:** their stylesheets.
- **F16. Code face for code.** A value written as code takes `--pb-font-code`: `font="code"` on
  TextInput and Select, port types, a Pill's `detail`, key caps, code boxes.
- **F17. One code size.** `--pb-code-size` is shared by a code box's textarea, highlighted copy and
  gutter, so their glyphs line up ([`tokens.md`](tokens.md#the-tokens), Code size).
- **F18. Fields do not make a phone zoom.** On a touch screen (F35) every text field, code boxes
  included, has 16 px text, as iOS zooms the page into a smaller one. **Built:** TextInput, Select,
  CommandPalette, CodeEditor (`--pb-code-size`).
- **F19. Numbers that change are tabular.** KeyValue values, a toast's count and the gutter's line
  numbers use tabular figures, so they do not jitter. **Built:** their stylesheets.
- **F20. One line truncates, and the whole is readable elsewhere.** A one-line label (a node's
  title and line, a port's label, a palette row's label and hint) ends in an ellipsis, and its
  whole text is written out somewhere a person can read it without hovering (U47): a node's in the
  inspector, which the app titles with it; a palette row's in the row itself while it is the
  active one, and in every row on touch, where a tap runs a row before it is active. **Built:**
  NodeBox, PortRow (cut, with a tooltip), CommandPalette
  ([`components.md`](components.md#commands-and-keys)).

## Space

- **F21. Five steps.** Spacing comes from `--pb-space-1` to `--pb-space-5`
  ([`tokens.md`](tokens.md#the-tokens), Density). **Not yet:** some paddings and sizes are literals
  (Pill's and CodeText's paddings, Field's label column, chip and glyph sizes): pb-nx9.24.
- **F22. Control heights.** A control is `size="md"`; `size="sm"` is the compact one for dense
  rows, `--pb-row` high, and the only density chosen per use; the top bar is `--pb-bar` high
  ([`components.md`](components.md#rules-every-component-keeps), common props).
- **F23. Density is a brand's.** A brand may change the spacing steps, `--pb-row` and `--pb-bar`
  ([`tokens.md`](tokens.md#writing-a-brand)).
- **F24. Node geometry is fixed.** A node's sizes are constants mirrored by `--pb-node-*` tokens no
  brand may set, so a layout computed in code matches the drawing ([`graph.md`](graph.md#geometry)).
- **F25. Marks never change a box's size.** A change border is drawn inward; the selection ring is
  an outline outside the box ([`graph.md`](graph.md#nodebox)).

## Radius

- **F26. Three radii.** `--pb-radius-box` for what floats or rests on the canvas: dialogs, sheets,
  toasts, the palette, tool groups and nodes; `--pb-radius-control` for controls, text and code
  boxes, banners and key caps; `--pb-radius-pill` for pills, badges and dots. A Panel has none, as
  the layout draws its edges (F28). No other radius but 0 ([`tokens.md`](tokens.md#the-tests)).

## Elevation

- **F27. Two shadows.** `--pb-shadow` rests a thing on the canvas: a node, a tool group, the
  minimap. `--pb-shadow-lifted` floats a thing over content: a dialog, the palette, a sheet, a
  toast. No other shadow ([`tokens.md`](tokens.md#the-tests)).
- **F28. Panels draw no outer border.** The layout that places them draws the edges
  ([`components.md`](components.md#layout), Panel).
- **F29. Layering.** From the bottom: the canvas and React Flow's panels; splitters (`z-index` 5);
  a sheet (10); the toaster (20); a dialog and its scrim (100); the palette (110). A toast stays
  under a modal. **Built:** Splitter, Sheet, Toaster, Dialog and CommandPalette, whose stylesheets
  write these values; this list is their one home.

## Motion

- **F30. Five durations, by role.** `--pb-motion-fast` for hover, selection, chevrons and hints;
  `--pb-motion-slow` for what slides or travels (a sheet, a toast, a dialog's rise, a zoom or a
  fit the person asked for); `--pb-motion-pulse` for a pulsing dot; `--pb-motion-flow` for a
  wire's flow; `--pb-motion-spin` for the spinner ([`tokens.md`](tokens.md#the-tokens), Motion).
  No stylesheet has a duration of its own ([`tokens.md`](tokens.md#the-tests)).
- **F31. Entrances, never exits.** A dialog fades and rises, a sheet slides, a toast rises, the
  palette fades in; nothing animates on its way out, so a closed thing is gone at once. **Built:**
  Dialog, Sheet, Toaster, CommandPalette.
- **F32. The graph does not animate.** Nodes and wires appear and go at once, and the fits that
  follow the graph are instant. Only a move the person asked for (a zoom, the fit tool, going to a
  node) travels, over `--pb-motion-slow`. **Built:** [`useFollowFit`](graph.md#usefollowfit),
  [`CanvasTools`](graph.md#canvastools).
- **F33. A pulse is the dot's.** Something on its way pulses its dot, never its word
  ([`components.md`](components.md#state), Pill).
- **F34. A level changes fast.** A wire's width and opacity change over `--pb-motion-fast`; a meter
  is painted every frame ([`graph.md`](graph.md#wire), [`graph.md`](graph.md#meter)).

Reduced motion: [ux-rules](ux-rules.md#reduced-motion).

## Density and touch

- **F35. One touch query.** Touch means `(hover: none) and (pointer: coarse)`, everywhere, and
  `useMediaBreakpoint().touch` in code ([`components.md`](components.md#usemediabreakpoint)).
- **F36. Targets grow on touch.** On a touch screen every target is at least 36 px, and 40 px in a
  tool group, whose tools sit edge to edge; rows in a list people tap through (the palette's) are
  40 px. **Built:** every control's stylesheet.
- **F37. Handles are the exception.** Ports sit closer than a full target, so a handle's hit area
  grows less, and React Flow's `connectionRadius` finishes a near drop
  ([`graph.md`](graph.md#geometry), Touch).
- **F38. A small mark keeps its size.** Its hit area grows to a full target and its drawing does
  not: a splitter's bar, a gutter mark ([`components.md`](components.md#layout), Splitter;
  [`components.md`](components.md#code), CodeEditor).
- **F39. The component draws its own press.** Pressable things set
  `-webkit-tap-highlight-color: transparent`. **Built:** Button (and so IconButton and ThemeSwitch),
  ToolGroup, Checkbox, RadioGroup, Splitter, DiffView.
- **F40. A target can be found without hover.** On touch, an IconButton has its `line-strong` edge
  at rest and a Splitter draws its grip (a short bar) at rest. **Built:** IconButton, Splitter
  ([`components.md`](components.md#actions), IconButton; [`components.md`](components.md#layout),
  Splitter).

## Widths

- **F41. Three widths.** Wide, narrow below 760 px and phone below 600 px, as
  [`useMediaBreakpoint`](components.md#usemediabreakpoint) names them and exports them. Narrow moves
  the inspector into a sheet and phone moves it to the bottom
  ([`AppShell`](components.md#appshell)); at phone width a dialog, the palette and the toasts take
  the width less the gutters. **Built:** `mediaQueries` is the one source; a stylesheet that
  changes at a width (Dialog, CommandPalette, ThemeSwitch) writes its query exactly, and a test
  fails on any other width or touch query ([`components.md`](components.md#usemediabreakpoint)).
- **F42. Pane sizes have bounds.** The inspector, the drawer and an inline sheet are held to
  bounds, and a kept size out of bounds is drawn within them and not written back
  ([`components.md`](components.md#appshell), Sizes; [`components.md`](components.md#overlays),
  Sheet).
- **F43. A top bar gives up the app's controls first.** Its `start` slot takes the free width and
  gives it up before anything else ([`components.md`](components.md#appshell)). What a phone's bar
  keeps: [patterns](patterns.md#narrow-and-phone-layouts).

## Themes and brands

- **F44. The theme follows the system** until `data-theme` on `<html>` chooses one
  ([`tokens.md`](tokens.md#the-theme)).
- **F45. No flash.** `themeScript` in the page's `<head>` applies a kept choice before the first
  paint ([`components.md`](components.md#usetheme)).
- **F46. One theme switch.** [`ThemeSwitch`](components.md#actions) cycles system, light and dark,
  named by the choice; an app uses it and its words rather than a switch of its own. **Built:**
  ThemeSwitch, drawn with a neutral Button. **Not yet:** ThemeSwitch keeps its own theme cycle:
  pb-nx9.22.
- **F47. A brand overrides tokens and adds none,** each override with its reason, and passes the
  contrast check apps run from `/testing` ([`tokens.md`](tokens.md#writing-a-brand)).
- **F48. React Flow follows the tokens.** Its `--xy-*` variables point at them; its `colorMode` is
  not used ([`tokens.md`](tokens.md#the-tokens), React Flow).

## Glyphs

- **F49. Glyphs are SVG, hidden from screen readers,** and the control's name carries their
  meaning ([`components.md`](components.md#actions), IconButton). **Built:** every glyph.
- **F50. One glyph grid.** A glyph is drawn 12 px inside a 16 px box, at a 1.75 stroke with round
  caps, in `currentColor`, so an app's own glyphs sit beside patchbay's. **Built:**
  [`Glyph`](components.md#actions), which CloseGlyph, ThemeSwitch, DiffView, AppShell and
  CanvasTools draw with, and which an app draws its own with; IconButton and ToolGroup set a text
  glyph at 16 px, the same box.
