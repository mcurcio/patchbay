// Reading the token and brand stylesheets as text (docs/tokens.md#writing-a-brand): their rule sets, the three sets of
// tokens a :root selector holds (light, the system's dark, the chosen dark), and the tokens in force in a theme, as
// the cascade resolves them. Pure: no DOM, no test runner. The contrast check and the token tests read through it.

/** One rule set: its selector, the at-rule it sits in (`@media (…)`, or null at the top), and its declarations. */
export type CssBlock = { media: string | null; selector: string; declarations: Map<string, string> };

const squash = (text: string) => text.trim().replace(/\s+/g, " ");

export function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function declarations(body: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const declaration of body.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    found.set(declaration.slice(0, colon).trim(), squash(declaration.slice(colon + 1)));
  }
  return found;
}

/**
 * A stylesheet's rule sets, in order: each plain rule, and each rule inside an at-rule (`@media`) with that at-rule's
 * prelude as its `media`. Statement at-rules (`@import …;`) are skipped. It reads stylesheets as the token files and
 * brands are written, not every CSS there is: braces inside strings are not understood.
 */
export function cssBlocks(css: string, media: string | null = null): CssBlock[] {
  const text = stripComments(css);
  const found: CssBlock[] = [];
  let at = 0;
  while (at < text.length) {
    const open = text.indexOf("{", at);
    if (open < 0) break;
    let depth = 1;
    let close = open + 1;
    for (; close < text.length && depth > 0; close += 1) {
      if (text[close] === "{") depth += 1;
      else if (text[close] === "}") depth -= 1;
    }
    const before = text.slice(at, open);
    const prelude = squash(before.slice(before.lastIndexOf(";") + 1));
    const body = text.slice(open + 1, close - 1);
    if (prelude.startsWith("@")) found.push(...cssBlocks(body, prelude));
    else found.push({ media, selector: prelude, declarations: declarations(body) });
    at = close;
  }
  return found;
}

/** A block's custom properties (`--name: value`), or none for a missing block. */
export function customProperties(block: CssBlock | undefined): Map<string, string> {
  if (block === undefined) return new Map();
  return new Map([...block.declarations].filter(([name]) => name.startsWith("--")));
}

const systemDark = /^@media \(prefers-color-scheme:\s*dark\)$/;

/** The block with this selector, at the top (`media` null) or inside an at-rule whose prelude `media` matches. */
export function findBlock(blocks: readonly CssBlock[], media: RegExp | null, selector: string): CssBlock | undefined {
  return blocks.find(
    (candidate) =>
      candidate.selector === selector &&
      (media === null ? candidate.media === null : candidate.media !== null && media.test(candidate.media)),
  );
}

/** A stylesheet's three sets under a :root selector, as tokens.css and a brand write them, and all its blocks. */
export type TokenSets = {
  blocks: CssBlock[];
  /** `root` itself: the light set. */
  light: CssBlock | undefined;
  /** `root:not([data-theme])` inside `@media (prefers-color-scheme: dark)`: the dark set when no choice is made. */
  systemDark: CssBlock | undefined;
  /** `root[data-theme="dark"]`: the dark set when dark is chosen. */
  chosenDark: CssBlock | undefined;
};

/** The light, system dark and chosen dark sets of a stylesheet under `root` (`:root`, or `:root[data-brand="x"]`). */
export function tokenSets(css: string, root: string): TokenSets {
  const blocks = cssBlocks(css);
  return {
    blocks,
    light: findBlock(blocks, null, root),
    systemDark: findBlock(blocks, systemDark, `${root}:not([data-theme])`),
    chosenDark: findBlock(blocks, null, `${root}[data-theme="dark"]`),
  };
}

/** How a page is themed: light, dark chosen with `data-theme="dark"`, or dark by the system with no choice made. */
export type ContrastTheme = "light" | "dark" | "system dark";

/** The tokens in force in a theme, in the cascade's order: the base's set for it, then the brand's (if any). */
export function tokensInForce(base: TokenSets, brand: TokenSets | null, theme: ContrastTheme): Map<string, string> {
  const dark = (sets: TokenSets) =>
    theme === "dark" ? sets.chosenDark : theme === "system dark" ? sets.systemDark : undefined;
  const layers = [customProperties(base.light), customProperties(dark(base))];
  if (brand !== null) layers.push(customProperties(brand.light), customProperties(dark(brand)));
  return new Map(layers.flatMap((layer) => [...layer]));
}

/** A value with every `var(--name)` it is followed through resolved from `tokens`; throws on a cycle or a gap. */
export function resolveToken(tokens: Map<string, string>, value: string): string {
  const seen = new Set<string>();
  let current = value;
  for (let reference = /^var\((--[\w-]+)\)$/.exec(current); reference !== null;) {
    const name = reference[1] ?? "";
    if (seen.has(name)) throw new Error(`a var() cycle through ${name}`);
    seen.add(name);
    const next = tokens.get(name);
    if (next === undefined) throw new Error(`${name} is not defined`);
    current = next;
    reference = /^var\((--[\w-]+)\)$/.exec(current);
  }
  return current;
}

/** An sRGB colour, 0 to 255 a channel. */
export type Rgb = readonly [number, number, number];

/** A `#rgb` or `#rrggbb` colour, or null for anything else. */
export function hexColour(value: string): Rgb | null {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short !== null) return [1, 2, 3].map((i) => parseInt((short[i] ?? "") + (short[i] ?? ""), 16)) as unknown as Rgb;
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (long !== null) return [1, 2, 3].map((i) => parseInt(long[i] ?? "", 16)) as unknown as Rgb;
  return null;
}

/** Whether a value is a colour written as hex or `rgb()`/`rgba()`. */
export function isColour(value: string): boolean {
  return hexColour(value) !== null || /\brgba?\(/.test(value);
}
