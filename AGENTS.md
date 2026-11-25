# AGENTS.md

Instructions for every AI coding agent in this repo. `CLAUDE.md` is a symlink to this file.

## What this repo is

patchbay is the React component library behind the graph editors of ear (mcurcio/ear, `web/`) and
rasl (mcurcio/rasl, `js/packages/web`): design tokens, themes and each app's brand, primitives,
composites, the app shell, graph components on React Flow, and UI-only hooks. It is a library, not
a framework: it draws and handles interaction; each app keeps its protocol, its data and its
editing model.

Nothing is built yet. The design is [`docs/design/patchbay.md`](docs/design/patchbay.md); read it
before any change.

## Rules of the repo

- **Components only draw.** No fetching, no protocol types, no knobly parsing; data in, callbacks
  out. The full list of component rules is in the design (§2) until it moves into the library docs.
- **Tokens only.** No colour, radius, shadow or duration outside the token and brand files.
- **No app's words or types.** Nothing in patchbay names an ear or rasl type; an app maps its data
  onto patchbay's props.
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

Not set up yet (the design's §6: Node 24, pnpm through corepack, TypeScript, Vitest, Storybook and
its Playwright test runner). This section gets the commands with the first code.

## Landing work

1. Run the checks for what you changed.
2. Update beads and commit `.beads/issues.jsonl` (below).
3. Commit with Conventional Commits (releases will be cut from them by semantic-release), push your
   branch, and open or update a pull request into `main`. The owner reviews and merges; do not
   merge it yourself.

## Task tracking: beads

All planned work is tracked in beads (`bd`, prefix `pb-`). Agents manage beads themselves
(owner, 2026-10-21, in rasl: "I want to use beads, and want you to auto manage it").

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
