// The contrast rule (docs/tokens.md#writing-a-brand): every text, tone, change, on-strong and code token at 4.5:1 on
// each surface it is drawn on, in light and in dark, with a brand's values in force over tokens.css's. Pure: it reads
// stylesheets as text and returns what fails, so an app's own tests (any runner) can hold its brand to the rule.
import tokensCss from "../tokens/tokens.css?raw";
import { hexColour, resolveToken, type Rgb, type ContrastTheme, tokenSets, tokensInForce } from "./brand-css";

/** Tokens drawn as text (`fg`), each checked on every surface it is drawn on (`on`). */
export type ContrastPair = { readonly fg: readonly string[]; readonly on: readonly string[] };

/** The least contrast a text token keeps on its surfaces: WCAG's 4.5:1 for normal text. */
export const minimumContrast = 4.5;

/** Every text token and the surfaces it is drawn on: text, the accent, tones, changes, on-strong and code. */
export const contrastPairs: readonly ContrastPair[] = [
  { fg: ["--pb-text", "--pb-muted"], on: ["--pb-surface", "--pb-raised", "--pb-sunken"] },
  { fg: ["--pb-text"], on: ["--pb-warn-soft", "--pb-err-soft"] },
  // The sunken surface is under an accent pill or badge.
  { fg: ["--pb-accent"], on: ["--pb-surface", "--pb-raised", "--pb-sunken"] },
  {
    fg: ["--pb-ok", "--pb-warn", "--pb-err", "--pb-quiet", "--pb-off", "--pb-added", "--pb-removed", "--pb-renamed"],
    on: ["--pb-surface", "--pb-raised", "--pb-sunken"],
  },
  { fg: ["--pb-warn"], on: ["--pb-warn-soft"] },
  { fg: ["--pb-err"], on: ["--pb-err-soft"] },
  // On-strong is the words on a filled button, mark or badge, so it is checked on every tone a badge fills with.
  {
    fg: ["--pb-on-strong"],
    on: [
      "--pb-accent",
      "--pb-err",
      "--pb-warn",
      "--pb-ok",
      "--pb-quiet",
      "--pb-off",
      "--pb-muted",
      "--pb-added",
      "--pb-removed",
      "--pb-renamed",
    ],
  },
  {
    fg: [
      "--pb-code-text",
      "--pb-code-directive",
      "--pb-code-keyword",
      "--pb-code-variable",
      "--pb-code-number",
      "--pb-code-string",
      "--pb-code-comment",
      "--pb-code-punctuation",
      "--pb-code-error",
    ],
    on: ["--pb-code-surface", "--pb-code-surface-readonly"],
  },
  { fg: ["--pb-code-error"], on: ["--pb-code-error-surface"] },
];

/** WCAG 2's relative luminance of an sRGB colour. */
function luminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2's contrast ratio of two hex colours (`#rgb` or `#rrggbb`), 1 to 21; NaN when either is not one. */
export function contrastRatio(a: string, b: string): number {
  const first = hexColour(a);
  const second = hexColour(b);
  if (first === null || second === null) return Number.NaN;
  const [high = 0, low = 0] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** One text token below the rule on one surface, in one theme. */
export type ContrastFailure = {
  /** The brand's name, or "base" for tokens.css alone. */
  brand: string;
  theme: ContrastTheme;
  fg: string;
  on: string;
  /** The values the two resolve to in that theme (or why one does not resolve). */
  fgValue: string;
  onValue: string;
  /** The contrast, or NaN when a value is not a hex colour. */
  ratio: number;
  /** All of it in a line: "harbor dark: --pb-muted (#64748b) on --pb-raised (#1e293b) is 3.07:1". */
  message: string;
};

export type { ContrastTheme } from "./brand-css";

function valueOf(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(name);
  if (value === undefined) return `undefined (${name} is not set)`;
  try {
    return resolveToken(tokens, value);
  } catch (error) {
    return `unresolved (${error instanceof Error ? error.message : String(error)})`;
  }
}

/**
 * Checks a brand against the contrast rule: for each theme (light, dark chosen, dark by the system), the tokens in
 * force are tokens.css's set for it with the brand's blocks for `brand` (its `:root[data-brand="…"]` rules) over
 * them, and every pair in `contrastPairs` must reach `minimumContrast`. Returns the failures; none means the brand
 * keeps the rule. `css` is the brand's stylesheet as text; an empty one (or a `brand` it has no blocks for) checks
 * the base theme alone. Colours must be written as hex, or the pair fails saying so.
 */
export function checkBrandContrast(css: string, brand: string): ContrastFailure[] {
  const base = tokenSets(tokensCss, ":root");
  const own = tokenSets(css, `:root[data-brand="${brand}"]`);
  const failures: ContrastFailure[] = [];
  for (const theme of ["light", "dark", "system dark"] as const) {
    const tokens = tokensInForce(base, own, theme);
    for (const pair of contrastPairs) {
      for (const fg of pair.fg) {
        for (const on of pair.on) {
          const fgValue = valueOf(tokens, fg);
          const onValue = valueOf(tokens, on);
          const ratio = contrastRatio(fgValue, onValue);
          if (ratio >= minimumContrast) continue;
          const said = Number.isNaN(ratio) ? "is not two hex colours" : `is ${ratio.toFixed(2)}:1`;
          const message = `${brand} ${theme}: ${fg} (${fgValue}) on ${on} (${onValue}) ${said}`;
          failures.push({ brand, theme, fg, on, fgValue, onValue, ratio, message });
        }
      }
    }
  }
  return failures;
}
