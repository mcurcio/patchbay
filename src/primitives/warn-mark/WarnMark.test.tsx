import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WarnMark } from "./WarnMark";

describe("WarnMark", () => {
  it("shows the glyph to the eye and its words to screen readers", () => {
    const { container } = render(<WarnMark label="dropouts rose in the last minute" />);
    const glyph = container.querySelector(".pb-warn-mark");
    expect(glyph).toHaveTextContent("!");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("dropouts rose in the last minute")).toHaveClass("pb-warn-mark-text");
  });

  it("puts its title on the glyph, and none unless given", () => {
    const { container, rerender } = render(<WarnMark label="rose" />);
    expect(container.querySelector(".pb-warn-mark")).not.toHaveAttribute("title");
    rerender(<WarnMark label="rose" title="Rose in the last minute" />);
    expect(container.querySelector(".pb-warn-mark")).toHaveAttribute("title", "Rose in the last minute");
  });
});
