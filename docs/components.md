# Components

What patchbay has built, layer by layer: what each component is for, its props, and how it behaves
from the keyboard and on touch. Storybook shows every state of each under the base theme and the
example brands, light and dark; the props' own doc comments (in each `Name.tsx`) are the reference
for every field.

```ts
import { Button, Field, TextInput } from "@mcurcio/patchbay/primitives";
import { usePersistentState, useTheme } from "@mcurcio/patchbay/hooks";
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
7. **Keyboard, touch and reduced motion are built in.** Focus is visible (a 2 px ring in the
   accent); every action has a keyboard path; on a touch screen (`(hover: none) and (pointer:
   coarse)`) targets are at least 36 px (40 px in a tool group) and text fields are 16 px, since
   iOS zooms a smaller one; every animation stops under `prefers-reduced-motion`. Forced-colours
   mode keeps edges and states visible.
8. **No app's words.** A component takes its words as props. The few defaults it has ("Close",
   the theme switch's words) are props too, each replaceable.

Common prop names mean the same everywhere:

| Prop | Means |
|---|---|
| `tone` | What a state or action is, by colour; an open enum |
| `size` | `md` (the default) or `sm`, the compact one for dense rows |
| `label` | The accessible name, or the words a screen reader reads (`Pill`'s and `Checkbox`'s are also shown) |
| `title` | On `Dialog`, `Sheet` and `Panel`, the heading that also names it; elsewhere the native hover tooltip |
| `actions` | A slot at the far end of a header, or the foot of a dialog |
| `open`, `onClose` | Shown or not, held by the app; `onClose` asks the app to set `open` to false |
| `className` | Added to the component's own `pb-` class, never replacing it |

Components built on a native element (`Button`, `TextInput`, `Select`, `Checkbox`, `Field`,
`Splitter`, `Toolbar`, `Panel`, `Spinner`, `ThemeSwitch`, and `RadioGroup` to its fieldset) pass
every other native prop through, `ref` included (React 19's `ref` as a prop).

## Primitives (`/primitives`)

### Actions

**`Button`**: a push button. `tone?: "neutral" | "primary" | "danger"` (neutral by default; one
primary per view), `size?`, `busy?`, plus native button props.

- `type` defaults to `"button"`, so a button in a form never submits it unless asked
  (`type="submit"`).
- **Busy** shows a `Spinner` over the words, which stay in place so the width holds and the
  accessible name is kept. The button says `aria-busy` and `aria-disabled` and ignores presses (a
  busy submit button does not submit), but stays focusable, so focus is not lost while a request
  is on its way.
- `aria-pressed` draws it in the accent on the sunken face: a toggle.
- Disabled drops the tone. On touch it is at least 36 px tall.

**`IconButton`**: a square glyph button on `Button`'s rules (`tone`, `size`, `busy`, pressed).
`label` (required) is its accessible name and, unless `title` is given, its tooltip; `children` is
the glyph, hidden from screen readers. 28 px (22 px when `sm`), borderless until hovered, pressed or
toned; 36 px on touch, 40 px in a `ToolGroup`.

**`ThemeSwitch`**: one button that cycles system, light and dark. `choice`, `onChoose(next)`,
`labels?` (a partial `ThemeSwitchLabels`: `theme`, `system`, `light`, `dark`, `systemHint`,
`clickFor`; `defaultThemeSwitchLabels` are English). It shows an icon and the choice's word; its
name is "Theme: dark", its tooltip says what a press does (`themeSwitchTitle`). Below 600 px the
word gives way to the icon alone. 36 px on touch. The choice is the app's, kept by
[`useTheme`](#usetheme).

### State

**`Pill`**: a state as a dot and its word, both in the state's tone, so the state never rests on
colour alone (a node's state). `tone: "ok" | "warn" | "err" | "quiet" | "off"` (open), `label` (the
word), `pulse?` (the dot pulses, never the word, while the state is on its way; still under reduced
motion), `title?`, `detail?` (a slot after the word in code type: a failure's code).

**`Badge`**: a short word or count in a chip of its tone, outlined on the sunken surface (warn and
err on their soft surfaces). `tone` (as `Pill`'s), `children`, `title?`.

**`WarnMark`**: an "!" in a circle for something that rose lately, beside a badge's words.
`label` is what a screen reader reads in its place (the glyph is hidden); `title?` is the hover
text.

**`Spinner`**: the busy mark, an open ring in the current text colour, turning once per
`--pb-motion-spin` and still under reduced motion. Without `label` it is decoration, hidden from
screen readers (as inside a busy `Button`); with one it is a `role="status"` that announces it.

### Text and facts

**`SectionTitle`**: a section's heading with its `actions?` slot at the far end. `children`,
`level?` (h2 to h6, h3 by default).

**`KeyValue`**: facts as a `<dl>`, keys and values side by side. `rows: { key, value, tone?,
title? }[]` (a row's `tone` colours its value; its `title` is the key's tooltip; two rows may share
a key), `label?` (the list's name when no heading gives one).

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
inspector"), `edge?: "start" | "end"` (which edge of the pane it sits on; at the start, left or
top, moving left or up grows the pane), `step?` (px per arrow key, 16 by default).

- **Keyboard:** the arrow toward growth adds a step, the opposite one takes one away; Home goes to
  `min`, End to `max`. Keys with Ctrl, Alt or Meta are left alone.
- **Pointer:** the main button drags it, with pointer capture; it takes the focus and has
  `data-dragging` while dragging.
- It sits absolutely on one edge of its positioned parent. The bar is 6 px; on touch its hit area is
  36 px.
- `edge` is physical: in right-to-left text the keys and the drag are not mirrored.

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
(also its name), `children`, `actions?` (a row at its foot), `closeLabel?` ("Close").

- Opening focuses a control the content focused itself (`autoFocus`), else the body's first
  control, else the dialog. Closing gives focus back to what had it.
- Tab and Shift+Tab stay inside, and focus that wanders out is brought back; with several open,
  only the topmost keeps it.
- Escape (not passed on to the page), the close button, and a press that starts on the scrim call
  `onClose`.
- The body is a tab stop of its own, so a long one scrolls from the keyboard. At phone width the
  box takes the whole width less the gutters. It fades and rises in, still under reduced motion.

**`Sheet`**: a panel over its container's right edge, or rising from its bottom, as an inspector
on a narrow window or a phone. `open`, `onClose`, `side?: "right" | "bottom"` (right by default),
`title?` (or `label?`, its name without one), `children`, `width?` (a right sheet's width in px,
held to 280–560 px and 48 px short of its container; 360 by default), `closeLabel?` ("Close").

- It is not modal: the page stays live, and opening it does not take the focus. Escape inside it
  and its close button call `onClose`; if it closes holding the focus, the focus goes back to where
  it came from.
- From the bottom it is the full width, at most 62 % of the height, rounded at the top and padded
  by the bottom safe-area inset.
- It is placed absolutely, so its container (the app's workspace) is positioned. The app chooses
  the side (the right below 760 px, the bottom below 600 px).

## Composites (`/composites`)

Composites are drawn with primitives: importing `/composites` loads `/primitives` and its
stylesheet too. Their few default words ("Dismiss") are props, as the primitives' are.

### News and state

**`Banner`**: a line of news across a pane or page (a conflict, a lost connection, a refused edit),
on a raised surface with a stripe in its tone at the start (warn and err on their soft surfaces).
`tone: "ok" | "warn" | "err" | "quiet" | "off"` (open; one it does not know keeps a plain stripe),
`children` (the news), `actions?` (a slot at its end: the buttons that act on it), `onDismiss?`
(shows a close button that calls it), `dismissLabel?` ("Dismiss"), plus native `div` props.

- An `err` banner is `role="alert"`, read at once; every other tone is `role="status"`, read when
  the screen reader is free. The role is the banner's own.
- The words wrap and the actions drop under them in a narrow pane. The close button is an
  `IconButton`, so it keeps a 36 px target on touch.

**`StatusWords`**: a short row of states, each a word in its tone, a dot between each two (a pane's
"2 errors · 1 warning · saved"). `items: { tone, label, title? }[]` (tones as `Pill`'s, open),
drawn in the order given, which is most urgent first, plus native `ul` props (name it with
`aria-label`).

- The list is one `aria-live="polite"` region (an app may pass another `aria-live`), so a screen
  reader reads a change when it is free; it stays in the page while empty, ready for the next
  change. The dots are drawn, not read.

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
