# Components

What patchbay has built, layer by layer: what each component is for, its props, and how it behaves
from the keyboard and on touch. Storybook shows every state of each under the base theme and the
example brands, light and dark; the props' own doc comments (in each `Name.tsx`) are the reference
for every field.

```ts
import { Button, Field, TextInput } from "@mcurcio/patchbay/primitives";
import { useLiveValue, useMediaBreakpoint, usePersistentState, useShortcuts, useTheme, useToasts } from "@mcurcio/patchbay/hooks";
```

Importing a layer loads its stylesheet (`dist/primitives.css`); an app loads the tokens and its
brand first ([`tokens.md`](tokens.md#writing-a-brand)). Components set their own box, type and
focus ring, so none needs `base.css`.

## Rules every component keeps

1. **Components only draw.** Data comes in as props; what the person does goes out as callbacks.
   No fetching, no protocol types, no global state.
2. **Every enum is open.** A tone, size or layout a component does not know is drawn neutrally (by
   its own word, where it shows one), never a failure. Types are written
   `"ok" | "warn" | (string & {})`, and each is set as a `data-*` attribute its stylesheet keys on.
3. **Slots over flags.** What one app has and another lacks goes in a slot (`actions`, `detail`),
   a `ReactNode`, never a boolean per feature.
4. **Tokens only.** No colour, radius, shadow or duration outside the token files; a test fails on
   one ([`tokens.md`](tokens.md#the-tests)). Sizes in px (a 28 px button, a 36 px touch target) are
   written in the component's stylesheet.
5. **Controlled.** Open state, sizes, choices and values are props with change callbacks; a
   component keeps state of its own only where the app never needs it (a splitter's drag in
   progress, the toolbar's tab stop).
6. **Hot values stay out of React state.** Anything updated many times a second (levels, metrics)
   is read through a subscription and painted through refs.
7. **Keyboard, touch and reduced motion are built in.** Each component keeps the
   [UX rules](ux-rules.md): focus is visible ([U1](ux-rules.md#focus-and-keyboard)), every action
   has a keyboard path ([U2](ux-rules.md#focus-and-keyboard)), targets and text fields take their
   touch sizes ([density and touch](foundations.md#density-and-touch)), and reduced motion and
   forced colours are kept ([reduced motion](ux-rules.md#reduced-motion),
   [forced colours](ux-rules.md#forced-colours)).
8. **Words: the `labels` prop.** A component says no app's words. The words it supplies itself
   (a close button's name, a placeholder, an empty list's line, a tooltip, words only a screen
   reader reads) come through one prop, `labels`: a partial object merged over English defaults
   (`{ ...defaultXLabels, ...labels }`), its type `XLabels` and its defaults `defaultXLabels`
   exported from the layer beside the component. A word that depends on a value is a function in
   it (`more(n)`). The app's own content (`Field`'s and `Pill`'s `label`, the names `Splitter` and
   `Toolbar` require, `Button`'s `busyLabel`, what a `Meter` measures) stays a prop of its own.
   There is no app-wide provider: an app passes each component its words.

Common prop names mean the same everywhere:

| Prop | Means |
|---|---|
| `tone` | What a state or action is ([the tones](foundations.md#tones)); an open enum |
| `size` | `md` (the default) or `sm`, the compact one for dense rows |
| `label` | The accessible name, or the words a screen reader reads (`Pill`'s and `Checkbox`'s are also shown) |
| `labels` | The component's own words, a partial object over its English defaults ([rule 8](#rules-every-component-keeps)) |
| `title` | On `Dialog`, `Sheet`, `Panel` and `NodeBox`, the heading that also names it; elsewhere the native hover tooltip |
| `actions` | A slot at the far end of a header, or the foot of a dialog |
| `open`, `onClose` | Shown or not, held by the app; `onClose` asks the app to set `open` to false |
| `className` | Added to the component's own `pb-` class, never replacing it |

Components built on a native element (`Button`, `TextInput`, `Select`, `Checkbox`, `Field`,
`Splitter`, `Toolbar`, `Panel`, `Spinner`, `ThemeSwitch`, and `RadioGroup` to its fieldset) pass
every other native prop through, `ref` included (React 19's `ref` as a prop).

## Primitives (`/primitives`)

### Actions

**`Button`**: a push button. `tone?: "neutral" | "primary" | "danger"` (neutral by default; one
primary per view), `size?`, `busy?`, `busyLabel?`, plus native button props.

- `type` defaults to `"button"`, so a button in a form never submits it unless asked
  (`type="submit"`).
- **Busy** shows a `Spinner` over the words, which stay in place so the width holds and the
  accessible name is kept. The button says `aria-busy` and `aria-disabled` and ignores presses (a
  busy submit button does not submit), but stays focusable, so focus is not lost while a request
  is on its way.
- **`busyLabel`** (a string, such as "Saving") is shown beside the spinner while busy, in place of
  the words, and names the button then. Both labels share one grid cell, the one not shown hidden
  from sight and from the name, so the width is the wider label's and does not jump either way. A
  polite live region beside the button, there from the start, says the busy words when it turns
  busy and empties when it is done; the focus stays on the button throughout. Without it (or with
  an empty one) nothing is announced and busy is as above. A button named by `aria-label` has no
  words to swap, so the busy label names it while busy instead of being shown.
- `aria-pressed` draws it in the accent on the sunken face: a toggle.
- Disabled drops the tone. On touch it is at least 36 px tall.

**`IconButton`**: a square glyph button on `Button`'s rules (`tone`, `size`, `busy`, `busyLabel`,
pressed). `label` (required) is its accessible name and, unless `title` is given, its tooltip;
`children` is the glyph, hidden from screen readers. A glyph has no words to swap, so while busy a
`busyLabel` becomes its name and (unless `title` is given) its tooltip, and is announced as on
`Button`; the spinner covers the glyph as without one. 28 px (22 px when `sm`), borderless until
hovered, pressed or toned; 36 px on touch, 40 px in a `ToolGroup`.

**`ThemeSwitch`**: one button that cycles system, light and dark. `choice`, `onChoose(next)`,
`labels?` (its words, [rule 8](#rules-every-component-keeps): `theme`, `system`, `light`, `dark`,
`systemHint`, `clickFor`; `defaultThemeSwitchLabels`). It shows an icon and the choice's word; its
name is "Theme: dark", its tooltip says what a press does (`themeSwitchTitle`). Below 600 px the
word gives way to the icon alone. 36 px on touch. The choice is the app's, kept by
[`useTheme`](#usetheme).

### State

**`Pill`**: a state as a dot and its word, both in the state's tone, so the state never rests on
colour alone (a node's state). `tone: "ok" | "warn" | "err" | "quiet" | "off" | "accent" | "muted"`
(open: any other string is drawn as `muted`), `label` (the word), `pulse?` (the dot pulses, never
the word, while the state is on its way; still under reduced motion), `title?`, `detail?` (a slot
after the word in code type: a failure's code). Under forced colours the dot keeps its shape in the
system's text colour.

**`Badge`**: a short word or count in a chip of its tone. `tone` (`Pill`'s tones, plus the changes
`"added" | "removed" | "renamed" | "changed"`, drawn in `--pb-added`, `--pb-removed`,
`--pb-renamed` and `--pb-warn`; open: any other string is drawn neutrally), `variant?:
"outlined" | "filled"`, `children`, `title?`.

- Outlined (the default): text and border in the tone on the sunken surface; warn, err and changed
  on their soft surfaces. A tone it does not know has its words in `--pb-muted` and its border in
  `--pb-line-strong` ([F7](foundations.md#tones)); `off` has a plain line.
- Filled: the tone's colour as the fill, the words in `--pb-on-strong`, for a fact that must stand
  out. A tone it does not know is filled with `--pb-muted`. Under forced colours the fill gives way
  to the border, which stays.

**`WarnMark`**: an "!" in a circle for something that rose lately, beside a badge's words.
`label` is what a screen reader reads in its place (the glyph is hidden); `title?` is the hover
text. Under forced colours the circle stays, in the system's text colour.

**`Spinner`**: the busy mark, an open ring in the current text colour, turning once per
`--pb-motion-spin` and still under reduced motion. Without `label` it is decoration, hidden from
screen readers (as inside a busy `Button`); with one it is a `role="status"` that announces it.

### Text and facts

**`SectionTitle`**: a section's heading with its `actions?` slot at the far end. `children`,
`level?` (h2 to h6, h3 by default).

**`KeyValue`**: facts as a `<dl>`, keys and values side by side. `rows: { key, value, tone?,
title? }[]` (a row's `tone`, one of `Pill`'s seven, colours its value and adds a dot before it, as
`Pill`'s, hidden from screen readers; one it does not know draws both in `--pb-muted`; its `title`
is the key's tooltip; two rows may share a key), `label?` (the list's name when no heading gives
one). Under forced colours the dot keeps its shape in the system's text colour.

### Forms

**`Field`**: a labelled control. `label`, `error?`, `hint?`, `layout?: "stacked" | "inline"`
(inline puts the label in a 130 px column beside the control), `children` (one control element).
It wires the control itself: the control gets an id the `<label>` points at (its own, if it has
one), `aria-describedby` naming the hint and the error after any ids it already has, and
`aria-invalid` while there is an error ("", `null` and `false` count as none). The error is not a
live region, so it is not announced on every keystroke. The control must pass `id` and `aria-*`
props on to its native element, as `TextInput`, `Select` and `Checkbox` do
(`FieldControlProps`).

**`TextInput`**, **`Select`**: a native `<input>` (type `"text"` by default) and `<select>`, every
native prop passed through. `font?: "ui" | "code"` sets the face (code for values written as
code). `aria-invalid` draws the error-tone border; disabled and read-only are sunken. `Select`
keeps the platform's own arrow and list. On touch both are 16 px text and at least 36 px tall.

**`Checkbox`**: a native checkbox ticked in the accent. `label?` wraps it in its own `<label>`, so
a press on the words ticks it; without one, name it by a `Field` or `aria-label`.
`indeterminate?` (read as "mixed") is a prop, since HTML has it only as a DOM property. On touch the
row is at least 36 px tall, with a 20 px box and 16 px words.

**`RadioGroup`**: a choice of one, as native radios under a legend in one `<fieldset
role="radiogroup">`. `legend` (its name), `legendHidden?` (the legend kept for screen readers
only), `options: { value, label, title?, disabled? }[]`, `value` (the picked option's value; one
no option has picks none), `onChange(value)`, `name?` (the radios' shared name; its own by
default), `layout?: "stacked" | "inline"` (one option a row, or side by side and wrapping; others
stack), `hint?`, `error?`.

- **Controlled:** a press asks `onChange` and changes nothing until the app passes the new
  `value`.
- **Keyboard:** the browser's own: the group is one tab stop, and the arrow keys move the pick.
- The hint and error are wired as `Field` wires a control's: `aria-describedby` names them (after
  any ids it already has) and `aria-invalid` marks the group while there is an error ("" counts as
  none). The radios are picked in the accent, and edged in the error tone while invalid.
- `disabled` on the group disables every option. On touch each row is at least 36 px tall, with a
  20 px radio and 16 px words.

### Layout

**`Panel`**: a region with an optional header (its `title?` and `actions?`) over a body that
scrolls on its own. `level?` (h1 to h6, h2 by default) is the title's heading. The title names the
region (an `aria-label` the app gives wins); with neither title nor actions there is no header. It
draws no outer border: the layout that places it draws its edges. While the body overflows it is a
tab stop (with an inset focus ring), so the keyboard can scroll it; a short body adds none.

**`Splitter`**: a pane's resize handle, a WAI-ARIA separator. `orientation: "vertical" |
"horizontal"` (a vertical bar resizes a width), `value`, `min`, `max` (px), `onChange(px)` (whole
px within the bounds, called only when the size changes), `label` (required: "Resize the
inspector"), `edge?: "start" | "end"` (which edge of the pane it sits on, `start` by default),
`step?` (px per arrow key, 16 by default).

- **`edge` is logical.** A vertical splitter's start is the pane's inline start, the left edge in
  left-to-right text and the right edge in right-to-left text, and its end the other; a horizontal
  one's start is the top. Moving outward, away from the pane, grows it: on the start edge in
  left-to-right text, left or up; in right-to-left text a vertical one mirrors, so right grows it
  on the start edge and left on the end edge. The direction is the element's own
  (`getComputedStyle(el).direction`), read when a key is pressed or a drag starts, so a page that
  changes `dir` is followed at once.
- **Keyboard:** the arrow pointing outward adds a step, the opposite one takes one away; Home goes
  to `min`, End to `max`. Keys with Ctrl, Alt or Meta are left alone.
- **Pointer:** the main button drags it, with pointer capture; it takes the focus and has
  `data-dragging` while dragging.
- It sits absolutely on one edge of its positioned parent, placed with logical properties
  (`inset-inline-start`, `inset-block-end`). The bar is 6 px; on touch its hit area is 36 px.

**`Toolbar`**: a WAI-ARIA toolbar, a row (or column) of controls that is one tab stop. `label`
(required), `orientation?: "horizontal" | "vertical"`.

- **Keyboard:** the arrows (left and right, or up and down when vertical; swapped in right-to-left
  text) move between items and wrap at the ends; Home and End go to the first and last. A text
  field inside keeps its own arrow keys; keys with a modifier are ignored; a toolbar nested inside
  keeps its own items.
- **Roving tab stop:** the toolbar sets its items' `tabIndex` itself (an item's own is overwritten).
  The item focused last, by key or by pointer, keeps the stop, and it is kept as items come, go or
  are disabled.
- Items are its enabled buttons, links, inputs, selects and text areas, and elements with role
  button, checkbox, radio, menuitem or switch.

**`ToolGroup`**: a `Toolbar` drawn as one raised, edged, shadowed frame of square tools, as a
canvas's zoom, fit and minimap. Its tools are `IconButton`s (or plain buttons named by
`aria-label`); a pressed one is drawn in the accent. 28 px tools, 40 px on touch.

### Overlays

**`Dialog`**: a modal dialog over a scrim, in a portal on `<body>`. `open`, `onClose`, `title`
(also its name), `children`, `actions?` (a row at its foot), `labels?` (its words, [rule
8](#rules-every-component-keeps): `close`, the close button's name, "Close").

- Opening focuses a control the content focused itself (`autoFocus`), else the body's first
  control, else the dialog. Closing gives focus back to what had it.
- Tab and Shift+Tab stay inside, and focus that wanders out is brought back; with several open,
  only the topmost keeps it.
- Escape (not passed on to the page), the close button, and a press that starts on the scrim call
  `onClose`.
- The body is a tab stop of its own, so a long one scrolls from the keyboard. At phone width the
  box takes the whole width less the gutters. It fades and rises in, still under reduced motion.

**`Sheet`**: a panel over its container's inline end (or start) edge, or rising from its bottom, as
an inspector on a narrow window or a phone. `open`, `onClose`, `side?: "end" | "start" | "bottom"`
(`end` by default), `title?` (or `label?`, its name without one), `actions?` (a slot in the header
row, at its far end before the close button), `children`, `width?` (an inline sheet's width in px,
held to 280–560 px and 48 px short of its container; 360 by default), `labels?` (its words, [rule
8](#rules-every-component-keeps): `close`, "Close").

- **`side` is logical**, as `Splitter`'s `edge` is: `end` is the container's inline end, the right
  edge in left-to-right text and the left edge in right-to-left text, and `start` the other. It is
  placed with logical properties (`inset-inline-end`, `border-inline-start`), so it follows the
  direction the browser lays its container out in, and slides in from the edge it is on.
- It is not modal: the page stays live, and opening it does not take the focus. Escape inside it
  and its close button call `onClose`; if it closes holding the focus, the focus goes back to where
  it came from.
- From the bottom it is the full width, at most 62 % of the height, rounded at the top and padded
  by the bottom safe-area inset.
- It is placed absolutely, so its container (the app's workspace) is positioned. The app chooses
  the side (the inline end below 760 px, the bottom below 600 px).

## Composites (`/composites`)

Composites are drawn with primitives: importing `/composites` loads `/primitives` and its
stylesheet too. Their own words come through `labels`, as the primitives' do ([rule
8](#rules-every-component-keeps)).

### News and state

**`Banner`**: a line of news across a pane or page (a conflict, a lost connection, a refused edit),
on a raised surface with a stripe in its tone at the start (warn and err on their soft surfaces).
`tone` ([`Pill`](#state)'s seven tones; open: one it does not know has its stripe in `--pb-line-strong`),
`children` (the news), `actions?` (a slot at its end: the buttons that act on it), `onDismiss?`
(shows a close button that calls it), `labels?` (its words, [rule 8](#rules-every-component-keeps):
`dismiss`, the close button's name, "Dismiss"), plus native `div` props.

- An `err` banner is `role="alert"`, read at once; every other tone is `role="status"`, read when
  the screen reader is free. The role is the banner's own.
- The words wrap and the actions drop under them in a narrow pane. The close button is an
  `IconButton`, so it keeps a 36 px target on touch.

**`StatusWords`**: a short row of states, each a word in its tone, a dot between each two (a pane's
"2 errors · 1 warning · saved"). `items: { tone, label, title? }[]` (`Pill`'s seven tones, open:
one it does not know in `--pb-muted`), drawn in the order given, which is most urgent first, plus native `ul` props (name it with
`aria-label`).

- The list is one `aria-live="polite"` region (an app may pass another `aria-live`), so a screen
  reader reads a change when it is free; it stays in the page while empty, ready for the next
  change. The dots are drawn, not read.

**`Toaster`**: a stack of toasts, short news that comes and goes (a refused edit, a lost connection,
a saved file), each on a raised, shadowed surface with a stripe in its tone at the start, as
`Banner`'s. The queue is the app's ([`useToasts`](#usetoasts) holds one, and its `toasterProps`
are this component's props): `toasts: { id, tone, text, count?, action? }[]` (the shown ones,
oldest first; `Pill`'s seven tones, open, one it does not know drawn
with its stripe in `--pb-line-strong`; `text` any node; `action: { label, run }`), `more?` (how many older ones are
folded away), `onDismiss(id)`, `onHold?(held)`, `placement?`, `labels?` (its words, [rule
8](#rules-every-component-keeps): `region`, the region's name, "Notifications", which an
`aria-label` the app gives replaces; `dismiss`, "Dismiss"; `more(more)`, "and n more";
`count(count)`, "n times"), plus native `section` props.

- **Placement:** `"bottom-end"` (the default), `"bottom-start"`, `"bottom"`, `"top-end"`,
  `"top-start"` or `"top"` sit at that corner or edge of the nearest positioned container (the
  app's workspace), padded by the safe-area insets; start and end follow the text's direction.
  `"inline"`, and a placement it does not know, draws it in the flow where the app put it (inside
  a canvas's own panel). The newest is nearest the edge: last at the bottom, first at the top,
  in the reading order as on screen, with "and n more" at the far end. It is at most 420 px wide,
  and the container's width less the gutters on a phone. It draws nothing with no toasts but its
  two empty live regions, so keep it mounted.
- **Each toast** says its text, then `×n` when it was shown n times (read as ", n times"), then
  its action (a press runs it and dismisses the toast) and a Dismiss button, which the text
  describes, so several read apart.
- **What is read:** two visually hidden live regions beside the stack, there before any toast
  ([U42](ux-rules.md#feedback)), say each toast's text (and ", n times") when
  it first shows and again when its count goes up, without its buttons: an `err` toast's in a
  `role="alert"` region, read at once, every other's in a `role="status"` one. A toast drawn again,
  or coming back from "and n more", is not read again, and a toast's words leave the regions when
  it goes. The toasts and the stack are not live regions, so nothing is read twice.
- **Hold:** while a mouse or pen is over the stack, or the focus is in it, `onHold(true)`; leaving
  it, the focus going elsewhere, the stack emptying under the pointer or the focus, or the
  toaster unmounting calls `onHold(false)`. A touch over it does not hold it; a tap that focuses
  one of its buttons does, as any focus in it.
- **Keyboard:** the buttons are in the Tab order. Escape on a focused toast dismisses it, and is
  not passed on (so a sheet or dialog behind it stays open). After a toast that held the focus is
  dismissed, the focus moves to the toast beside it, or back to where it came from into the stack
  when none is left.
- The buttons are `Button`s, so they keep a 36 px target on touch. A toast rises in over
  `--pb-motion-slow`, still under reduced motion; under forced colours the stripe stays, in the
  system's text colour.

### Commands and keys

**`CommandPalette`**: a search field over the app's commands, in a portal on `<body>`. `open`,
`onClose`, `commands: { id, label, group, keys?, hint?, run, disabled? }[]`, `at?: { x, y }`,
`platform?` (the keys' platform), `labels?` (its words, [rule 8](#rules-every-component-keeps):
`palette`, its name, "Commands"; `placeholder`, "Type a command"; `empty`, "No commands";
`noMatch(query)`, "No command matches “query”"; `keyNames`, `keyLabel`'s `names` for the keys,
none by default) and `className?`.

- **Commands.** Each is listed under its `group`, the groups in the order they first appear. `keys`
  (a key string or several, as [`useShortcuts`](#useshortcuts) takes them) is drawn through
  `keyLabel` and given as `aria-keyshortcuts`; the palette binds nothing. `hint` is a quieter
  second line (what the command does, or what it acts on), shown but not matched. A `disabled`
  command is listed, dimmed and `aria-disabled`; the keys skip it and a press on it does nothing.
  An option's name is its words as shown: the label, the hint and the keys.
- **Matching.** The query matches a label when its letters appear in it in order, in any case,
  white space ignored ("adn" matches "Add a node"). The best way the letters can be found is kept:
  the label's start and the start of a word (after a space or a mark, or a capital after a small
  letter) score more, letters together score more, gaps and a late start less. Each group's
  matches go best first and the groups by their best, ties in the order given; the matched letters
  are drawn in `<mark>`, in the accent and bold (underlined under forced colours), so a match never
  rests on colour alone. An empty query lists every command as given. `rankCommands(commands,
  query)`, `matchSubsequence(text, query)` and `markRuns(label, indices)` are the same steps,
  exported and pure.
- **Keyboard.** The focus stays in the field, a `combobox` controlling the `listbox`; the active
  command is its `aria-activedescendant`, the first enabled match after every keystroke and kept
  by `id` while the commands change. The arrows move one (wrapping at the ends), Page Up and Page
  Down a listful, Home and End to the first and last (Shift+Home and Shift+End stay with the
  field, to select its text), and Enter runs the active one. Running a command asks to close
  (`onClose`) and then calls `run`.
- **Closing.** Escape (not passed on to the page), Tab (as a combobox's list closes), a press
  outside the box, and the focus leaving it for another element call `onClose`. Opening focuses
  the field; closing gives the focus back to what had it, unless it already went elsewhere.
- **Placement.** Without `at` it is centred near the top over the scrim, 560 px wide at most (the
  width less the gutters on a phone). With `at` (a point in the window, where a press happened) its
  top-left corner sits there over a clear layer, 320 by 360 px at most, moved back inside the
  window less an 8 px gutter where it would cross an edge, and smaller in a smaller window; it
  follows the window as it resizes. `placePalette(at, window)` is that rule, and `PALETTE_WIDTH`,
  `PALETTE_HEIGHT` and `PALETTE_GUTTER` its sizes.
- **Empty and no match.** A `role="status"` line, there from the start so a screen reader hears
  the change, says `labels.empty` with no commands and `labels.noMatch(query)` when none match.
- On touch the field has 16 px text and the rows are at least 40 px tall. It fades in over
  `--pb-motion-fast`, still under reduced motion; under forced colours the active command keeps a
  frame in the system's highlight.

**`ShortcutSheet`**: the keys an app binds, listed in a [`Dialog`](#overlays). `open`, `onClose`,
`shortcuts: { keys, label, group }[]`, `children?` (a note under the lists), `platform?`,
`labels?` (its words, [rule 8](#rules-every-component-keeps): `title`, the dialog's title,
"Keyboard shortcuts"; `or`, "or"; `empty`, "No shortcuts"; `close`, "Close"; `keyNames`, as the
palette's) and `className?`.

- One section per group, in the order the groups first appear, named by its heading (an `h3`);
  each a `<dl>` of what a key does beside the key in a key cap, drawn through `keyLabel` and
  given as `aria-keyshortcuts`. Several keys that do the same are joined by `labels.or`.
  `groupShortcuts(shortcuts)` is the grouping, exported.
- It binds nothing: the app's `useShortcuts` table is usually where the lines come from. The rest
  (focus, Escape, the scrim, phone width) is `Dialog`'s.

### Code

**`DiffView`**: unified diff text, drawn line by line in code type on the code surface. Either
`diff` (one diff, drawn whole without a heading) or `files: { path, diff }[]` (one section per
file, in order), plus `level?` (the files' headings, h2 to h6, h3 by default), `collapsed?` (the
paths folded away), `onToggle?(path, open)`, and native `div` props.

- **Lines:** each keeps its `+` or `-`, so a change never rests on colour alone. Added lines are in
  `--pb-added` and removed ones in `--pb-removed`, each with a bar of its tone at the start; hunk
  headers (`@@`) are in `--pb-code-directive`; git's header lines (`diff --git`, `index`, `---`,
  `+++`) and `\ No newline at end of file` in `--pb-code-comment`. CRLF reads as LF.
- **Files:** each is a heading holding a button labelled by the file's name (the path's last part),
  with the whole path as its title. The button folds the file (`aria-expanded`, `aria-controls`).
  With `collapsed` the app holds the fold and a press only calls `onToggle`; without it the view
  keeps its own, every file open at first, and still calls `onToggle`.
- A wide diff scrolls sideways; each diff body is a tab stop, so it scrolls from the keyboard too.
  On touch the heading buttons are at least 36 px tall with 16 px words. The chevron turns on
  `--pb-motion-fast`, so it is still under reduced motion.

**`CodeEditor`**: a text editor for configuration text, with highlighting, line numbers and the
app's diagnostics. `value`, `onChange?(value)`, `language?: "knobly"`, `highlight?`,
`diagnostics?: { line, column?, severity, message, code? }[]`, `readOnly?`, `onCaret?({ line,
column, offset })`, `lineNumbers?` (true by default), `indent?` (what Tab inserts, a tab by
default), `labels?` (its words, [rule 8](#rules-every-component-keeps): `diagnostic(d)`, how a
diagnostic is read and shown on its mark, "Line 3, column 5: error E1: message"; `tabKey`, "Tab
indents. Press Escape, then Tab, to move on."; `defaultCodeEditorLabels`), plus native `textarea`
props.

- **How it is drawn.** A native textarea holds the text, the caret, the selection and every edit,
  its glyphs transparent; a highlighted copy of what it shows is drawn behind it, sharing every
  metric (code face, `--pb-code-size`, line height, padding, a 4-column tab, no wrapping), and
  follows its scroll. No editor library is used. CRLF and a lone CR are shown as LF (a textarea
  holds LF only), so an edit gives the text back with LF; the last line keeps its height, and the
  copy has room past the end, so it scrolls as far as the textarea. Under forced colours the copy
  goes and the plain textarea is drawn in the system's colours.
- **The textarea is the component** for everything but layout: `id`, `aria-*`, `ref`, `rows`,
  `name`, `placeholder` and every other native prop go to it, so a [`Field`](#forms) names and
  describes it; `className` and `style` go to the frame around the gutter and the box. It sizes
  by `rows`, or fills a frame the app sizes, and can be resized vertically. `readOnly` draws it on
  `--pb-code-surface-readonly`.
- **Highlighting.** `highlight` wins over `language`. `highlight(text)` is the app's highlighter:
  from the shown text (LF line breaks) to spans `{ start, end, class }` (offsets into it, `end`
  exclusive), pure and total. Spans are clipped to the text and empty ones ignored; where two
  overlap the later one wins; text no span covers is plain. The classes `directive`, `keyword`,
  `word`, `variable`, `number`, `string`, `comment`, `punctuation` and `error` are drawn in the
  code tokens (`--pb-code-*`, [`tokens.md`](tokens.md#the-tokens)); `space` and any other class
  are drawn as plain text. `language: "knobly"` highlights [knobly](https://github.com/mcurcio/knobly)
  text with knobly's own highlighter (`knobly/highlight`), imported from the optional `knobly`
  peer the first time a view asks for it, once for the page (`loadKnobly()` starts it early); the
  text is plain until it has loaded, and stays plain, with one warning on the console, when
  `knobly` is not installed. Any other language is drawn as plain text.
- **Diagnostics.** A diagnostic's `line` and `column` count from 1, the column in UTF-16 code
  units (a tab is one); a line past the end is read as the last. Each line a diagnostic names gets
  a mark in the gutter by its worst severity: a circle in `--pb-err` for `error`, a diamond in
  `--pb-warn` for `warning`, and a ring in `--pb-muted` for any other severity, so the severity
  never rests on colour alone; the mark's tooltip lists the line's diagnostics. Under the text a
  wavy line in the same tone runs from the column to the end of the word there (one character on
  white space), or under the line's text when there is no column; where marks overlap, error
  wins over warning over any other. A press on a gutter mark focuses the textarea and puts the
  caret at the line's first diagnostic. The gutter and the copy are hidden from screen readers:
  every diagnostic is read, in the order given, as part of the textarea's description, after the
  app's own `aria-describedby` (a `Field`'s hint and error), through `labels.diagnostic`. The
  description is not live, so it is not announced on every keystroke.
- **Keyboard.** Tab inserts `indent` in place of a selection within one line; across lines it
  indents each line the selection touches (empty lines are left alone). Shift+Tab outdents each
  line the caret or selection touches by `indent`, a tab, or up to the indent's width in spaces
  (4 for a tab). **Escape, then Tab** (or Shift+Tab) moves the focus on as usual, so the keyboard
  can always leave; Escape counts for the next key only, and is not stopped, so a dialog around
  the editor still closes on it. While it can be edited, `labels.tabKey` is read in its
  description. Read-only, Tab always moves on. Tab's edits go through the browser's own editing
  (`execCommand("insertText")`, the one way to keep the undo history, so Ctrl+Z takes an indent
  back), and by value where the browser has none. `tabEdit(text, start, end, indent, out)` is the
  rule, exported and pure.
- **The caret.** `onCaret` is called when the caret moves (a key, a press, an edit, a gutter mark),
  once per place, with its line and column (from 1) and offset; the caret is the selection's
  moving end. `caretAt(text, offset)` and `offsetAt(text, line, column)` are the conversions, and
  `shownText`, `codeRuns`, `gutterRows` and `markLevel` the other steps, exported and pure.
- **The gutter** numbers every line in `--pb-muted` on `--pb-sunken`, as wide as the widest
  number. On touch the text (and the gutter's) is 16 px, as `--pb-code-size` is there, and each
  mark's hit area is 36 px square, centred on it (where marks sit on neighbouring lines they share
  the overlap, and the gutter's edge clips it), while the mark drawn stays 7 px. The marks are a
  pointer shortcut; the keyboard reaches each diagnostic by its line and column. It does not
  animate, so there is nothing to stop under reduced motion.

**`CodeText`**: read-only highlighted text, in code type on the read-only code surface. `value`,
`language?: "knobly"`, `highlight?` (highlighted as `CodeEditor` is, `highlight` winning), plus
native `pre` props (`ref` included; name it with `aria-label` where no heading does). CRLF reads as
LF; lines are kept as written, and a wide one scrolls sideways; the box is a tab stop, so it
scrolls from the keyboard too. It has no words of its own, so no `labels`.

## Shell (`/shell`)

```ts
import { AppShell, clampDrawerHeight, clampInspectorWidth, drawerBounds, inspectorBounds } from "@mcurcio/patchbay/shell";
```

The shell is drawn with primitives and hooks: importing `/shell` loads `/primitives` and its
stylesheet, and `/hooks`.

### `AppShell`

The usual layout of a graph editor: a top bar, the canvas, an inspector at the inline end (the
right in left-to-right text) and a drawer along the bottom, filling the screen.

```tsx
<AppShell
  topBar={{ brand, status, start, end }}
  inspector={{ title, actions, content, open, onOpen, width, onWidth }}
  drawer={{ header, content, open, onOpen, height, onHeight }}
  labels={labels}
>
  {canvas}
</AppShell>
```

- **`topBar?`**: slots drawn in reading order (left to right in left-to-right text): `brand` (the
  app's mark or name), `status` (a short state, a connection's `Pill`), `start` (the app's
  controls, taking the free width and giving it up first) and `end` (at the far end: a theme
  switch, a menu). The bar is `--pb-bar` high (44 px) and a `<header>`. Without `topBar` there is no bar.
- **`children`**: the canvas, filling the workspace, a `<main>`; the app's `<ReactFlow>` goes
  here.
- **`inspector?`**: `title?`, `actions?`, `content`, `open`, `onOpen(open)`, `width` (px) and
  `onWidth(px)`. With a `title` (the selection's name) or `actions`, the shell draws the inspector's
  one header row itself and `content` is the body under it: on a wide window a [`Panel`](#layout)'s
  header (the title as its h2, the actions at its far end); in the narrow window's sheet the
  sheet's own header row, the title, the actions and the close button side by side, never a close
  row above another header. Without either, `content` is drawn as given (usually a `Panel`, which
  scrolls on its own). On a wide window, while open, it is a region
  named "Inspector" beside the canvas, `width` px wide, with a vertical [`Splitter`](#layout) on its
  inline start edge that calls `onWidth`; while closed it is not drawn. The app shows and hides it
  with its own control (in the top bar, or on a selection); the shell draws no button of its own
  for it on a wide window.
- **`drawer?`**: `header` (beside its show and hide button), `content`, `open`, `onOpen(open)`,
  `height` (px, the open drawer's whole height, header included) and `onHeight(px)`. Its header is
  always shown; its button ("Show the drawer" or "Hide the drawer", with `aria-expanded`) calls
  `onOpen(!open)`. While open, a horizontal `Splitter` on its top edge calls `onHeight`. While
  closed its body stays mounted, hidden, so what it holds (a draft, a caret, a scroll position) is
  there when it opens. It spans the window's width, under the canvas and the inspector.
- **`labels?`** (its words, [rule 8](#rules-every-component-keeps)): `inspector` ("Inspector"),
  `drawer` ("Drawer"), `resizeInspector` ("Resize the inspector"), `resizeDrawer` ("Resize the
  drawer"), `showDrawer` ("Show the drawer"), `hideDrawer` ("Hide the drawer") and `close`
  ("Close", the inspector sheet's close button). `className?` is added to its own.

**Sizes.** The inspector is held to 280–560 px (`inspectorBounds`), the drawer to 120 px and 70 %
of the window's height (`drawerBounds`, followed as the window resizes). A size out of bounds, or
not a finite number (one kept from a larger window), is drawn within them, in whole px, and not
written back: `onWidth` and `onHeight` are called only when the person moves a splitter.
`clampInspectorWidth(px)`, `drawerMaxHeight(windowHeight)` and `clampDrawerHeight(px,
windowHeight)` are the same rules, for an app's own checks.

**Narrow windows.** It reads [`useMediaBreakpoint`](#usemediabreakpoint): below 760 px the inspector
is a [`Sheet`](#overlays) over the canvas's inline end (the left in right-to-left text, where the
wide inspector is too), `width` px wide (and 48 px short of the canvas); below 600 px it rises from
the bottom, at most 62 % of the workspace. The sheet is named by the inspector's `title`, or by
`labels.inspector` without one, and has no splitter; its close button and Escape inside it call
`onOpen(false)`. Moving between widths draws the inspector's `content` afresh (it moves between the
region and the sheet), so state it must keep belongs to the app. The root has `data-layout` (`wide`,
`narrow` or `phone`) for the app's own stylesheet.

**Escape.** The shell's only Escape is the inspector sheet's, and it acts while the focus is in the
sheet; a dialog, the palette or the shortcut sheet the app opens over it closes first, in the order
[U19](ux-rules.md#escape) gives. On a wide window Escape in the inspector is the app's.

**The whole screen.** The shell is `100dvh` high (`100vh` where `dvh` is unknown), so a phone's
browser bars never hide its foot. Each edge pads itself by its safe-area inset (the bar the top,
the drawer the bottom, both and the workspace the sides), so the bar's and the drawer's faces reach
the screen's edges while their contents clear a notch or a home indicator; the left and right
insets pad the left and right sides in right-to-left text too. The insets are non-zero only when
the app's page asks for them: `<meta name="viewport" content="width=device-width,
initial-scale=1, viewport-fit=cover">`.

**It keeps no data.** Sizes and open states are the app's props; an app keeps them across visits
with [`usePersistentState`](#usepersistentstate), checking a kept width with
`clampInspectorWidth` (Storybook's `Kept` story).

- **Keyboard:** the splitters as `Splitter`'s keys (arrows, Home, End; in right-to-left text the
  inspector is on the left and its splitter mirrors); the drawer's button and the sheet's close
  button are buttons.
- **Touch:** the splitters' hit areas are 36 px and the drawer's button 36 px, as the primitives'.
- **Motion:** the shell animates nothing of its own; the sheet's entrance stops under reduced
  motion. Forced-colours mode draws its edges in the system's colours.

## Hooks (`/hooks`)

### `usePersistentState`

`usePersistentState(key, initial, check, { storage? })` returns `[value, setValue]`: React state
kept in `localStorage` under `key`. The key is the app's whole key, its own prefix included, so two
apps on one origin never share a value (a version in the prefix moves when a value's shape
changes).

- It starts from the kept value when `check(value: unknown)` returns one, else `initial`; `check`
  returns the value (or one made from it) or `undefined`. Text that is not JSON, or fails the check,
  is ignored.
- Every read and write is in `try`, so a private window, blocked storage or a full quota leaves a
  value that lasts the page's life, not a failure.
- `initial` is never written; only values the app sets are. A new `key` reads that key afresh.
- `storage` replaces `localStorage` (a `StorageLike`; `null` keeps nothing). `readKept`,
  `writeKept` and `browserStorage` are the same steps outside React.

### `useTheme`

`useTheme({ key?, storage?, root? })` returns `[choice, setChoice]`, `choice` being `"system"`,
`"light"` or `"dark"`. It keeps the choice through `usePersistentState` under `key`
(`"patchbay/theme"` by default; an app names its own) and writes it to `data-theme` on `<html>` (or
`root`) before paint; system removes the attribute, so the page follows the system
([`tokens.md`](tokens.md#the-theme)).

`themeScript(key)` returns the body of an inline `<script>` for the app's `index.html`: it applies
the kept choice before the first paint, so a dark page never flashes light. The helpers
`nextTheme`, `checkTheme`, `applyTheme`, `themeChoices`, `defaultTheme` and `defaultThemeKey` are
exported too.

### `useShortcuts`

`useShortcuts(bindings, { enabled?, platform? })` binds a table of keys on the window while the
component is mounted. Each binding is `{ keys, run, inTextFields?, enabled?, repeat?,
preventDefault? }`; the table may change every render, and the one listener always reads the latest.
`enabled: false` turns the whole table off (while a dialog the keys must not reach is open, say).

- **Key strings.** Modifiers then the key, joined by `+`: `"Mod+K"`, `"Mod+Shift+Z"`, `"Shift+?"`,
  `"Delete"`, `"Escape"`. `Mod` is Cmd on Apple platforms (macOS, iOS, iPadOS) and Ctrl elsewhere;
  `Ctrl`, `Alt`, `Shift` and `Meta` are those keys on every platform. The key is a `KeyboardEvent`
  key name or the character it types, in any case; `Space`, `Esc` and `Plus` (or `"Mod++"`) are read
  too. `keys` may be a list of strings that do the same (`["Delete", "Backspace"]`). The table is
  also what a [`ShortcutSheet` or `CommandPalette`](#commands-and-keys) shows, through `keyLabel`.
- **Matching.** A press matches when its key is the string's and its Ctrl, Meta, Alt and Shift are
  exactly the ones named, except that a character Shift itself makes (`?`, `!`) need not name
  Shift; a digit always does (`Shift+1` is not `1`). A letter or digit that Alt or the keyboard layout turned into another character is found
  by its physical key (`event.code`), so `Alt+K` works on a Mac and `Mod+K` on a Cyrillic layout;
  a Latin letter that differs is another key. A string naming a modifier it does not know never
  matches.
- **The first binding that matches runs**, and only it; the browser's own action for the key is
  prevented unless the binding says `preventDefault: false`. A held key's auto-repeat acts only
  with `repeat: true`. A press a component already handled (`defaultPrevented`, as `Dialog`'s and
  `Sheet`'s Escape are) and a press inside an input method's composition are left alone.
- **Text fields.** While focus is in a text field, single keys and Escape never act: the field
  keeps them. A chord (a key with Mod, Ctrl, Alt or Meta) acts there only when its binding says
  `inTextFields: true`, as a command palette's `Mod+K` does. `isTextTarget(target)` is the test: a
  text-like `<input>` (not a checkbox, radio, range, button, colour or file input), a `<textarea>`,
  a `<select>`, editable content, or anything inside an element with React Flow's `nokey` class,
  which React Flow's own keys skip too. So the canvas's Delete and the app's never both act on one
  press, and a control that keeps its own keys inside the canvas is marked `nokey` once for both.

`keyLabel(keys, { platform?, names? })` writes a key string as people read it: `⌘K`, `⇧⌘Z`, `⌫`
and `⌦` on Apple platforms (modifiers as symbols in the order ⌃⌥⇧⌘), `Ctrl+K`, `Ctrl+Shift+Z`,
`Backspace` and `Delete` elsewhere; `Esc`, `Space`, arrows and `Page Up` on both. `names` replaces
the words, keyed by key name (`Escape`, `Space`, `ArrowUp`) or modifier (`Ctrl`, `Alt`, `Shift`,
`Meta`). A key with no word of its own (`F5`) is shown by its name, and a string it cannot read as
written. `ariaKeyShortcuts(keys, platform?)` writes the same as an `aria-keyshortcuts` value
(`Meta+K`, `Control+K`). `matchesKeys(event, keys, platform?)`, `findShortcut(event, bindings,
platform?)` and `detectPlatform()` are the same steps outside React.

### `useMediaBreakpoint`

`useMediaBreakpoint()` returns `{ width, touch }`: `width` is `"wide"`, `"narrow"` below 760 px or
`"phone"` below 600 px (the shell's three widths), and `touch` is true where the main pointer is
coarse and cannot hover (`(hover: none) and (pointer: coarse)`, the query behind the components'
touch sizes). It reads the media queries through `useSyncExternalStore`, so it follows the window
as it resizes or a pointer changes, and returns the same object while the answer is unchanged.
With no window to ask (on a server, before hydration, or with no `matchMedia`) it answers wide and
not touch.

`narrowBelow` (760), `phoneBelow` (600), `mediaQueries` (the three queries, for an app's own
stylesheet or `matchMedia`), `widthOf(px)` and `readBreakpoint()` are exported too.

### `useLiveValue`

`useLiveValue(subscribe, read, onValue?)` reads a hot value (one that changes many times a second:
a level, a rate) outside React state, so the component never re-renders for it. `subscribe(listener)`
adds a listener that means a new value is ready and returns what removes it; `read()` returns the
value. On subscribing, and on every call of the listener, it reads the value, keeps it in the ref it
returns and passes it to `onValue`, which paints it through refs (sets a text node, a CSS variable).

- It subscribes in a layout effect, so the first paint shows the value, and unsubscribes on
  unmount; a call that comes after that is ignored.
- `read` and `onValue` may change every render without subscribing again. A new `subscribe`
  subscribes afresh and reads at once, so pass a stable one (a store's own method, or one kept in a
  ref or memo).
- It throttles nothing: `onValue` runs on every notification. A painter that needs a frame asks for
  one itself, as [`Meter`](graph.md#meter) does.

### `useToasts`

`useToasts({ duration?, coalesceWindow?, visible?, now? })` holds a queue of toasts and returns
`{ toasts, show, dismiss, clear, toasterProps }`; `<Toaster {...toasts.toasterProps} />` draws it
([`Toaster`](#news-and-state)). The wording is the app's; the queue's mechanics are here.

- **`show({ tone, text, key?, action?, duration? })`** adds a toast as the newest and returns its
  id. `text` is any node. A toast shown under the same `key` within `coalesceWindow` (5000 ms) of
  that key's last showing is the same toast: its count goes up (drawn `×n`), it takes the newest
  tone, text and action, becomes the newest and starts its time afresh. Without a key a toast never
  coalesces.
- **Expiry:** each toast lasts `duration` (8000 ms), or its own `duration` (`Infinity` keeps it until
  dismissed), on the monotonic clock (`performance.now`, or `now` in tests); one timer waits for the
  soonest, and is set again if it fires before the clock says that toast is over. While the
  `Toaster` holds the queue (hovered or focused) none expires; letting go moves each expiry on by
  the time it was held (since the hold began, or since it was last shown if that came later), so no
  toast goes while the person reads it.
- **Shown:** the newest `visible` (4), oldest first, are `toasterProps.toasts`; the older ones are
  counted in `toasterProps.more` ("and n more") and still expire.
- `toasts` is the whole queue, oldest first; `dismiss(id)` and `clear()` take toasts away. `show`,
  `dismiss`, `clear` and `toasterProps` keep their identity while nothing changes.

The queue is pure and exported for use outside React: `addToast`, `dismissToast`, `clearToasts`,
`holdToasts`, `expireToasts`, `nextToastExpiry` and `visibleToasts` each take the queue (from
`emptyToastQueue`) and the time and return a new queue, and `toastDefaults` holds the three
defaults.
