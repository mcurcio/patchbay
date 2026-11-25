<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
    <img alt="patchbay" src="docs/assets/logo.svg" width="440">
  </picture>
</p>

The React component library behind the graph editors of [ear](https://github.com/mcurcio/ear) and
[rasl](https://github.com/mcurcio/rasl): one set of design tokens and themes, with each app's own
brand over them, and the primitives, composites, app shell and graph components (on React Flow)
that both editors draw with.

patchbay draws and handles interaction; each app keeps its own protocol, data and editing model.

Status: in design. See [`docs/design/patchbay.md`](docs/design/patchbay.md).
