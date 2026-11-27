// Glyph: the one grid (a 16 px box and viewBox, a 1.75 stroke with round caps and joins, the current colour), hidden
// from screen readers, its shapes as given; and every glyph of patchbay's drawn on it.
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CloseGlyph } from "../icon-button";
import { ThemeSwitch } from "../theme-switch";
import { Glyph, GLYPH_BOX, GLYPH_DRAWN, GLYPH_STROKE } from "./Glyph";

/** Every number in a glyph's shapes, which the grid holds within its middle 12 px. */
const coordinates = (svg: SVGSVGElement): number[] => {
  const numbers: number[] = [];
  for (const shape of svg.querySelectorAll("path, circle")) {
    if (shape.tagName.toLowerCase() === "path") {
      // Absolute commands only (M, L, H, V, A's end): enough for the glyphs here, which draw within the box.
      for (const match of (shape.getAttribute("d") ?? "").matchAll(/[MLHVZ]\s*([\d.\s,-]*)/g)) {
        for (const n of (match[1] ?? "").split(/[\s,]+/).filter(Boolean)) numbers.push(Number(n));
      }
    } else {
      const c = Number(shape.getAttribute("cx")) - Number(shape.getAttribute("r"));
      numbers.push(c, Number(shape.getAttribute("cx")) + Number(shape.getAttribute("r")));
    }
  }
  return numbers;
};

const onGrid = (svg: SVGSVGElement | null) => {
  expect(svg).not.toBeNull();
  if (svg === null) return;
  expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
  expect(svg).toHaveAttribute("width", "16");
  expect(svg).toHaveAttribute("height", "16");
  expect(svg).toHaveAttribute("stroke", "currentColor");
  expect(svg).toHaveAttribute("stroke-width", "1.75");
  expect(svg).toHaveAttribute("stroke-linecap", "round");
  expect(svg).toHaveAttribute("aria-hidden", "true");
  const margin = (GLYPH_BOX - GLYPH_DRAWN) / 2;
  for (const n of coordinates(svg)) {
    expect(n).toBeGreaterThanOrEqual(margin);
    expect(n).toBeLessThanOrEqual(GLYPH_BOX - margin);
  }
};

describe("Glyph", () => {
  it("draws its shapes on the one grid, hidden, with the app's class", () => {
    const { container } = render(
      <Glyph className="mine" data-testid="g">
        <path d="M3 8h10" />
      </Glyph>,
    );
    const svg = container.querySelector("svg");
    onGrid(svg);
    expect(svg).toHaveClass("pb-glyph", "mine");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg?.querySelector("path")).toHaveAttribute("d", "M3 8h10");
    expect([GLYPH_BOX, GLYPH_DRAWN, GLYPH_STROKE]).toEqual([16, 12, 1.75]);
  });

  it("is the grid CloseGlyph and ThemeSwitch draw on", () => {
    onGrid(render(<CloseGlyph />).container.querySelector("svg"));
    onGrid(render(<ThemeSwitch choice="dark" onChoose={() => {}} />).container.querySelector("svg"));
  });
});
