import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WarnMark } from "./WarnMark";
import css from "./WarnMark.css?raw";

describe("WarnMark", () => {
  it("shows the glyph to the eye and its words to screen readers", () => {
    const { container } = render(<WarnMark label="retries rose in the last minute" />);
    const glyph = container.querySelector(".pb-warn-mark");
    expect(glyph).toHaveTextContent("!");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("retries rose in the last minute")).toHaveClass("pb-warn-mark-text");
  });

  it("puts its title on the glyph, and none unless given", () => {
    const { container, rerender } = render(<WarnMark label="rose" />);
    expect(container.querySelector(".pb-warn-mark")).not.toHaveAttribute("title");
    rerender(<WarnMark label="rose" title="Rose in the last minute" />);
    expect(container.querySelector(".pb-warn-mark")).toHaveAttribute("title", "Rose in the last minute");
  });

  it("keeps its circle under forced colours", () => {
    expect(css).toMatch(
      /forced-colors: active\)\s*\{\s*\.pb-warn-mark\s*\{\s*forced-color-adjust: none;\s*background: CanvasText;\s*color: Canvas;/,
    );
  });
});
