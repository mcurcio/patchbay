# UX rules

The rules every screen built on patchbay keeps, numbered U1… so other pages, reviews and beads can
cite them. How to read a rule (Built, The app's, Not yet):
[`language.md`](language.md#reading-these-pages).

## Focus and keyboard

- **U1. Focus is always visible.** A 2 px ring in the accent on `:focus-visible`: 2 px outside a
  discrete control, 1 px outside a field or a packed tool, inset 2 px on a scroll body or a code
  box. **Built:** every control's stylesheet; `base.css` for the page. **Not yet:** the Splitter
  shows focus as an accent fill with no ring (pb-nx9.69), and the DiffView fold toggle's ring
  has no offset (pb-nx9.70).
- **U2. Every action has a keyboard path.** A gesture only a pointer can make has a keyboard path
  beside it: adding at a point is the app's add command ([`graph.md`](graph.md#useaddat)); a
  gutter mark is the caret moved by line and column ([`components.md`](components.md#code),
  CodeEditor); connecting two ports is the inspector's "Connect to" choice for each port
  ([patterns](patterns.md#connecting)); moving a node, where dragging is allowed, is React Flow's
  arrow keys on the selected node. **Not yet:** patchbay gives no list of the ports `canConnect`
  accepts for one port, which the "Connect to" choice needs: pb-nx9.81.
- **U3. A group of tools is one Tab stop.** Arrows move within it and wrap, Home and End go to the
  ends, arrows swap in right-to-left text, and the last focused item keeps the stop. **Built:**
  Toolbar, ToolGroup, CanvasTools ([`components.md`](components.md#layout)).
- **U4. A field keeps its own keys.** A text field in a toolbar keeps its arrows, a key with a
  modifier is left to the app, and a nested toolbar keeps its items. **Built:** Toolbar.
- **U5. Busy keeps focus.** A busy button stays focusable, ignores presses, keeps its width and
  says its `busyLabel`. **Built:** Button, IconButton ([`components.md`](components.md#actions)).
- **U6. Unavailable is native `disabled`,** out of the Tab order, except where the control must
  still say something: a busy button, and a palette command listed but not available now, which
  stay focusable with `aria-disabled`. **Built:** Button, CommandPalette; native `disabled` on the
  rest.
- **U7. A scroll region is reachable from the keyboard.** A body that is the whole of a modal or a
  sheet, and a box of code, is always a tab stop, so the keyboard always finds it; a Panel, which a
  page may hold many of, is one only while it overflows, so short panels add no stops. **Built:**
  Dialog, Sheet, DiffView, CodeText, Panel.
- **U8. A modal holds the focus.** Opening focuses an `autoFocus` control, else the first control,
  else the box; Tab is trapped; closing gives the focus back to what had it; of several, only the
  topmost holds it. **Built:** Dialog, and ShortcutSheet through it
  ([`components.md`](components.md#overlays)). **Not yet:** nested dialogs mounted in one commit:
  pb-nx9.27. The palette is a combobox, not a trap: the focus stays in its field, and Tab or the
  focus leaving closes it ([`components.md`](components.md#commands-and-keys)).
- **U9. A non-modal sheet does not take the focus,** and if it closes holding the focus, the focus
  goes back to where it came from. **Built:** Sheet.
- **U10. Focus never falls to the page.** After a focused toast is dismissed the focus moves to its
  neighbour, or back to where it came from. **Built:** Toaster
  ([`components.md`](components.md#news-and-state)).
- **U11. Text fields keep their keys.** Single keys and Escape never act in a text field; a chord
  acts there only when its binding opts in. A control that keeps its own keys inside the canvas is
  marked `nokey`. **Built:** useShortcuts ([`components.md`](components.md#useshortcuts)).
- **U12. One way to write a key.** `Mod` is Cmd on Apple platforms and Ctrl elsewhere; keys are
  shown through `keyLabel` and announced through `aria-keyshortcuts`. **Built:** useShortcuts,
  CommandPalette, ShortcutSheet, CanvasTools.
- **U13. patchbay shows keys, the app binds them.** A component binds only its own local keys; the
  palette, the shortcut sheet and the canvas tools show the app's. **Built:** CanvasTools
  `keyShortcuts`, ShortcutSheet, CommandPalette.
- **U14. A handled press is left alone.** A press marked `defaultPrevented`, or inside an input
  method's composition, does nothing more. **Built:** useShortcuts, Toolbar, Splitter, Dialog,
  Sheet, Toaster, CodeEditor.
- **U15. The keyboard can always leave a text editor:** Escape, then Tab, moves on, and the editor's
  description says so. **Built:** CodeEditor.
- **U16. Undo history survives a programmatic edit.** **Built:** CodeEditor's Tab.
- **U17. React Flow owns the canvas's focus.** Node and edge focus, selection, dragging and Delete
  are React Flow's; patchbay adds no tab stops beyond its slots, and draws the ring React Flow does
  not. **Built:** NodeBox ([`graph.md`](graph.md#nodebox)). **Not yet:** a focused Wire has no look
  of its own; only `selected` restyles it: pb-nx9.71.
- **U18. The standard keys.** Every app binds Mod+K to the whole palette (adding is one group in
  it, never the palette's only use), `?` to the shortcut sheet, Delete and Backspace to removing
  the selection, F to fit, A to add, and, where its model has them, Mod+S to commit and Mod+Z to
  take back; Escape clears the selection last (U19). **The app's:** patchbay binds none of them
  (U13).

## Escape

- **U19. Escape closes the innermost thing first,** and marks the press handled, so nothing behind
  it acts on the same press. The order:
  1. a focused toast;
  2. the palette, a dialog or the shortcut sheet;
  3. the inspector sheet, while the focus is in it;
  4. the app's own Escape, which clears the selection.

  **Built:** Toaster, CommandPalette, Dialog, Sheet, AppShell
  ([`components.md`](components.md#appshell), Escape); the fourth is the app's.
- **U20. An editor inside a dialog does not keep Escape,** so the dialog around it still closes.
  **Built:** CodeEditor.
- **U21. The shell's only Escape is the inspector sheet's.** On a wide window, Escape in the
  inspector is the app's. **Built:** AppShell.
- **U22. Escape never discards typed work.** Closing a dialog or a sheet asks the app to close it
  and keeps no draft of its own, so a draft the app holds is still there; a draft left in the
  inspector survives the window crossing a width. **Built:** Dialog, Sheet, AppShell's drawer.
  **Not yet:** the inspector's content is drawn afresh when the window crosses 760 px, which drops
  a draft held in it: pb-nx9.88.

## Words

- **U23. A component's own words come through `labels`**
  ([`components.md`](components.md#rules-every-component-keeps), rule 8). **Built:** every
  component. **Not yet:** Meter's default name, "Level", is a plain prop default: pb-nx9.66.
- **U24. The app's content is a prop of its own:** a Field's or a Pill's `label`, the names
  Splitter and Toolbar require, `busyLabel`, what a Meter measures. **Built:** the prop types.
- **U25. Default words are plain English,** in sentence case, actions as verbs with their object
  ("Zoom in", "Fit the view", "Resize the inspector"), and never pointer-only ("press", not
  "click"). **Built:** the defaults. **Not yet:** ThemeSwitch's tooltip says "click for":
  pb-nx9.67.
- **U26. An icon-only control is named,** and its tooltip defaults to its name. **Built:**
  IconButton (`label` required).
- **U27. A glyph is hidden;** the control's name carries it (F49). **Built:** every SVG glyph.
- **U28. A removal names what goes.** A destructive action's label says its consequence ("Remove
  the node and its connections"), on a `danger` button. **Built:** Button `tone="danger"`. **The
  app's:** the words.
- **U29. A state is a word the person reads,** never an internal code; a code may follow the words,
  in code type. **Built:** Pill `label` and `detail`.
- **U30. "Close" and "Dismiss".** "Close" for what the person opened (a dialog, a sheet, the
  inspector); "Dismiss" for news that came by itself (a banner, a toast). Both are one look, the
  close glyph on an IconButton named by the word. **Built:** Dialog, Sheet and AppShell's
  inspector sheet (Close); Banner and Toaster say Dismiss. **Not yet:** Banner draws its own glyph
  and a toast's Dismiss is a text button: pb-nx9.84.
- **U31. An error says what happened, then what to do,** in plain words; the source's code comes
  after them, in code type (U29). **The app's:** the words of its errors.

## States

- **U32. Busy is a spinner over the words,** the width held, still focusable; a labelled Spinner
  is a status. **Built:** Button, IconButton, Spinner ([`components.md`](components.md#state)).
- **U33. On its way is shown, never blocking:** a pulsing dot (Pill `pulse`) or a ghost wire, and
  the rest of the screen stays usable. **Built:** Pill, GhostWire.
- **U34. An empty list says so,** in a status line there from the start. **Built:** CommandPalette,
  ShortcutSheet.
- **U35. An empty canvas says what to do,** in words drawn on the canvas itself: the app's words
  and the add gestures, gone with the first node
  ([patterns](patterns.md#empty-loading-and-offline)). **Not yet:** patchbay has no component for
  it: pb-nx9.87.
- **U36. A field's error is described, not announced:** wired to the field, and not a live region,
  so it is not read at each key. **Built:** Field, RadioGroup, CodeEditor's diagnostics
  ([`components.md`](components.md#forms)).
- **U37. A failed node shows its failure and why:** the `err` look, and the reason in its `line`.
  A disabled node is dashed with muted words, and both can show at once. **Built:** NodeBox
  ([`graph.md`](graph.md#nodebox)).
- **U38. Invalid is an `err` edge,** and the focus ring wins over it. **Built:** TextInput, Select,
  Checkbox, RadioGroup.
- **U39. Disabled drops the tone and mutes the words;** a disabled input goes sunken. **Built:**
  Button, TextInput, Select, CommandPalette.
- **U40. An unknown value is drawn by its word, neutrally,** in the one unknown look (F7).
  **Built:** every component with an open enum, most with an `Unknown…` story.

## Feedback

- **U41. Urgency by role.** An `err` message is `role="alert"`, read at once; every other is
  `role="status"`, read when the reader is free. **Built:** Banner, Toaster.
- **U42. A live region exists before its words,** as a region added with its words is not reliably
  read. **Built:** Toaster, Button's busy region, CommandPalette's status line, StatusWords. **Not
  yet:** Banner carries its role on itself, so the region arrives with its words and changes with
  its tone (pb-nx9.64); a labelled Spinner is its own region, mounted with its label
  (pb-nx9.65).
- **U43. Nothing is read twice.** **Built:** Toaster, whose toasts are not live regions.
- **U44. The channel follows where the news is and how long it lasts.**

  | The news | Channel |
  |---|---|
  | About what the person is touching (a field, a text box, a node) | Inline: Field `error`, CodeEditor diagnostics, NodeBox `line`, PortRow `problem` |
  | A lasting state of a pane (stale, conflict, offline, read-only) | A [`Banner`](components.md#news-and-state) in that pane, until its cause goes |
  | An event whose place is off-screen, or asked from no surface (a key, the palette) | A toast ([`useToasts`](components.md#usetoasts)) |
  | A running count of states for a pane | [`StatusWords`](components.md#news-and-state) |
  | The state of one thing, all the time | A [`Pill`](components.md#state) |
  | Success | Only when nothing on screen changes to show it, as an `ok` toast |

  **The app's:** choosing the channel.
- **U45. A toast waits for the person.** It never expires while hovered or focused, repeats merge
  into one with a count, the older ones fold into "and n more", and it has at most one action
  beside Dismiss. **Built:** [`useToasts`](components.md#usetoasts), Toaster.
- **U46. Most urgent first.** Status words are listed most urgent first, in one polite live region.
  **Built:** StatusWords draws them in the order given. **The app's:** the order.
- **U47. No fact only in a tooltip.** A native tooltip shows on neither touch nor keyboard focus, so
  whatever a `title` says is also in words elsewhere: the inspector, a node's line, or the canvas's
  status line, which also says why a port refuses while a wire is dragged (U59). Tooltips stay, as
  a convenience. **Not yet:** a wire's `title`, a meter's numbers, the gutter mark's list of
  diagnostics and a cut node title are in a tooltip only, with no place named for their words
  (pb-nx9.79); the canvas has no status line (pb-nx9.78); a cut palette row
  (pb-nx9.80).

## Confirmation and undo

- **U48. Confirm only what cannot be taken back and loses hand-written work.** An action asks "are
  you sure?" only when it has no way back (no undo, not a queued change that can be dropped, not a
  thing that can be added again) and it loses work the person wrote by hand, such as a node's text.
  Then a [`Dialog`](components.md#overlays) asks, its `danger` button saying the consequence (U28).
  Nothing else on the canvas asks. **The app's:** which actions.
- **U49. Undo, where changes apply at once, is offered where the source can take it.** Where the
  source can take the inverse, the `ok` toast after a removal or a connection carries Undo, which
  sends the inverse as a new request; where it cannot, the action's label says the consequence
  (U28). **Built:** a toast's `action` ([`useToasts`](components.md#usetoasts)). **The app's:** the
  inverse.
- **U50. A queue holds the net change.** Queuing the reverse of a queued change drops it, rather
  than adding a second; taking back is dropping a queued change. **The app's:** the queue. **Not
  yet:** patchbay has no list of queued changes to draw it with: pb-nx9.90.

## Live, pending, queued, refused

One model, whichever way the app commits ([patterns](patterns.md#two-commit-models)); the words
are F10's:

| State | Means | A wire | A node | A button or text |
|---|---|---|---|---|
| Live | The source holds it | [`Wire`](graph.md#wire) in its tone | [`NodeBox`](graph.md#nodebox) in its tone | — |
| Pending | Asked, no answer yet | [`GhostWire`](graph.md#ghostwire) `pending` | A ghost NodeBox (not yet: pb-nx9.82) | Button `busy` with `busyLabel` |
| Queued | Changed here, not saved | Wire in a change tone, `dashed` | NodeBox `change` | A "queued" or "unsaved" status word |
| Refused | The source or a check said no | GhostWire `refused`, or a queued wire in `err` | NodeBox `failed` and its `line` | Field `error`, Banner, toast |
| Stale | Changed underneath what is being edited | — | — | A `warn` Banner with the recovery |

- **U51. Draw the asking, never the answer.** A pending request is drawn as a request until the
  source answers. **Built:** GhostWire; **the app's:** removing it when answered.
- **U52. A ghost is not a thing.** It is drawn dashed and faint, takes no pointer events, and is not
  selectable, focusable or deletable. **Built:** GhostWire ([`graph.md`](graph.md#ghostwire)).
- **U53. Queued is a change tone and dashes.** A queued wire is a change tone, dashed; a queued
  node has its change border and badge; removed strikes the title. **Built:** Wire, NodeBox. **Not
  yet:** Wire's `pending` tone (F10): pb-nx9.74.
- **U54. Selected wins over tone.** **Built:** Wire.
- **U55. A level is emphasis, not a tone:** a wire's level is its width and opacity. **Built:**
  Wire.
- **U56. One rule judges the hint, the drop and the keyboard.** The app's `canConnect` marks each
  handle while a wire is dragged, checks the drop, and lists the ports the "Connect to" choice
  offers (U2), so a hint never promises what the drop refuses. **Built:** useConnectHints for the
  hint and the drop ([`graph.md`](graph.md#useconnecthints)). **Not yet:** the keyboard's list:
  pb-nx9.81.
- **U57. While dragging, every port says yes or no.** The origin is ringed in the accent; an
  accepting handle grows and goes `ok`; a refusing one goes `off` with muted words and a
  not-allowed cursor; ports on the origin's side are not candidates. **Built:** PortRow.
- **U58. A refusal stays as long as its cause.** A refused queued change stays marked until the
  queue changes. A refused request's ghost stays as long as the toast that carries its reason:
  dismissing the toast, or its expiry, removes the ghost, so the hold on a hovered toast holds the
  ghost too. **The app's:** removing the ghost with its toast.
- **U59. A refusal's reason lands where it was asked,** in words (U44). While a wire is dragged,
  the canvas's status line says why the port under the pointer refuses, and the verdict of a
  refused drop. **Not yet:** the reason is only the port's tooltip: pb-nx9.78.
- **U60. A read-only graph turns off every edit and says why:** adding, connecting, removing,
  dragging and editing text, with a `quiet` Banner saying why and where it can be changed
  ([patterns](patterns.md#a-read-only-graph)). **Built:** the switches (`useAddAt`'s `enabled`,
  PortRow's `connectable`, CodeEditor's `readOnly`). **The app's:** setting them all.
- **U61. Nothing is drawn as true that the source has not said.** A node or a wire appears when the
  source holds it, never on the gesture alone. **Built:** the graph components draw only the data
  they are given. **The app's:** the order.
- **U62. A gesture makes only changes the person can see and take back.** A wire dropped on empty
  canvas also connects the node added there only where the connection is a queued change; where
  changes apply at once it would be a second request the person did not see, so the node is added
  alone. **The app's:** what `useAddAt`'s `from` joins ([`graph.md`](graph.md#useaddat)).

## The view and the canvas

- **U63. The person's view move stops following.** Any move of the view the person asks for, by
  any input (a pan, a wheel, a pinch, the zoom tools and their keys, a minimap drag, going to a
  node), stops the view following the graph; a layout or canvas-size change never restarts it, and
  only Fit follows again. **Built:** [`useFollowFit`](graph.md#usefollowfit) for pans, wheels and
  pinches, and `stop()` for going to a node. **Not yet:** the zoom tools and a minimap drag do not
  stop it: pb-nx9.52.
- **U64. A fit leaves the canvas tools clear,** so the graph is never drawn under them and an app
  chooses no inset of its own. **Not yet:** CanvasTools' default fit ignores its own corner:
  pb-nx9.83.
- **U65. The canvas draws; the inspector edits.** Names and values are edited in the inspector,
  never in place on the canvas, whose node geometry is fixed (F24) and whose keys are React Flow's.
  **The app's:** its node types draw no fields.
- **U66. A context menu is the palette at the point.** A right-click or a long-press on a node or
  the canvas opens the [`CommandPalette`](components.md#commands-and-keys) at the point (`at`),
  with the selection's commands first; there is no menu of its own. **Not yet:** patchbay gives
  the point of a right-click but no long-press: pb-nx9.92.
- **U67. Several things can be selected,** by React Flow's shift-click and box select, and the
  inspector shows their count and the actions for all
  ([patterns](patterns.md#selecting-and-inspecting)). **The app's:** the actions.

## Right-to-left

- **U68. Edges are logical.** Start and end follow the text direction: Splitter `edge`, Sheet
  `side`, Toaster placements, stripes on the inline start, paddings and margins.
  **Built:** Splitter, Sheet, Toaster, Banner. **Not yet:** Panel's header actions
  (pb-nx9.60), Dialog's header padding (pb-nx9.61), Pill's padding (pb-nx9.62), and
  DiffView's and CodeEditor's line and gutter paddings (pb-nx9.63) are physical.
- **U69. Direction is read at the moment of use** (a key press, a drag's start), so a page that
  changes `dir` is followed. **Built:** Splitter.
- **U70. Handles stay physical.** Inputs on the left and outputs on the right, as React Flow's
  positions are; the row's words follow their handle. **Built:** PortRow, NodeBox. **Not yet:** the
  built CSS mirrors the rows only under an RTL `lang`, not under `dir="rtl"` alone: pb-nx9.58.
- **U71. Safe-area insets are physical,** and so are the side paddings that clear them. **Built:**
  AppShell.
- **U72. A level bar mirrors.** A horizontal Meter fills from the inline start, so from the right
  in right-to-left text; a vertical one fills from the bottom. **Not yet:** it fills from the left
  in any direction: pb-nx9.86.

## Forced colours

- **U73. Every edge and state stays.** What a fill carried moves to a system colour, with
  `forced-color-adjust: none` where a shape would vanish. **Built:** a
  `@media (forced-colors: active)` block in each stylesheet whose fill or hidden edge would be
  lost; the rest keep native edges. **Not yet:** ThemeSwitch, which copies Button's look without
  its block: pb-nx9.68.
- **U74. Three system roles.** Selection is `Highlight`; refused and disabled are `GrayText`;
  ordinary marks are `CanvasText`. **Built:** per component.

## Reduced motion

- **U75. What moves for show stops.** Under `prefers-reduced-motion: reduce` the fast and slow
  durations are 0 ms. **Built:** `tokens.css` ([`tokens.md`](tokens.md#the-tokens), Reduced
  motion).
- **U76. Infinite animations are stopped, not run at 0 s.** The pulse and the spin stop; a wire's
  flow dots are not drawn. **Built:** Pill, Spinner, Wire.
- **U77. Entrances are turned off.** **Built:** Dialog, Sheet, Toaster, CommandPalette.
- **U78. Information keeps moving.** A meter's level still moves; a zoom or a fit lands at once.
  **Built:** Meter, CanvasTools, useFollowFit.
