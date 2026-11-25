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
