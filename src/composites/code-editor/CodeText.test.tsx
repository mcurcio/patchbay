import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { CodeText } from "./CodeText";
import { loadKnobly } from "./highlight";

describe("CodeText", () => {
  it("draws the text in a focusable pre, CRLF as LF, passing native props and the ref through", () => {
    const ref = createRef<HTMLPreElement>();
    render(<CodeText ref={ref} value={"a\r\nb"} aria-label="Settings" className="mine" />);
    const box = screen.getByLabelText("Settings");
    expect(ref.current).toBe(box);
    expect(box).toHaveClass("pb-code-text", "mine");
    expect(box).toHaveAttribute("tabindex", "0");
    expect(box.textContent).toBe("a\nb");
  });

  it("highlights knobly once the peer is loaded", async () => {
    await loadKnobly();
    const { container } = render(<CodeText value={"# note\nrate 1;"} language="knobly" />);
    expect(container.querySelector('[data-class="comment"]')).toHaveTextContent("# note");
    expect(container.querySelector('[data-class="directive"]')).toHaveTextContent("rate");
    expect(container.querySelector('[data-class="number"]')).toHaveTextContent("1");
  });

  it("takes the app's highlighter over a language, and draws a class it does not know as a plain span", () => {
    const { container } = render(
      <CodeText value="abc" language="knobly" highlight={() => [{ start: 0, end: 3, class: "sparkle" }]} />,
    );
    expect(container.querySelector(".pb-code-run")).toHaveAttribute("data-class", "sparkle");
  });

  it("draws plain text for a language it does not know", () => {
    const { container } = render(<CodeText value="abc" language="cobol" />);
    expect(container.querySelector(".pb-code-run")).toBeNull();
    expect(container.textContent).toBe("abc");
  });
});
