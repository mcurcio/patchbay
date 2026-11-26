import { describe, expect, it } from "vitest";
import { cssBlocks } from "./brand-css";
import { checkBrandContrast, contrastPairs, contrastRatio, minimumContrast } from ".";

const brand = (light: string, dark = "") => `
:root[data-brand="test"] { ${light} }
@media (prefers-color-scheme: dark) {
  :root[data-brand="test"]:not([data-theme]) { ${dark} }
}
:root[data-brand="test"][data-theme="dark"] { ${dark} }
`;

describe("contrastRatio", () => {
  it("is WCAG 2's ratio of two hex colours, NaN for anything else", () => {
    expect(contrastRatio("#000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777")).toBe(1);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("red", "#fff")).toBeNaN();
  });
});

describe("checkBrandContrast", () => {
  it("passes the base theme alone, and a brand that keeps the rule", () => {
    expect(checkBrandContrast("", "base")).toEqual([]);
    expect(checkBrandContrast(brand("--pb-accent: #0f766e;", "--pb-accent: #2dd4bf;"), "test")).toEqual([]);
  });

  it("names the brand, the theme, the pair, the values and the ratio of each failure", () => {
    const failures = checkBrandContrast(brand("--pb-accent: #9ca3af;", "--pb-accent: #2dd4bf;"), "test");
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((failure) => failure.theme === "light")).toBe(true);
    const onSurface = failures.find((failure) => failure.fg === "--pb-accent" && failure.on === "--pb-surface");
    expect(onSurface).toMatchObject({ brand: "test", theme: "light", fgValue: "#9ca3af" });
    expect(onSurface?.ratio).toBeLessThan(minimumContrast);
    expect(onSurface?.message).toMatch(
      /^test light: --pb-accent \(#9ca3af\) on --pb-surface \(#[0-9a-f]+\) is \d\.\d\d:1$/,
    );
  });

  it("checks the system's dark and the chosen dark apart", () => {
    const css = `
:root[data-brand="test"] { --pb-accent: #0f766e; }
@media (prefers-color-scheme: dark) {
  :root[data-brand="test"]:not([data-theme]) { --pb-accent: #134e4a; }
}
:root[data-brand="test"][data-theme="dark"] { --pb-accent: #2dd4bf; }
`;
    const themes = new Set(checkBrandContrast(css, "test").map((failure) => failure.theme));
    expect([...themes]).toEqual(["system dark"]);
  });

  it("fails a colour that is not hex, saying so", () => {
    const [failure] = checkBrandContrast(brand("--pb-text: red;", "--pb-text: red;"), "test");
    expect(failure?.ratio).toBeNaN();
    expect(failure?.message).toContain("--pb-text (red)");
    expect(failure?.message).toContain("is not two hex colours");
  });

  it("reads only the named brand's blocks", () => {
    expect(checkBrandContrast(brand("--pb-accent: #9ca3af;", "--pb-accent: #9ca3af;"), "other")).toEqual([]);
  });

  it("lists the text, accent, tone, change, on-strong and code tokens", () => {
    const fg = new Set(contrastPairs.flatMap((pair) => pair.fg));
    for (const name of ["--pb-text", "--pb-accent", "--pb-err", "--pb-added", "--pb-on-strong", "--pb-code-text"]) {
      expect(fg.has(name)).toBe(true);
    }
  });
});

describe("cssBlocks", () => {
  it("reads every rule inside an at-rule and skips statement at-rules and comments", () => {
    const blocks = cssBlocks(`@import url("x.css");
/* a { --no: 1 } */
@media (prefers-color-scheme: dark) { a { --a: 1; } b { --b: 2; } }
c { --c: 3 }`);
    expect(blocks.map((block) => [block.media, block.selector, [...block.declarations]])).toEqual([
      ["@media (prefers-color-scheme: dark)", "a", [["--a", "1"]]],
      ["@media (prefers-color-scheme: dark)", "b", [["--b", "2"]]],
      [null, "c", [["--c", "3"]]],
    ]);
  });
});
