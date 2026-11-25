# Tokens, themes and brands

Every colour, radius, shadow, duration, space and type size a patchbay component draws with is a
CSS custom property in `src/tokens/tokens.css`, published as `@mcurcio/patchbay/tokens.css`. Each
app's look is a brand, a small stylesheet that overrides some of them. Component stylesheets use
only these properties, and a test fails on a colour or duration of their own
([The tests](#the-tests)).

An app loads, in this order:

```ts
import "@mcurcio/patchbay/tokens.css";
import "@mcurcio/patchbay/brands/ear.css"; // its brand
import "@mcurcio/patchbay/base.css"; // optional: the page's defaults
import "./app.css"; // its own
```

and sets `data-brand="ear"` (or `"rasl"`) on `<html>`. A layer's components import their own
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
| Changes | `--pb-added`, `--pb-removed`, `--pb-renamed` | An edit not yet applied |
| Meters | `--pb-meter-low`, `--pb-meter-mid`, `--pb-meter-hot`, `--pb-meter-peak` | A level bar's three zones and its peak tick |
| Code | `--pb-code-surface`, `--pb-code-surface-readonly`, `--pb-code-border`, `--pb-code-text`, `--pb-code-directive`, `--pb-code-keyword`, `--pb-code-variable`, `--pb-code-number`, `--pb-code-string`, `--pb-code-comment`, `--pb-code-punctuation`, `--pb-code-error`, `--pb-code-error-surface` | A code box and its highlighter's token colours (the surfaces, border, text and error surface point at the tokens above) |
| Shape | `--pb-radius-box` (8 px), `--pb-radius-control` (6 px), `--pb-radius-pill`, `--pb-shadow`, `--pb-shadow-lifted` | Boxes; controls and text boxes; pills; a resting and a lifted shadow |
| Motion | `--pb-motion-fast` (120 ms), `--pb-motion-slow` (180 ms), `--pb-motion-pulse` (2 s), `--pb-motion-flow` (1 s), `--pb-motion-spin` (0.8 s) | Hover and selection; what slides; a pulsing dot; a wire's flow; the busy spinner's turn |
| Density | `--pb-space-1` … `--pb-space-5` (2, 4, 8, 12, 16 px), `--pb-row` (22 px), `--pb-bar` (44 px) | Spacing steps; a port row's height; the top bar's height |
| Type | `--pb-font-ui`, `--pb-font-code`, `--pb-text-sm` (12 px), `--pb-text-md` (13 px), `--pb-code-size` (12 px) | The faces; the two text sizes; the code boxes' size |

The values live in `tokens.css` alone. The base palette, type and density are ear's editor's,
carried over unchanged; the changes group is new, its hues rasl's, darkened in light to reach
4.5:1.

- **Code size.** One token, shared by a code box's textarea, its highlighted copy and its gutter,
  so their glyphs line up. On a touch screen (`(hover: none) and (pointer: coarse)`) it is 16 px,
  as iOS Safari zooms the page when a smaller text field takes the focus.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`, `--pb-motion-fast` and
  `--pb-motion-slow` are 0 ms. The pulse, flow and spin keep their durations: a component stops
  those infinite animations itself under reduced motion, since one at 0 s would churn rather than
  stop.
- **React Flow.** `tokens.css` points React Flow's own variables (`--xy-*`: the canvas, dot grid,
  edges, connection line, handles, selection box, controls, attribution and minimap) at the
  tokens, on `.react-flow`, so its canvas follows the theme and the brand. React Flow's `colorMode`
  prop is not used: it would fight `data-theme`.

## The theme

The theme follows the system by default (`prefers-color-scheme`). `data-theme="light"` or
`data-theme="dark"` on `<html>` chooses one; removing the attribute goes back to the system.

`tokens.css` holds three sets: the light set on `:root`, the dark set for a dark system with no
choice made (`:root:not([data-theme])` inside `@media (prefers-color-scheme: dark)`), and the same
dark set again for a chosen dark (`:root[data-theme="dark"]`). Each dark set sets
`color-scheme: dark`, so native controls and scroll bars follow. The dark set is written twice
rather than with CSS's `light-dark()`, because a CSS minifier may rewrite that function for older
browsers.

## Brands

A brand is a stylesheet in `src/brands/`, published as `@mcurcio/patchbay/brands/<name>.css`,
that overrides tokens under `data-brand` on `<html>`:

```css
:root[data-brand="rasl"] { --pb-accent: …; }
@media (prefers-color-scheme: dark) {
  :root[data-brand="rasl"]:not([data-theme]) { --pb-accent: …; }
}
:root[data-brand="rasl"][data-theme="dark"] { --pb-accent: …; }
```

- **Few overrides.** A brand may override any token but is expected to touch few: the accent, the
  type, the density, and a state hue only where its domain needs one. Each override says why in a
  comment.
- **A colour it sets for light, it sets for dark too.** `:root[data-brand="…"]` is as specific as
  `:root[data-theme="dark"]` and loads after it, so a light-only colour would win in dark as well.
  The two dark blocks are written the same, as the base's are. Tokens that are not colours (type,
  density) need only the first block.
- *Why an attribute and not load order:* Storybook switches brands at run time, and a page could
  show two.

The two brands:

| Brand | Overrides |
|---|---|
| `ear` | Nothing: the base is ear's editor's look. Its file is where a change to ear's look goes. |
| `rasl` | The accent, sky blue rather than ear's indigo: `#0272ad` in light (rasl's `#0284c7` darkened to reach 4.5:1), `#38bdf8` in dark. In dark only, rasl's navy surfaces, lines and slate text (`--pb-surface`, `--pb-raised`, `--pb-sunken`, `--pb-line`, `--pb-line-strong`, `--pb-text`, `--pb-muted`) and `--pb-on-strong` as its canvas colour. rasl's light palette is within a shade of the base's, so it is not overridden; nor are its type faces, which match the base's. |

## The base stylesheet

`src/tokens/base.css`, published as `@mcurcio/patchbay/base.css`, is optional: an app that wants
the library's page defaults loads it after the tokens and the brand. It sets `box-sizing:
border-box` on every element, the body's margin, background, text colour, face and size from the
tokens, and a 2 px focus ring in `--pb-accent` for `:focus-visible`. Components never depend on
it; each sets what it needs itself. Storybook's preview loads it.

## The tests

`src/tokens/tokens.test.ts` reads the token, base, brand and component stylesheets as text (the
unit project's `css.include` in `vite.config.ts`; Vitest blanks stylesheets otherwise) and fails:

- naming the brand, theme and pair, when any text, tone, change, on-strong or code token falls
  below 4.5:1 on a surface it is drawn on. It runs for the base alone and each brand, in light and
  in dark, resolving the cascade as the browser does (`tokens.css`'s sets, then the brand's).
- when the two copies of a dark set differ, in `tokens.css` or a brand;
- when a colour in the light set has no dark value, or the dark set names a token the light set
  lacks;
- when a brand sets a colour for light without setting it for dark, names a token `tokens.css`
  does not define, or has a rule outside its three blocks;
- when reduced motion zeroes anything but the fast and slow motion, or a React Flow variable does
  not point at a token;
- when a stylesheet or component under `src/` outside `tokens/` and `brands/` (stories and tests
  aside) holds a colour of its own (a hex value, `rgb()`, `hsl()`, `white` or `black`); when a
  stylesheet holds a duration of its own (`120ms`, `0.8s`), a radius other than a token or `0`, or
  a shadow other than a token or `none`; or when a component sets a radius, shadow, transition or
  animation in an inline style. `base.css` is held to the stylesheet rules.

A failing pair changes the value, not the rule.
