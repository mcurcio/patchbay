# Patterns for editing a live graph

How patchbay's parts fit together for the jobs every graph editor has. Each pattern says when it
applies, how its parts are arranged, its states, its keyboard and touch paths, and what to do and
not do. The parts' props are on their own pages; the rules cited (F…, U…) are in
[`foundations.md`](foundations.md) and [`ux-rules.md`](ux-rules.md). A pattern's steps are the
app's to follow, with patchbay's parts; a part that is not built yet names its bead.

## Two commit models

An app applies each change at once, or queues changes until a save. patchbay draws both with the
same states ([ux-rules: live, pending, queued, refused](ux-rules.md#live-pending-queued-refused)):

| | Applies at once | Queues until a save |
|---|---|---|
| A gesture | Sends one request | Adds one change to the queue |
| While waiting | Pending: GhostWire, a busy Button | Queued: change tones, dashed wires |
| The verdict | The source's answer to each request | A check of the whole queue, then the save's answer |
| Taking back | Undo in the `ok` toast, where the source can take the inverse (U49) | Dropping a queued change (U50) |

Every pattern below holds in both; where they differ, it says so.

## Adding a node

**When:** the person wants a new node, at a place or anywhere.

**How:**

1. The person asks: a double-click on empty canvas or a wire dropped on empty canvas
   ([`useAddAt`](graph.md#useaddat)), the palette's add commands, `A` (U18), or the app's Add
   button.
2. They pick a type in the [`CommandPalette`](components.md#commands-and-keys), opened at the point
   (`at`) when asked from the canvas, with the types as one group.
3. They configure it in the inspector, as a form in the graph's subject
   ([selecting and inspecting](#selecting-and-inspecting)): not modal, so the canvas stays live.
   Its name defaults to its type, numbered (`type 2`), so it never needs a name to be added.
4. They add it. The node appears when the source holds it (U61), at the point it was asked.

**States:** while the request is out, the form's Add button is busy (U5) and a
[`GhostNode`](graph.md#ghostnode) stands at the point, in the room the node will take. A refusal stays in the form, in words (U59).

**Keyboard and touch:** the palette's add commands and `A` are the double-click's keyboard path
(U2). On touch a double-tap adds, and a wire dropped on empty canvas works by touch
([`useAddAt`](graph.md#useaddat)).

**Do:**
- Connect the dropped wire to the new node only where the connection is queued (U62).
- Turn adding off on a read-only graph, so a double-click zooms again (U60).

**Don't:**
- Draw the node before the source holds it (U61).
- Overwrite what the person typed with a template when they pick another type.

## Placing nodes

**When:** a node is new, or the layout changed.

**How:** the app lays out its nodes; patchbay draws boxes of fixed geometry so code can lay them
out ([`graph.md`](graph.md#geometry)). The canvas tools' Tidy (`onTidy` on
[`CanvasTools`](graph.md#canvastools)) lays out every node again. Whether the person may drag nodes
is the app's choice. An app that allows it keeps each place the person chose until Tidy, places
unplaced nodes by its layout, and puts an added node at the point it was asked.

**Do:** keep a place the person chose until they Tidy. **Don't:** animate the layout (F32).

## Connecting

**When:** the person joins an output to an input.

**How:**

1. They drag from a handle ([`PortRow`](graph.md#portrow)). Either end may start the wire.
2. Every candidate port says yes or no from the app's one rule
   ([`useConnectHints`](graph.md#useconnecthints), U56, U57), and the canvas's status line
   ([`ConnectStatus`](graph.md#connectstatus)) says why a port refuses (U59).
3. They drop on an accepting handle. Applying at once, a [`GhostWire`](graph.md#ghostwire)
   `pending` shows the request until the source answers; queuing, a dashed [`Wire`](graph.md#wire)
   in `added` shows the queued change.
4. The source's answer replaces the ghost with a live wire, or turns it `refused` (U58).

**From the keyboard:** in the inspector, a node's subject lists its ports, each with a "Connect
to" [`Select`](components.md#forms) of the ports on the other side that `canConnect` accepts for it
(U56), listed by [`connectTargets`](graph.md#connecttargets). Choosing one makes the same request or
queued change as a drop. A connection's subject has Remove.

**States:** dragging (the origin ringed, candidates marked), pending (the ghost), live, refused
(the ghost `refused`, the reason in a toast, U44), queued (a dashed change tone).

**Touch:** a handle's hit area grows and a near drop finishes (F37).

**Do:**
- Stop drags from the ports of a removed node and on a read-only graph (PortRow
  `connectable={false}`).

**Don't:**
- Let a hint accept what the drop refuses (U56).
- Put the refusal's reason only in a tooltip (U47).

## Selecting and inspecting

**When:** the person wants to see or change one thing, or several.

**How:** the inspector in [`AppShell`](components.md#appshell) shows one subject, chosen by the
selection:

| Selection | Subject | Shows |
|---|---|---|
| None | The graph | Its facts ([`KeyValue`](components.md#text-and-facts)), what to do next, the add form |
| One node | The node | Its state ([`Pill`](components.md#state)) and why, its settings or text, its ports' "Connect to", its actions |
| One connection | The connection | Its two ends, each a button that selects it, and Remove |
| Several | The selection | A count, and the actions for all (U67) |

The inspector's title is the subject's name and its actions sit at the header's far end
([`AppShell`](components.md#appshell)). What is cut or a tooltip on the canvas is written out here
(U47, F20), and names and values are edited here, never on the canvas (U65). A right-click or a
long-press opens the palette at the point with the selection's commands first
([`useContextAt`](graph.md#usecontextat), U66).

On a wide window the person may hide the inspector with a top-bar button; the app keeps the choice
([`usePersistentState`](components.md#usepersistentstate)), and a selection does not reopen it. On
a narrow window the inspector is a sheet, which the app opens on a selection.

**Keyboard and touch:** React Flow's selection (U17); shift-click and box select choose several
(U67); Delete removes the selection, and Escape clears it last (U18, U19).

**Do:** keep the graph's subject useful: what the graph is, and how to add. **Don't:** open a
dialog to inspect.

## Editing text

**When:** the person edits text the source reads (a node's definition, a whole file).

**How:** [`CodeEditor`](components.md#code) for the text, in the inspector or the drawer, its
diagnostics marked in the gutter and listed in words under the box by
[`DiagnosticList`](components.md#code), each row putting the caret at its place; [`Field`](components.md#forms) with
[`TextInput`](components.md#forms) for one value; a Save [`Button`](components.md#actions), busy
while its request is out; the draft's state as a status word.

The draft's rules:

- A draft is never overwritten.
- If its own text changes underneath, the draft goes stale: a `warn`
  [`Banner`](components.md#news-and-state) with Reload. A draft whose other parts changed moves on
  silently.
- Read-only text is never dimmed: it says why, and where it can be changed (CodeEditor's
  `readOnly` look).
- The source is the only judge of the text; its diagnostics are what the editor shows.

**Keyboard and touch:** Tab indents; Escape then Tab leaves (U15); Mod+S saves the focused draft
(U18, bound with `inTextFields`). Fields and code boxes keep their touch text size (F18); gutter
marks keep a full target (F38).

**Do:** keep the undo history (U16). **Don't:** check in the editor what only the source knows.

## Saving or queuing changes

**When:** the app queues changes until a save, or a text box holds a draft.

**How:**

- The canvas draws each queued change (U53).
- A list of the queued changes in words, each row with its change Badge and a drop button, with
  their count, and a slot for Check, Save and Discard
  ([`ChangeList`](components.md#queued-changes)). The queue keeps only the net change (U50; the
  cases are in ChangeList's docs).
- A [`DiffView`](components.md#code) of what the save writes.
- One primary Save, busy while it runs, and Discard.
- The queue is checked after each change and by an explicit Check; Save is unavailable while the
  check refuses (U6).

**States:** clean; queued (n changes); checking; refused (the change at fault marked in the list
and on the canvas, U58); saving; saved (the marks and the list empty, which says it; a toast only
where nothing on screen shows it, U44); stale (a `warn` Banner: check again, keeping the queue).

**Keyboard and touch:** Mod+S saves, and Mod+Z drops the last queued change (U18). Each row's drop
button is a full target on touch (F36).

**Do:** offer the cheapest safe recovery when stale: check a queue again, reload a text draft.
**Don't:** save part of a refused queue.

## Refusals

**When:** the source or a check says no.

**How:** the reason lands where the change was asked, in words, and stays as long as its cause
(U58, U59):

| Asked from | Shown |
|---|---|
| A field or a text box | Inline: Field `error`, CodeEditor diagnostics |
| A node | Its `line`, `err` tone |
| A wire drag | The canvas's status line while dragging; then the ghost `refused` and the reason in a toast, the ghost going with the toast |
| A queued change | Marked on the canvas and in the queue's list until the queue changes |
| The palette or a key | A toast, its action showing the place (U44) |

**Do:** give the source's code in code type after the words (U29, U31), and offer the one action
that helps (Show, Reload, Check again) as the banner's or toast's action. **Don't:** show a refusal
as a failure of the app, or only in a tooltip.

## Following the view

**When:** the graph changes shape or the canvas changes size.

**How:** [`useFollowFit`](graph.md#usefollowfit) fits the whole graph whenever the app's layout
key changes and whenever the canvas changes size, until the person moves the view by any input
(U63); the fit tool of [`CanvasTools`](graph.md#canvastools), passed `follow.fit`, fits and follows
again, and its zoom tools and minimap, passed `follow.stop` as `onViewMove`, stop it. An app that
moves the view itself at the person's asking (its own zoom keys, going to a node) calls `stop()`.
Every fit leaves the canvas tools clear (U64).

**Do:** mark the layout ready on `onFitted`, not on a timer. **Don't:** refit while the person
holds the view; don't animate a following fit (F32).

## Going to a node

**When:** the graph is larger than the screen.

**How:** the palette lists the nodes as commands ("Go to …"); choosing one selects it, moves the
view to it over `--pb-motion-slow` and stops following (U63). A toast's Show action does the same.
Finding a node by more than its name waits on palette keywords (pb-nx9.51).

**Do:** select what you go to, so the inspector shows it. **Don't:** keep following after a jump.

## A read-only graph

**When:** the graph cannot be edited now, as a whole or one item.

**How:** the app turns off every edit (U60) with the switches there are:

- adding: [`useAddAt`](graph.md#useaddat) `enabled: false`, so a double-click zooms again;
- connecting: `connectable: false` on every [`PortRow`](graph.md#portrow), and React Flow's
  `nodesConnectable={false}`;
- removing: React Flow's `deleteKeyCode={null}`, and no Remove in the inspector;
- moving: React Flow's `nodesDraggable={false}`;
- text: [`CodeEditor`](components.md#code) `readOnly`, and read-only fields.

A `quiet` [`Banner`](components.md#news-and-state) in the canvas says why, and how to change it.
One locked item carries a `muted` [`Badge`](components.md#state) with the reason, and its inspector
says why.

**Do:** keep reading, selecting and inspecting. **Don't:** dim read-only text.

## Empty, loading and offline

**When:** there is no graph yet, it is loading, or the connection is gone.

**How:**

- **Empty:** words on the canvas say what to do (double-click or `A` to add) and go with the first
  node ([`EmptyCanvasHint`](graph.md#emptycanvashint), U35); the graph's subject in the inspector
  says the same. On a read-only graph it keeps the app's words and drops the gestures (`add:
  false`).
- **Loading:** a labelled [`Spinner`](components.md#state) in the canvas; `onFitted` marks it
  ready.
- **Offline:** the connection's [`Pill`](components.md#state) in the top bar's `status` slot says
  "live" (`ok`), "connecting…" (`quiet`, pulsing) or "lost: retrying in n s" (`err`, the countdown
  in a status region). A closed connection clears every pending mark at once, as no answer will
  come; the canvas keeps the last graph it had.

**Do:** say whether it is coming back. **Don't:** blank the canvas while reconnecting.

## Narrow and phone layouts

**When:** the window is narrow or phone width (F41), or a touch screen.

**How:** [`AppShell`](components.md#appshell) moves the inspector into a
[`Sheet`](components.md#overlays) at the inline end on a narrow window and to the bottom on a phone;
dialogs, the palette and toasts fit the width (F41); targets and text fields take their touch sizes
(F36, F18); the shell clears the safe-area insets. A draft in the inspector survives the switch
between widths (U22).

At phone width the top bar keeps the status, the palette's button (a search glyph, for a screen
with no keyboard), the theme switch and the inspector's button; the app's other controls move into
the palette, which holds every command (U18).

**Do:** open the sheet on a selection. **Don't:** add a header of your own to the narrow
inspector: pass the inspector's `title` and `actions`, and the sheet draws one header row
([`AppShell`](components.md#appshell)).
