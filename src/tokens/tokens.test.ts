// The tokens, themes and brands (docs/tokens.md): tokens.css's three sets (light, the system's dark, the chosen dark)
// and each example brand's (examples/brands/, which hold a brand to the rules an app's own brand must keep), every
// text, tone, on-strong and code pair at 4.5:1 for the base and each example brand in each theme, and no colour,
// duration, radius or shadow of its own in a component.
import { describe, expect, it } from "vitest";
import tokensCss from "./tokens.css?raw";
import baseCss from "./base.css?raw";

const brandFiles = import.meta.glob<string>("../../examples/brands/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
});

// Every stylesheet and component under src/ but the token files (stories and tests may show any colour).
const componentFiles = import.meta.glob<string>(
  ["../**/*.css", "../**/*.tsx", "!../tokens/**", "!../**/*.stories.tsx", "!../**/*.test.tsx"],
  { query: "?raw", import: "default", eager: true },
);

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

type Block = { media: string | null; selector: string; declarations: Map<string, string> };

/** A stylesheet's rule sets: a plain rule or one rule inside an @media (the token files hold nothing else). */
function blocks(css: string): Block[] {
  const found: Block[] = [];
  const pattern = /(@media[^{]+)\{\s*([^{}@]+)\{([^{}]*)\}\s*\}|([^{}@]+)\{([^{}]*)\}/g;
  for (const match of stripComments(css).matchAll(pattern)) {
    const media = match[1]?.trim() ?? null;
    const selector = (match[2] ?? match[4] ?? "").trim().replace(/\s+/g, " ");
    const body = match[3] ?? match[5] ?? "";
    const declarations = new Map<string, string>();
    for (const declaration of body.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon < 0) continue;
      declarations.set(
        declaration.slice(0, colon).trim(),
        declaration
          .slice(colon + 1)
          .trim()
          .replace(/\s+/g, " "),
      );
    }
    found.push({ media, selector, declarations });
  }
  return found;
}

function tokensOf(block: Block | undefined): Map<string, string> {
  if (block === undefined) return new Map();
  return new Map([...block.declarations].filter(([name]) => name.startsWith("--")));
}

const systemDark = /^@media \(prefers-color-scheme:\s*dark\)$/;

function find(parsed: Block[], media: RegExp | null, selector: string): Block | undefined {
  return parsed.find(
    (candidate) =>
      candidate.selector === selector &&
      (media === null ? candidate.media === null : candidate.media !== null && media.test(candidate.media)),
  );
}

/** A stylesheet's light set, its system dark set and its chosen dark set, under the given :root selector. */
function sets(css: string, root: string) {
  const parsed = blocks(css);
  return {
    parsed,
    light: find(parsed, null, root),
    systemDark: find(parsed, systemDark, `${root}:not([data-theme])`),
    chosenDark: find(parsed, null, `${root}[data-theme="dark"]`),
  };
}

const base = sets(tokensCss, ":root");

const brands = Object.entries(brandFiles).map(([file, css]) => {
  const name = /([\w-]+)\.css$/.exec(file)?.[1] ?? file;
  return { name, ...sets(css, `:root[data-brand="${name}"]`) };
});

/** The tokens in force for an example brand (or the base alone) in a theme, in the cascade's order: tokens.css, then the brand. */
function theme(brand: (typeof brands)[number] | null, name: "light" | "dark"): Map<string, string> {
  const layers = [tokensOf(base.light)];
  if (name === "dark") layers.push(tokensOf(base.chosenDark));
  if (brand !== null) layers.push(tokensOf(brand.light));
  if (brand !== null && name === "dark") layers.push(tokensOf(brand.chosenDark));
  return new Map(layers.flatMap((layer) => [...layer]));
}

function resolve(tokens: Map<string, string>, value: string): string {
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

type Rgb = [number, number, number];

function hex(value: string): Rgb | null {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short !== null) return [1, 2, 3].map((i) => parseInt((short[i] ?? "") + (short[i] ?? ""), 16)) as Rgb;
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (long !== null) return [1, 2, 3].map((i) => parseInt(long[i] ?? "", 16)) as Rgb;
  return null;
}

