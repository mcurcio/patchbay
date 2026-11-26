# AGENTS.md

Instructions for every AI coding agent in this repo. `CLAUDE.md` is a symlink to this file.

## What this repo is

patchbay is an open-source React component library for apps that draw and edit a live graph:
design tokens, themes and the brand mechanism, primitives, composites, the app shell, graph
components on React Flow, and UI-only hooks. It is a library, not a framework: it draws and handles
interaction; each app keeps its protocol, its data, its brand and its editing model.

It is a public, standalone project: nothing in it may name or assume a particular app, deployment,
machine or person's setup. Examples use neutral data; anything that varies between apps is a prop,
a token or a brand. `README.md` is for users, `CONTRIBUTING.md` for contributors.

The tokens, the primitives, the first composites and hooks, and the graph layer's `Meter`,
`NodeBox` and `PortRow` are built; [`docs/README.md`](docs/README.md) indexes their docs. The
design for the rest is [`docs/design/patchbay.md`](docs/design/patchbay.md); read both before any
change.

## Rules of the repo

- **Components only draw.** No fetching, no protocol types, no parsing; data in, callbacks
  out. The full list of component rules is in
  [`docs/components.md`](docs/components.md#rules-every-component-keeps).
- **Tokens only.** No colour, radius, shadow or duration outside the token files (and the example
  brands).
- **No app's words or types.** Nothing in patchbay names a particular app's types or domain; an app
  maps its data onto patchbay's props. Brands belong to the apps; `examples/brands/` holds neutral
  examples only.
- **Dependencies:** React, React DOM, `@xyflow/react` and `knobly` are peer dependencies, never
  bundled. Adding any other runtime dependency needs the owner's yes.

## Docs

- **Every fact has one home.** The library docs describe patchbay as built; a change to a component
  changes its docs and stories in the same commit.
- **Design docs are for unbuilt work only.** `docs/design/` holds them; when a part is built, its
  design text is deleted in the same change and what lasts moves into the library docs. Code
  comments never cite a design page's section numbers for built work.
- The logo (`docs/assets/logo.svg`, `logo-dark.svg`, `icon.svg`) is drawn by `tools/logo.py`; edit the
  script and rerun it (`python3 tools/logo.py`), never the SVGs.
- Storybook is the catalogue: every component has stories for its states, under each brand and
  theme.

## Build and test

Node 24 (`.nvmrc`; run `nvm use` first) and pnpm through corepack, at the version `packageManager`
in `package.json` names. From the repository root:

```bash
corepack enable                # once: puts `pnpm` on PATH, which the scripts call
pnpm install                   # --frozen-lockfile in CI
pnpm check                     # typecheck, lint, format:check, test, build: what CI's check job runs
pnpm test                      # Vitest's "unit" project: src/**/*.test.ts(x) in jsdom
pnpm typecheck                 # tsc, strict, no emit
pnpm lint                      # ESLint (typescript-eslint type-checked, react-hooks, storybook)
pnpm format                    # Prettier, 120 columns (format:check fails on a file it would change)
pnpm build                     # Vite library mode into dist/, then tsc's .d.ts into dist/types/
pnpm storybook                 # Storybook on http://localhost:6006
pnpm build-storybook           # into storybook-static/
pnpm test-storybook            # Vitest's "storybook" project: every story in headless Chromium
                               # (its play function, and the a11y check, which fails on a violation)
```

- **Layout.** One folder per layer under `src/` (`tokens`, `primitives`, `composites`,
  `shell`, `graph`, `hooks`), each JS layer with its `index.ts` entry. A component is four files
  beside each other: `Name.tsx`, `Name.css` (tokens only, classes prefixed `pb-`),
  `Name.stories.tsx` (its states) and `Name.test.tsx` (its behaviour).
- **The package.** `vite.config.ts` builds one ES module per layer (`dist/<layer>.js`) with its CSS
  beside it (`dist/<layer>.css`, which the module imports itself), and copies `tokens.css` and
  `base.css` as written. Peer dependencies (React, React DOM, `@xyflow/react`, `knobly`) are
  never bundled. `package.json`'s `exports` names each subpath. A layer that uses another imports
  it through that layer's index (`import { IconButton } from "../../primitives"`), which the build
  keeps an import of `./primitives.js`, so each component ships once; reaching past another
  layer's index fails the build.
- **Tokens, themes and brands:** [`docs/tokens.md`](docs/tokens.md) (the token test is
  `src/tokens/tokens.test.ts`).
- **CSS in tests.** Vitest blanks stylesheets by default; the unit project reads every CSS file
  under `src/` as text (`import css from "./Name.css?raw"`), for the token tests.
- **Storybook's tests** run on the Playwright that `package.json` pins exactly. Its Chromium must be
  installed (`pnpm exec playwright install chromium`; CI adds `--with-deps`).
- **pnpm's release-age policy** refuses a package published in the last day; `pnpm install` picks
  the newest older one. Build scripts are allowed per package in `pnpm-workspace.yaml`.
- CI (`.github/workflows/ci.yml`) runs on every push and pull request: `check`, `storybook`
  (`build-storybook`, then `test-storybook`) and `release-dry-run`; on a push to `main`, once they
  pass, `release` publishes. How releases work: [`CONTRIBUTING.md`](CONTRIBUTING.md#releases).

## Landing work

1. Run the checks for what you changed.
2. Update beads and commit `.beads/issues.jsonl` (below).
3. Commit with Conventional Commits (releases will be cut from them by semantic-release), push your
   branch, and open or update a pull request into `main`. The owner reviews and merges; do not
   merge it yourself.

## Task tracking: beads

All planned work is tracked in beads (`bd`, prefix `pb-`). Agents manage beads themselves
(owner, 2026-10-21: "I want to use beads, and want you to auto manage it").

- **Before work:** `bd ready`, `bd show <id>`, `bd update <id> --claim`.
- **During work:** file a bead for every follow-up, bug or open question; record decided rules in
  the bead's design field.
- **After work:** `bd close <id>`; update the rest.
- **Sync to GitHub:** `.beads/issues.jsonl` is the shared copy of the beads, one per line,
  committed with the work. The database `bd` reads is local to each machine, built from that
  file, and never pushed.
  - **Start of a session:** `bd bootstrap; bd import .beads/issues.jsonl` builds or refreshes the
    local database. The import never overwrites a bead that is newer locally. Run it again after
    pulling or switching branches.
  - **After changing beads:** `bd export -o .beads/issues.jsonl`, and commit the file.
  - Hooks in `.claude/settings.json` do both for Claude: `SessionStart` imports, then runs
    `bd prime`; `Stop` exports after every turn. Other agents run the two commands themselves.
    Do not run `bd dolt push` or `bd dolt pull`.
  - Two branches that both change beads can conflict in `issues.jsonl`. Keep both sides' lines;
    for one bead changed on both, keep the line with the later `updated_at`.
- Lasting notes about the owner or the project go in Claude memory files, not `bd remember`.

## Collaboration preferences

- **Brainstorming cadence**
  - When we are ideating / brainstorming, keep responses concise and optimize for quick back-and-forth.

- **Opinions vs decisions**
  - Offer **opinions and options**.
  - Do not present choices as "decided" unless the owner explicitly asks you to decide.

- **Specificity & intent**
  - Ask targeted clarifying questions when requirements are ambiguous.
  - Do not guess intentions; when in doubt, present explicit assumptions and ask for confirmation.
  - If a request specifies *interfaces* (ports/config) but leaves *runtime semantics* underspecified (e.g., timing, edge cases, shape rules, default behaviors), **pause implementation** and ask for clarification rather than inventing defaults.

- **No implicit semantic changes**
  - Do not change node semantics, runtime semantics, config semantics, or payload contracts implicitly.
  - If a change might affect behavior (even if tests still pass), call it out **before** implementing and confirm it is wanted.

- **Breaking changes / renames**
  - Confirm renames and behavior changes with the owner before making them.
  - Do not add aliases, deprecated exports, migration messages, or compatibility shims unless explicitly asked.

- **Scope discipline**
  - Keep diffs minimal and tied to the request.
  - Avoid drive-by refactors unless asked; file a bead instead.

- **Config ergonomics**
  - When adding DSL/config sugar:
    - propose exact semantics (including edge cases)
    - avoid ambiguous behavior
    - confirm constraints (e.g., "only supported without slicing") up front

- **Change reporting**
  - After edits, summarize:
    - what changed
    - why
    - any behavior-impacting implications
    - what to run to validate
