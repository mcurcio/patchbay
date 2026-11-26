## [0.9.0](https://github.com/mcurcio/patchbay/compare/v0.8.0...v0.9.0) (2026-11-26)

### ⚠ BREAKING CHANGES

* Sheet's `side` is logical: "right" becomes "end" (still the default), and "start" is new; `SheetSide` changed to match.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MtEdSTqe5tHiATcH6Si3jB

### Features

* logical Sheet sides, one-row inspector header, touch hit areas for CodeEditor marks ([#14](https://github.com/mcurcio/patchbay/issues/14)) ([373bb23](https://github.com/mcurcio/patchbay/commit/373bb23a646826a23a9bf31338cd14b6ad2a3a17))

## [0.8.0](https://github.com/mcurcio/patchbay/compare/v0.7.0...v0.8.0) (2026-11-26)

### Features

* CodeEditor and CodeText, AppShell, and useFollowFit's stop() ([#12](https://github.com/mcurcio/patchbay/issues/12)) ([df0e625](https://github.com/mcurcio/patchbay/commit/df0e6254bc1b4d9dae61871bd8955159ede9d55a))

### Bug Fixes

* **graph:** useFollowFit stops following when a fit lands during the person's move ([#13](https://github.com/mcurcio/patchbay/issues/13)) ([e297c80](https://github.com/mcurcio/patchbay/commit/e297c803dd8881083fa70827b2db24953e801580))

## [0.7.0](https://github.com/mcurcio/patchbay/compare/v0.6.0...v0.7.0) (2026-11-26)

### ⚠ BREAKING CHANGES

* per-word props (closeLabel, dismissLabel, emptyLabel, noMatchLabel, orLabel, moreLabel, countLabel, NodeBox changeLabels, Meter title, and the palette's, toaster's and shortcut sheet's label/placeholder/title/keyNames) move into each component's `labels` prop; Splitter's `edge` follows the text direction.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MtEdSTqe5tHiATcH6Si3jB

### Features

* labels prop for every component's words, a /testing brand contrast check, and a logical Splitter edge ([#11](https://github.com/mcurcio/patchbay/issues/11)) ([ea6ca49](https://github.com/mcurcio/patchbay/commit/ea6ca49e95170ad71dac7386b2b815f02f0fc610))

## [0.6.0](https://github.com/mcurcio/patchbay/compare/v0.5.0...v0.6.0) (2026-11-26)

### Features

* **graph:** the graph layer: NodeBox, PortRow, Wire, GhostWire, useConnectHints and canvas sugar ([#10](https://github.com/mcurcio/patchbay/issues/10)) ([6c3e8fd](https://github.com/mcurcio/patchbay/commit/6c3e8fd3589110a473e5d8427289058fccb95fa1))

## [0.5.0](https://github.com/mcurcio/patchbay/compare/v0.4.0...v0.5.0) (2026-11-26)

### Features

* **composites:** CommandPalette and ShortcutSheet ([c1507d0](https://github.com/mcurcio/patchbay/commit/c1507d0170b42c8f2461227a001a8d7054d695c5))
* **composites:** Toaster and useToasts ([676e713](https://github.com/mcurcio/patchbay/commit/676e7131a9a0dc0d482faa9479d52098cc1fd97b))
* **graph:** Meter and useLiveValue ([eeb2e4c](https://github.com/mcurcio/patchbay/commit/eeb2e4c962d0f8daa50654f87cd3c8f24ac1ced0))
* **hooks:** useShortcuts and useMediaBreakpoint ([7f86725](https://github.com/mcurcio/patchbay/commit/7f867258f7c829f9779d11c8b3400c363a53ae9c))
* **primitives:** busyLabel on Button ([d50bae4](https://github.com/mcurcio/patchbay/commit/d50bae423ab14f9c833ef78ce58585b067550d28))

### Bug Fixes

* **composites:** Toaster says its news through live regions that are there first ([26d34ea](https://github.com/mcurcio/patchbay/commit/26d34ea3f3f4893bf7ae69eac6d1f0006320b391))
* **hooks:** Shift+digit no longer runs the digit's binding ([5d5cf4a](https://github.com/mcurcio/patchbay/commit/5d5cf4a55332ce1b6294e19616bfc72e3423f78e))
* **hooks:** useToasts sets its timer again when it fires early ([94b0bc2](https://github.com/mcurcio/patchbay/commit/94b0bc25d130db744d5c5d080512132e07b46449))

## [0.4.0](https://github.com/mcurcio/patchbay/compare/v0.3.0...v0.4.0) (2026-11-26)

### Features

* **primitives:** accent and muted tones, change tones and a filled Badge ([fe7476b](https://github.com/mcurcio/patchbay/commit/fe7476b15716de8f6904b6e6c3f21954833f7bfe))

## [0.3.0](https://github.com/mcurcio/patchbay/compare/v0.2.0...v0.3.0) (2026-11-25)

### Features

* **composites:** Banner and StatusWords ([c2969fc](https://github.com/mcurcio/patchbay/commit/c2969fcfb757d74939f74529eed2d8caf89a182b))
* **composites:** DiffView ([33c3efe](https://github.com/mcurcio/patchbay/commit/33c3efeb50415b6a631d314308948399f757830f))
* **primitives:** RadioGroup ([439893a](https://github.com/mcurcio/patchbay/commit/439893a714868bf17b5c175b38c77ee442cadb3b))

## [0.2.0](https://github.com/mcurcio/patchbay/compare/v0.1.0...v0.2.0) (2026-11-25)

### Features

* **tokens:** add --pb-scrim and --pb-accent-hover ([ebf5389](https://github.com/mcurcio/patchbay/commit/ebf53893662cc41bcc392cd5a2d839c61ef3dc47))

## [0.1.0](https://github.com/mcurcio/patchbay/compare/v0.0.0...v0.1.0) (2026-11-25)

### ⚠ BREAKING CHANGES

* the ./brands/ear.css and ./brands/rasl.css exports are
removed; an app ships its own brand stylesheet.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MtEdSTqe5tHiATcH6Si3jB

### Features

* set up builds and CI, tokens and brands, and the first primitives and hooks ([1a718d6](https://github.com/mcurcio/patchbay/commit/1a718d6b7db40ea186c7f89a4921ef598b273752))

### Bug Fixes

* **ci:** put pnpm on PATH with corepack enable ([95dd85f](https://github.com/mcurcio/patchbay/commit/95dd85fa9a5281d7312dc573d4600cac99e25b20))

### Code Refactoring

* ship the brand mechanism, not app brands; neutral examples ([ab6ef25](https://github.com/mcurcio/patchbay/commit/ab6ef253989472613c28a69f64dac8e507ed2aba))
