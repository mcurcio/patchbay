// The tokens, themes and brands (docs/tokens.md): tokens.css's three sets (light, the system's dark, the chosen dark)
// and each example brand's (examples/brands/, which hold a brand to the rules an app's own brand must keep), every
// text, tone, on-strong and code pair at 4.5:1 for the base and each example brand in each theme (through the check
// apps run, @mcurcio/patchbay/testing), and no colour, duration, radius or shadow of its own in a component.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  cssBlocks,
  customProperties,
  findBlock,
  isColour,
  resolveToken,
  stripComments,
  tokenSets,
} from "../testing/brand-css";
import { checkBrandContrast } from "../testing";
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

const base = tokenSets(tokensCss, ":root");

const brands = Object.entries(brandFiles).map(([file, css]) => {
  const name = /([\w-]+)\.css$/.exec(file)?.[1] ?? file;
  return { name, css, ...tokenSets(css, `:root[data-brand="${name}"]`) };
});

describe("the tokens", () => {
  it("has a light set, a system dark set and a chosen dark set", () => {
    expect(customProperties(base.light).size).toBeGreaterThan(0);
    expect(customProperties(base.systemDark).size).toBeGreaterThan(0);
    expect(customProperties(base.chosenDark).size).toBeGreaterThan(0);
  });

  it("names every token --pb-*", () => {
    const names = [...cssBlocks(tokensCss)]
      .filter((block) => block.selector.startsWith(":root"))
      .flatMap((block) => [...customProperties(block).keys()]);
    expect(names.filter((name) => !name.startsWith("--pb-"))).toEqual([]);
  });

  it("writes the dark set the same both times", () => {
    expect(customProperties(base.systemDark)).toEqual(customProperties(base.chosenDark));
    expect(base.systemDark?.declarations.get("color-scheme")).toBe("dark");
    expect(base.chosenDark?.declarations.get("color-scheme")).toBe("dark");
  });

  it("redefines every colour in the dark set and nothing else", () => {
    const light = customProperties(base.light);
    const dark = customProperties(base.chosenDark);
    const unknown = [...dark.keys()].filter((name) => !light.has(name));
    const missing = [...light]
      .filter(([, value]) => isColour(value))
      .map(([name]) => name)
      .filter((name) => !dark.has(name));
    expect({ unknown, missing }).toEqual({ unknown: [], missing: [] });
  });

  it("zeroes the fast and slow motion under reduced motion", () => {
    const reduced = findBlock(cssBlocks(tokensCss), /prefers-reduced-motion:\s*reduce/, ":root");
    expect(customProperties(reduced)).toEqual(
      new Map([
        ["--pb-motion-fast", "0ms"],
        ["--pb-motion-slow", "0ms"],
      ]),
    );
  });

  it("points React Flow's variables at tokens only", () => {
    const flow = findBlock(cssBlocks(tokensCss), null, ".react-flow");
    const values = [...customProperties(flow)];
    expect(values.length).toBeGreaterThan(0);
    expect(values.filter(([name, value]) => !name.startsWith("--xy-") || !value.includes("var(--pb-"))).toEqual([]);
  });

  it("sets only React Flow variables the installed React Flow reads", () => {
    // React Flow's style.css reads each variable it offers (var(--xy-edge-stroke, var(--xy-edge-stroke-default))). The
    // dev dependency is kept at the newest supported minor (docs/graph.md states the range), so a name React Flow
    // renamed or dropped fails here rather than leaving the canvas unthemed.
    const flowCss = readFileSync(createRequire(import.meta.url).resolve("@xyflow/react/dist/style.css"), "utf8");
    const read = new Set([...stripComments(flowCss).matchAll(/var\(\s*(--xy-[\w-]+)/g)].map((match) => match[1]));
    const set = [...customProperties(findBlock(cssBlocks(tokensCss), null, ".react-flow")).keys()];
    expect(set.length).toBeGreaterThan(0);
    expect(set.filter((name) => !read.has(name))).toEqual([]);
  });
});

describe("the example brands", () => {
  it("has ember and harbor", () => {
    expect(brands.map((brand) => brand.name).sort()).toEqual(["ember", "harbor"]);
  });

  it.each(brands)("$name overrides only tokens.css's tokens, under its own data-brand", (brand) => {
    const known = customProperties(base.light);
    const own = [brand.light, brand.systemDark, brand.chosenDark].filter((block) => block !== undefined);
    const stray = brand.blocks.filter((block) => !own.includes(block)).map((block) => block.selector);
    const unknown = own.flatMap((block) => [...customProperties(block).keys()]).filter((name) => !known.has(name));
    expect({ stray, unknown }).toEqual({ stray: [], unknown: [] });
  });

  // A node box's sizes are what an app lays its nodes out with before they render (docs/graph.md#geometry), so a
  // brand that changed one would draw boxes of another size than the layout made room for.
  it.each(brands)("$name sets none of the node geometry tokens", (brand) => {
    const own = [brand.light, brand.systemDark, brand.chosenDark].flatMap((block) => [
      ...customProperties(block).keys(),
    ]);
    expect(own.filter((name) => name.startsWith("--pb-node-"))).toEqual([]);
  });

  it.each(brands)("$name writes its dark set the same both times", (brand) => {
    expect(customProperties(brand.systemDark)).toEqual(customProperties(brand.chosenDark));
  });

  // :root[data-brand] is as specific as :root[data-theme="dark"] and loads later, so a colour the brand sets for light
  // would win in dark too unless its dark blocks set it again.
  it.each(brands)("$name gives every colour it sets a dark value", (brand) => {
    const dark = customProperties(brand.chosenDark);
    const missing = [...customProperties(brand.light)]
      .filter(
        ([name, value]) => isColour(value) || isColour(resolveToken(customProperties(base.light), `var(${name})`)),
      )
      .map(([name]) => name)
      .filter((name) => !dark.has(name));
    expect(missing).toEqual([]);
  });
});

// The rule an app's own brand keeps too, through the same check it runs (@mcurcio/patchbay/testing).
describe("contrast", () => {
  const cases = [{ name: "base", css: "" }, ...brands];

  it.each(cases)("keeps every text at 4.5:1 on what it is drawn on, light and dark: $name", ({ name, css }) => {
    expect(checkBrandContrast(css, name).map((failure) => failure.message)).toEqual([]);
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
