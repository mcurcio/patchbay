# patchbay's docs

The library docs describe patchbay as built; each fact has one home. Read them in this order:

| Page | What it holds |
|---|---|
| [`tokens.md`](tokens.md) | The design tokens, the light and dark themes, writing a brand, the base stylesheet, and the tests that hold them |
| [`components.md`](components.md) | The rules every component keeps, and each built component and hook: what it is for, its props, its keyboard and touch behaviour |
| [`graph.md`](graph.md) | The graph layer's built parts (`Meter`): props, how they move, and how they draw |
| [`design/`](design/patchbay.md) | Designs for work not built yet (the remaining composites, the shell, the rest of the graph layer, the remaining hooks); when a part is built it moves into the pages above |

Storybook (`pnpm storybook`) is the catalogue: every component's states under each example brand
and theme. How to build and test is in [`AGENTS.md`](../AGENTS.md#build-and-test).