function isColour(value: string): boolean {
  return hex(value) !== null || /\brgba?\(/.test(value);
}

/** WCAG 2's relative luminance of an sRGB colour. */
function luminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Each text token and the surfaces it is drawn on. */
const pairs: { fg: string[]; on: string[] }[] = [
  { fg: ["--pb-text", "--pb-muted"], on: ["--pb-surface", "--pb-raised", "--pb-sunken"] },
  { fg: ["--pb-text"], on: ["--pb-warn-soft", "--pb-err-soft"] },
  { fg: ["--pb-accent"], on: ["--pb-surface", "--pb-raised"] },
  {
    fg: ["--pb-ok", "--pb-warn", "--pb-err", "--pb-quiet", "--pb-off", "--pb-added", "--pb-removed", "--pb-renamed"],
    on: ["--pb-surface", "--pb-raised", "--pb-sunken"],
  },
  { fg: ["--pb-warn"], on: ["--pb-warn-soft"] },
  { fg: ["--pb-err"], on: ["--pb-err-soft"] },
  { fg: ["--pb-on-strong"], on: ["--pb-accent", "--pb-err", "--pb-warn"] },
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

describe("the tokens", () => {
  it("has a light set, a system dark set and a chosen dark set", () => {
    expect(tokensOf(base.light).size).toBeGreaterThan(0);
    expect(tokensOf(base.systemDark).size).toBeGreaterThan(0);
    expect(tokensOf(base.chosenDark).size).toBeGreaterThan(0);
  });

  it("names every token --pb-*", () => {
    const names = [...blocks(tokensCss)]
      .filter((block) => block.selector.startsWith(":root"))
      .flatMap((block) => [...tokensOf(block).keys()]);
    expect(names.filter((name) => !name.startsWith("--pb-"))).toEqual([]);
  });

  it("writes the dark set the same both times", () => {
    expect(tokensOf(base.systemDark)).toEqual(tokensOf(base.chosenDark));
    expect(base.systemDark?.declarations.get("color-scheme")).toBe("dark");
    expect(base.chosenDark?.declarations.get("color-scheme")).toBe("dark");
  });

  it("redefines every colour in the dark set and nothing else", () => {
    const light = tokensOf(base.light);
    const dark = tokensOf(base.chosenDark);
    const unknown = [...dark.keys()].filter((name) => !light.has(name));
    const missing = [...light]
      .filter(([, value]) => isColour(value))
      .map(([name]) => name)
      .filter((name) => !dark.has(name));
    expect({ unknown, missing }).toEqual({ unknown: [], missing: [] });
  });

  it("zeroes the fast and slow motion under reduced motion", () => {
    const reduced = find(blocks(tokensCss), /prefers-reduced-motion:\s*reduce/, ":root");
    expect(tokensOf(reduced)).toEqual(
      new Map([
        ["--pb-motion-fast", "0ms"],
        ["--pb-motion-slow", "0ms"],
      ]),
    );
  });

  it("points React Flow's variables at tokens only", () => {
    const flow = find(blocks(tokensCss), null, ".react-flow");
    const values = [...tokensOf(flow)];
    expect(values.length).toBeGreaterThan(0);
    expect(values.filter(([name, value]) => !name.startsWith("--xy-") || !value.includes("var(--pb-"))).toEqual([]);
  });
});

describe("the example brands", () => {
  it("has ember and harbor", () => {
    expect(brands.map((brand) => brand.name).sort()).toEqual(["ember", "harbor"]);
  });

  it.each(brands)("$name overrides only tokens.css's tokens, under its own data-brand", (brand) => {
    const known = tokensOf(base.light);
    const own = [brand.light, brand.systemDark, brand.chosenDark].filter((block) => block !== undefined);
    const stray = brand.parsed.filter((block) => !own.includes(block)).map((block) => block.selector);
    const unknown = own.flatMap((block) => [...tokensOf(block).keys()]).filter((name) => !known.has(name));
    expect({ stray, unknown }).toEqual({ stray: [], unknown: [] });
  });

  it.each(brands)("$name writes its dark set the same both times", (brand) => {
    expect(tokensOf(brand.systemDark)).toEqual(tokensOf(brand.chosenDark));
  });

  // :root[data-brand] is as specific as :root[data-theme="dark"] and loads later, so a colour the brand sets for light
  // would win in dark too unless its dark blocks set it again.
  it.each(brands)("$name gives every colour it sets a dark value", (brand) => {
    const dark = tokensOf(brand.chosenDark);
    const missing = [...tokensOf(brand.light)]
      .filter(([name, value]) => isColour(value) || isColour(resolve(tokensOf(base.light), `var(${name})`)))
      .map(([name]) => name)
      .filter((name) => !dark.has(name));
    expect(missing).toEqual([]);
  });
});

describe("contrast", () => {
  const cases = [null, ...brands].flatMap((brand) =>
    (["light", "dark"] as const).map((name) => ({ brand, name, label: `${brand?.name ?? "base"} ${name}` })),
  );

  it.each(cases)("keeps every text at 4.5:1 on what it is drawn on: $label", ({ brand, name, label }) => {
    const tokens = theme(brand, name);
    const failures: string[] = [];
    for (const pair of pairs) {
      for (const fg of pair.fg) {
        for (const on of pair.on) {
          const fgValue = resolve(tokens, tokens.get(fg) ?? `undefined ${fg}`);
          const onValue = resolve(tokens, tokens.get(on) ?? `undefined ${on}`);
          const fgColour = hex(fgValue);
          const onColour = hex(onValue);
          if (fgColour === null || onColour === null) {
            failures.push(`${label}: ${fg} (${fgValue}) on ${on} (${onValue}) is not two hex colours`);
            continue;
          }
          const measured = ratio(fgColour, onColour);
          if (measured < 4.5) failures.push(`${label}: ${fg} on ${on} is ${measured.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("the components", () => {
  const sources: [string, string][] = [["base.css", baseCss], ...Object.entries(componentFiles)];

  it("hold no colour of their own", () => {
    const patterns = [/#[0-9a-fA-F]{3,8}\b/g, /\b(rgba?|hsla?)\(/g, /(?<![-\w])(white|black)(?![-\w])/g];
    const failures: string[] = [];
    for (const [file, text] of sources) {
      const source = file.endsWith(".css") ? stripComments(text) : text;
      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) failures.push(`${file}: ${match[0]}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("hold no duration of their own", () => {
    const failures: string[] = [];
    for (const [file, text] of sources) {
      if (!file.endsWith(".css")) continue;
      for (const match of stripComments(text).matchAll(/(?<![\w.#-])\d*\.?\d+m?s\b/g)) {
        failures.push(`${file}: ${match[0]}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("hold no radius of their own", () => {
    const failures: string[] = [];
    for (const [file, text] of sources) {
      if (!file.endsWith(".css")) continue;
      for (const match of stripComments(text).matchAll(/\bborder(?:-[a-z]+)*-radius\s*:\s*([^;}]+)/g)) {
        const value = (match[1] ?? "").trim();
        // A radius is a token, or 0 for a corner the token's shape leaves square.
        const rest = value
          .replace(/var\(--pb-[\w-]+\)/g, "")
          .replace(/\b0\b/g, "")
          .trim();
        if (rest !== "") failures.push(`${file}: ${match[0]}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("hold no shadow of their own", () => {
    const failures: string[] = [];
    for (const [file, text] of sources) {
      if (!file.endsWith(".css")) continue;
      for (const match of stripComments(text).matchAll(/\b(?:box|text)-shadow\s*:\s*([^;}]+)/g)) {
        const value = (match[1] ?? "").trim();
        if (value !== "none" && !/^var\(--pb-[\w-]+\)$/.test(value)) failures.push(`${file}: ${match[0]}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("set no radius, shadow or motion in an inline style", () => {
    const failures: string[] = [];
    for (const [file, text] of sources) {
      if (!file.endsWith(".tsx")) continue;
      for (const match of text.matchAll(/\b(borderRadius|boxShadow|textShadow|transition\w*|animation\w*)\s*:/g)) {
        failures.push(`${file}: ${match[0]}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
