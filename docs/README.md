# patchbay's docs

The library docs describe patchbay as built; each fact has one home. Read them in this order: the
design language first (how an app on patchbay looks and behaves), then the reference (what each
part is and takes).

| Page | What it holds |
|---|---|
| [`language.md`](language.md) | The design language: its principles, how to read its rules, and what patchbay owns and what each app owns |
| [`foundations.md`](foundations.md) | What each colour, tone, type size, space, radius, shadow and duration is for; density and touch, widths, themes and brands, glyphs (rules F1…) |
| [`ux-rules.md`](ux-rules.md) | The rules every screen keeps: focus and keyboard, Escape, words, states, feedback, confirmation and undo, pending and queued and refused, the view and the canvas, right-to-left, forced colours, reduced motion (rules U1…) |
| [`patterns.md`](patterns.md) | Editing a live graph: the two commit models, adding, placing, connecting, inspecting, editing text, saving or queuing, refusals, following the view, going to a node, read-only, empty and offline, narrow and phone |
| [`tokens.md`](tokens.md) | The design tokens, the light and dark themes, writing a brand and checking its contrast (`/testing`), the base stylesheet, and the tests that hold them |
| [`components.md`](components.md) | The rules every component keeps, and each built component, the shell and each hook: what it is for, its props, its keyboard and touch behaviour |
| [`graph.md`](graph.md) | The graph layer's built parts (`Meter`, the node geometry, `NodeBox`, `PortRow`, `useConnectHints`, `connectTargets`, `ConnectStatus`, `EmptyCanvasHint`, `Wire`, `GhostWire`, `CanvasTools`, `useAddAt`, `useFollowFit`): props, how they move, and how they draw |
| [`design/`](design/patchbay.md) | Designs for work not built yet (`SchemaForm`, Storybook's screenshots, the overlay helper); when a part is built it moves into the pages above |

A rule the code does not follow yet says so ("Not yet") and names the bead that holds the change.
Storybook (`pnpm storybook`) is the catalogue: every component's states under each example brand
and theme, and the Foundations and Patterns pages, which show the design language's sections live.
How to build and test is in [`AGENTS.md`](../AGENTS.md#build-and-test).
