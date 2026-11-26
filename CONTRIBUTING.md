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
| `src/primitives/`, `src/composites/`, `src/shell/`, `src/graph/`, `src/hooks/` | One folder per component or hook |
| `src/testing/` | `/testing`: the brand contrast check apps run in their own tests ([`docs/tokens.md`](docs/tokens.md#checking-a-brand)) |
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

Merging a pull request into `main` is the release; there is no release PR, and nobody tags or edits a
version by hand. The release job in `.github/workflows/ci.yml` runs after every check passes on that
push and is never cancelled. semantic-release (`.releaserc.json`, its tooling pinned with a lockfile in
`.github/release/`) reads the Conventional Commits since the last `v*` tag: `fix` releases a patch,
`feat` a minor, and a breaking change (`!` or `BREAKING CHANGE:`) a minor while patchbay is 0.x (a major
from 1.0); other types release nothing. A squash-merge counts only its title, so the PR title must be a
Conventional Commit.

The job appends the notes to `CHANGELOG.md` and commits only that file as
`chore(release): <version> [skip ci]`, tags that commit `v<version>`, publishes the package to npmjs.org
with provenance, and makes the GitHub Release with the notes and the packed `.tgz`. The version lives in
the tag, the GitHub Release and `CHANGELOG.md`: `package.json` stays at `0.0.0`, and
`.github/release-build.sh` stamps the version into a temporary copy for the build. The first run tags
the first commit `v0.0.0` as the baseline, so the first release is 0.1.0.

### One-time setup on npmjs.com

- **First publish, by hand.** npm's trusted publishing can only be configured for a package that
  already exists, and npm refuses CI tokens for it: even a granular token with two-factor bypass
  failed with `EOTP` (npm is restricting such tokens for publishing). So a maintainer publishes the
  first version from its release tag, approving with their second factor:

  ```bash
  git checkout v<version>
  pnpm install --frozen-lockfile
  bash .github/release-build.sh <version>
  npm publish ./pack/mcurcio-patchbay-<version>.tgz --access public --provenance=false --auth-type=web
  ```

  (`--provenance=false`: only a CI run can sign provenance. `--auth-type=web` approves in the
  browser; `--otp <code>` works too.) Then run `publish-tag` for that tag (below) to make its GitHub
  Release.
- **Then a trusted publisher.** On npmjs.com, under the package's settings, add a trusted publisher:
  GitHub Actions, repository `mcurcio/patchbay`, workflow `ci.yml`, no environment. Every later
  release publishes through OIDC, with provenance, and needs no `NPM_TOKEN` secret.
- The job pushes the `CHANGELOG.md` commit and the tag to `main` with the workflow's token, so branch
  protection on `main` must let GitHub Actions push.

### When a publish fails after the tag

semantic-release tags the release before it publishes, so a failed publish leaves the tag and the
`CHANGELOG.md` commit with no package or GitHub Release, and re-running the job releases nothing.
Fix the cause, then run the CI workflow by hand with that tag (Actions, CI, Run workflow, `tag`:
`v<version>`): its `publish-tag` job builds the tag, publishes it to npm unless npm already has that
version, and makes the GitHub Release from the tag's section of `CHANGELOG.md` unless it exists. It
is safe to run again.

### Checking a release locally

CI's `release-dry-run` job does this on every push and pull request; to run it yourself, with any
version:

```bash
pnpm install
bash .github/release-build.sh 1.2.3            # pack/mcurcio-patchbay-1.2.3.tgz, checked
bash .github/release-npm.sh 1.2.3 --dry-run    # npm publish --dry-run: sends nothing, needs no login
```
