# Contributing to patchbay

Thanks for helping. This page says how the repository fits together, how to build and test it, and
how changes land. If you are an AI coding agent, read [`AGENTS.md`](AGENTS.md) first; it points
back here.

## Reporting a bug or asking for something

Open an [issue](https://github.com/mcurcio/patchbay/issues). For a bug, include the
`@mcurcio/patchbay` version, the browser, the smallest code that shows it, and what you expected.
For a new component or prop, say what your app needs to draw and why the existing props or slots
don't cover it. Security problems go through [`SECURITY.md`](SECURITY.md), not a public issue.

## What belongs in patchbay

patchbay is a library, not a framework ([`docs/design/patchbay.md`](docs/design/patchbay.md#1-what-patchbay-is)):
components draw what they are given and report what the person did. A change fits when it is
useful to apps beyond your own. Keep your app's protocol, data types, words and brand in your app;
a value that differs between apps becomes a prop, a slot, a token or a brand, never a constant.
The rules every component keeps are in [`docs/components.md`](docs/components.md#rules-every-component-keeps).

## Setting up

You need Node 24 (`.nvmrc`) and Git. pnpm comes through corepack at the version `package.json`
pins:

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium   # once, for Storybook's tests
pnpm check                              # typecheck, lint, format check, unit tests, build
pnpm storybook                          # the catalogue on http://localhost:6006
```

[`AGENTS.md`](AGENTS.md#build-and-test) lists every command and how the build is put together.

## Layout

| Path | Holds |
|---|---|
| `src/tokens/` | `tokens.css` (every `--pb-` token, light and dark), `base.css`, and the token tests |
| `src/primitives/`, `src/hooks/` | One folder per component or hook |
| `src/composites/`, `src/shell/`, `src/graph/` | Layers designed but not built yet |
| `examples/brands/` | Example brands: how an app writes its own look; not part of the package |
| `.storybook/` | Storybook's config: the brand and theme toolbar, viewports, the accessibility check |
| `docs/` | The library docs ([`docs/README.md`](docs/README.md)), and `design/` for unbuilt work |
| `tools/logo.py` | Draws the logo SVGs in `docs/assets/`; edit the script, not the SVGs |

## Making a change

- **A component is four files** in its folder: `Name.tsx`, `Name.css` (tokens only, classes
  prefixed `pb-`), `Name.stories.tsx` (every state) and `Name.test.tsx` (its behaviour). Export it
  and its props type from the layer's `index.ts`.
- **Tokens only.** No colour, radius, shadow or duration in a component; the token tests fail on
  one. A new token goes in `tokens.css` with its dark value, and must keep 4.5:1 contrast.
- **Docs move with the code.** A change to a component changes its section in
  [`docs/components.md`](docs/components.md) in the same pull request. Designs for unbuilt parts
  live in `docs/design/`; when you build one, move what lasts into the library docs and delete it
  from the design.
- **Accessibility is part of done.** Every story runs through the accessibility check in Chromium
  (`pnpm test-storybook`), and a violation fails it. Check the keyboard path, touch targets
  (36 px, 40 px in tool groups) and reduced motion.
- Run `pnpm check` and `pnpm test-storybook` before you push; CI runs both on every pull request.

## Commits and pull requests

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:` for a new
component or prop, `fix:` for a bug, `docs:`, `test:`, `build:`, `ci:`, `refactor:` and `chore:`
for the rest, and `!` (or a `BREAKING CHANGE:` footer) for a change that breaks an app using the
library. They decide the next version, so pick the type for what a user of the package sees.

Open a pull request into `main` and describe what changed and why. A maintainer reviews and merges
it; merging is the release.

## Releases

<!-- releases -->
