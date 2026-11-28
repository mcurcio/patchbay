# Tokens, themes and brands

Every colour, radius, shadow, duration, space and type size a patchbay component draws with is a
CSS custom property in `src/tokens/tokens.css`, published as `@mcurcio/patchbay/tokens.css`. Those
values are the base theme. An app that wants its own look writes a brand: a small stylesheet of its
own that overrides some of the tokens ([Writing a brand](#writing-a-brand)). patchbay ships the base
theme and the way a brand applies, not any app's brand. Component stylesheets use only these
properties, and a test fails on a colour or duration of their own ([The tests](#the-tests)).

An app loads, in this order:

```ts
import "@mcurcio/patchbay/tokens.css";
import "./brand.css"; // optional: its own brand
import "@mcurcio/patchbay/base.css"; // optional: the page's defaults
import "./app.css"; // its own
```

and, with a brand, sets `data-brand="<name>"` on `<html>`. A layer's components import their own
stylesheets; they do not import the tokens.

## The tokens

Every token is prefixed `--pb-`, so an app's own properties never collide. Colours have a light
and a dark value; the rest are the same in both themes.

| Group | Tokens | What they are for |
|---|---|---|
| Surfaces | `--pb-surface`, `--pb-raised`, `--pb-sunken` | The canvas; boxes, panels and controls; tracks, badges and read-only text |
| Lines | `--pb-line`, `--pb-line-strong` | Borders and the dot grid; a control's or code box's border |
| Text | `--pb-text`, `--pb-muted`, `--pb-accent`, `--pb-on-strong` | Body text; secondary text; selection and focus; text on a filled chip |
| Tones | `--pb-ok`, `--pb-warn`, `--pb-err`, `--pb-quiet`, `--pb-off`, `--pb-warn-soft`, `--pb-err-soft` | What a state is drawn in, and the soft surfaces under a warning or an error |
| Derived | `--pb-scrim`, `--pb-accent-hover` | Behind a modal dialog (the canvas, 72 % opaque); a filled accent control under the pointer (the accent, 15 % toward the text colour). Mixed from the tokens above, so they follow the theme and a brand with no dark value of their own |
| Changes | `--pb-added`, `--pb-removed`, `--pb-renamed` | An edit not yet applied |
| Meters | `--pb-meter-low`, `--pb-meter-mid`, `--pb-meter-hot`, `--pb-meter-peak` | A level bar's three zones and its peak tick |
| Code | `--pb-code-surface`, `--pb-code-surface-readonly`, `--pb-code-border`, `--pb-code-text`, `--pb-code-directive`, `--pb-code-keyword`, `--pb-code-variable`, `--pb-code-number`, `--pb-code-string`, `--pb-code-comment`, `--pb-code-punctuation`, `--pb-code-error`, `--pb-code-error-surface` | A code box and its highlighter's token colours (the surfaces, border, text and error surface point at the tokens above) |
| Shape | `--pb-radius-box` (8 px), `--pb-radius-control` (6 px), `--pb-radius-pill`, `--pb-shadow`, `--pb-shadow-lifted` | Boxes; controls and text boxes; pills; a resting and a lifted shadow |
| Motion | `--pb-motion-fast` (120 ms), `--pb-motion-slow` (180 ms), `--pb-motion-pulse` (2 s), `--pb-motion-flow` (1 s), `--pb-motion-spin` (0.8 s) | Hover and selection; what slides; a pulsing dot; a wire's flow; the busy spinner's turn |
| Density | `--pb-space-1` … `--pb-space-5` (2, 4, 8, 12, 16 px), `--pb-row` (22 px), `--pb-bar` (44 px) | Spacing steps; a compact control's height; the top bar's height |
| Node geometry | `--pb-node-width` (240 px), `--pb-node-header` (46 px), `--pb-node-line` (22 px), `--pb-node-row` (22 px), `--pb-node-pad` (8 px), `--pb-node-footer` (28 px), `--pb-node-handle` (10 px), `--pb-node-handle-hit` (20 px, 32 px on touch) | A node box's fixed sizes, equal to the constants `/graph` exports for layout code ([`graph.md`](graph.md#geometry)). A brand may not set them |
| Type | `--pb-font-ui`, `--pb-font-code`, `--pb-text-sm` (12 px), `--pb-text-md` (13 px), `--pb-code-size` (12 px) | The faces; the two text sizes; the code boxes' size |

The values live in `tokens.css` alone; a brand overrides them (all but the node geometry), it never
adds tokens of its own.

- **Code size.** One token, shared by a code box's textarea, its highlighted copy and its gutter,
  so their glyphs line up. On a touch screen (`(hover: none) and (pointer: coarse)`) it is 16 px,
  as iOS Safari zooms the page when a smaller text field takes the focus; there
  `--pb-node-handle-hit` is 32 px too.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`, `--pb-motion-fast` and
  `--pb-motion-slow` are 0 ms. The pulse, flow and spin keep their durations: a component stops
  those infinite animations itself under reduced motion, since one at 0 s would churn rather than
  stop.
- **React Flow.** `tokens.css` points React Flow's own variables (`--xy-*`: the canvas, dot grid,
  edges, connection line, handles, selection box, controls, attribution and minimap) at the
  tokens, on `.react-flow`, so its canvas follows the theme and the brand. Its attribution link,
  drawn in a fixed grey below 4.5:1 with no variable of its own, is set to `--pb-muted`. React
  Flow's `colorMode` prop is not used: it would fight `data-theme`.

## The theme

The theme follows the system by default (`prefers-color-scheme`). `data-theme="light"` or
`data-theme="dark"` on `<html>` chooses one; removing the attribute goes back to the system.

`tokens.css` holds three sets: the light set on `:root`, the dark set for a dark system with no
choice made (`:root:not([data-theme])` inside `@media (prefers-color-scheme: dark)`), and the same
dark set again for a chosen dark (`:root[data-theme="dark"]`). Each dark set sets
`color-scheme: dark`, so native controls and scroll bars follow. The dark set is written twice
rather than with CSS's `light-dark()`, because a CSS minifier may rewrite that function for older
browsers.

## Writing a brand

A brand is an app's own stylesheet that overrides tokens under `data-brand` on `<html>`. The app
loads it after `tokens.css` (and before `base.css`, if it loads that), and sets the attribute,
`data-brand="harbor"` for a brand named harbor. Without the attribute, the page draws in the base
theme.

Every rule is under the brand's attribute, in up to three blocks that mirror the base's three sets
([The theme](#the-theme)):

```css
:root[data-brand="harbor"] { --pb-accent: …; --pb-row: …; }
@media (prefers-color-scheme: dark) {
  :root[data-brand="harbor"]:not([data-theme]) { --pb-accent: …; }
}
:root[data-brand="harbor"][data-theme="dark"] { --pb-accent: …; }
```

- **A colour it sets for light, it sets for dark too.** `:root[data-brand="…"]` is as specific as
  `:root[data-theme="dark"]` and loads after it, so a light-only colour would win in dark as well.
  The two dark blocks are written the same, as the base's are. Tokens that are not colours (type,
  density, shape) need only the first block.
- **Not the node geometry.** The `--pb-node-*` tokens are the sizes an app lays its nodes out
  with before they render; a brand that changed one would draw boxes the layout did not make room
  for, so a brand sets none of them.
- **Few overrides.** A brand may override any other `--pb-` token, but usually touches few: the accent,
  the type (`--pb-font-ui`, `--pb-font-code` and the sizes), the density (the spacing steps,
  `--pb-row`, `--pb-bar`), and, in dark, the surfaces, lines and text where its canvas differs. A
  state hue changes only where the app's domain needs one. Each override says why in a comment.
- **It keeps the contrast rule.** Every text, tone, change, on-strong and code token stays at
  4.5:1 on each surface it is drawn on, in light and in dark, with the brand's values in force
  ([The tests](#the-tests) lists the pairs; [Checking a brand](#checking-a-brand) runs them over an
  app's own brand). An accent dark enough for 4.5:1 on the light surfaces
  must also keep `--pb-on-strong` legible on it, as a filled chip or primary button draws one on
  the other; the same holds for every tone, change and `--pb-muted`, which a filled badge fills
  with.
- *Why an attribute and not load order:* a page can switch brands at run time, as Storybook's
  toolbar does, and can show two.

### Checking a brand

`@mcurcio/patchbay/testing` holds the contrast check, so an app holds its own brand to the rule in
its own tests, with whatever test runner it uses:

```ts
import { checkBrandContrast } from "@mcurcio/patchbay/testing";
import brandCss from "./brand.css?raw"; // or readFileSync("src/brand.css", "utf8")

expect(checkBrandContrast(brandCss, "harbor").map((failure) => failure.message)).toEqual([]);
```

- **`checkBrandContrast(css, brand)`** takes the brand's stylesheet as text and its name (the
  `data-brand` value) and returns the failures, none when the brand keeps the rule. It checks three
  themes: light, dark chosen (`data-theme="dark"`) and dark by the system (no `data-theme`), each
  with `tokens.css`'s set for it and the brand's block for it over that, as the browser's cascade
  has them. An empty stylesheet checks the base theme alone. Each failure says its `brand`,
  `theme`, `fg` and `on` tokens, the values they resolve to (`fgValue`, `onValue`), the `ratio`,
  and all of it in a `message` ("harbor dark: --pb-muted (#64748b) on --pb-raised (#1e293b) is
  3.07:1").
- **Hex only.** The colours a pair resolves to must be hex (`#rgb` or `#rrggbb`), as the base's
  are; any other colour (`rgb()`, a name, `color-mix()`) fails, said so in its message
  ("is not two hex colours"), and so does a token that is not set or a `var()` that does not
  resolve.
- **The pairs.** `contrastPairs` lists each text token with the surfaces it is drawn on (the list
  under [The tests](#the-tests)), `minimumContrast` is 4.5, and `contrastRatio(a, b)` is WCAG 2's
  ratio of two hex colours (NaN when either is not one).
- It reads the stylesheet as patchbay's token files and brands are written: rule sets at the top or
  inside `@media`, under the three selectors above; a rule under any other selector is not read. It
  is pure, imports no test runner and no other patchbay layer, and touches no DOM; the base's
  tokens are the `tokens.css` of the same version, built in.

`examples/brands/` holds two worked examples, which the package does not ship: Storybook's brand
toolbar offers them beside the base theme, and `src/tokens/tokens.test.ts` holds them to the rules
above, the contrast rule through `checkBrandContrast`.

| Example | Overrides |
|---|---|
| `harbor` | The accent, teal: `#0f766e` in light, `#2dd4bf` in dark. In dark, a navy canvas: the surfaces, lines and slate text (`--pb-surface`, `--pb-raised`, `--pb-sunken`, `--pb-line`, `--pb-line-strong`, `--pb-text`, `--pb-muted`), and `--pb-on-strong` as the canvas's colour. A roomier density: `--pb-space-3` to `--pb-space-5` (10, 14, 20 px), `--pb-row` (26 px), `--pb-bar` (48 px). |
| `ember` | The accent, burnt orange: `#c2410c` in light, `#fb923c` in dark. The type: a humanist UI face where the system has one (`--pb-font-ui`) and text a point larger (`--pb-text-sm` 13 px, `--pb-text-md` 14 px). The base's surfaces stay. |

## The base stylesheet

`src/tokens/base.css`, published as `@mcurcio/patchbay/base.css`, is optional: an app that wants
the library's page defaults loads it after the tokens and its brand. It sets `box-sizing:
border-box` on every element, the body's margin, background, text colour, face and size from the
tokens, and a 2 px focus ring in `--pb-accent` for `:focus-visible`. Components never depend on
it; each sets what it needs itself. Storybook's preview loads it.

## The tests

`src/tokens/tokens.test.ts` reads the token, base and component stylesheets and the example brands
(`examples/brands/*.css`) as text (the unit project's `css.include` in `vite.config.ts`; Vitest
blanks stylesheets otherwise) and fails:

- naming the brand, theme and pair, when any text, tone, change, on-strong or code token falls
  below 4.5:1 on a surface it is drawn on: the text and muted tokens on the three surfaces, the
  text on the warn and err soft surfaces, the accent, every tone and change on the three surfaces,
  warn and err on their soft surfaces, on-strong on the accent, the tones, the changes and muted,
  and each code token on the code surfaces (the code error also on its own surface). It runs
  [`checkBrandContrast`](#checking-a-brand) for the base alone and each example brand, in light,
  chosen dark and system dark.
- naming the theme and the token, when `--pb-quiet` is less than 0.08 from `--pb-accent` or
  `--pb-off` in OKLab (the straight-line distance of L, a and b), for the base and each example
  brand in each theme, so quiet stays a slate of its own ([F9](foundations.md#tones));
- when the two copies of a dark set differ, in `tokens.css` or a brand;
- when a colour in the light set has no dark value, or the dark set names a token the light set
  lacks;
- when a brand sets a colour for light without setting it for dark, names a token `tokens.css`
  does not define, sets a node geometry token, or has a rule outside its three blocks;
- when reduced motion zeroes anything but the fast and slow motion, or a React Flow variable does
  not point at a token, or is not one the installed React Flow's `style.css` reads (the dev
  dependency is kept at the newest minor of the [supported range](graph.md#the-graph-layer));
- when a stylesheet or component under `src/` outside `tokens/` (stories and tests aside) holds a
  colour of its own (a hex value, `rgb()`, `hsl()`, `white` or `black`); when a stylesheet holds a
  duration of its own (`120ms`, `0.8s`), a radius other than a token or `0`, a shadow other than
  a token or `none`, or a font weight above 600 (`bold` included); or when a component sets a
  radius, shadow, transition or animation in an inline style. `base.css` is held to the stylesheet rules.

A failing pair changes the value, not the rule.
