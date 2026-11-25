import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";
import css from "./Spinner.css?raw";

describe("Spinner", () => {
  it("is hidden from screen readers without a label", () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstElementChild;
    expect(spinner).toHaveClass("pb-spinner");
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("treats an empty label as none", () => {
    const { container } = render(<Spinner label="" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("is a status named by its label", () => {
    render(<Spinner label="Saving" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Saving");
    expect(status).not.toHaveAttribute("aria-hidden");
  });

  it("passes native props and keeps its own class", () => {
    const { container } = render(<Spinner className="mine" data-testid="s" />);
    expect(container.firstElementChild).toHaveClass("pb-spinner", "mine");
    expect(screen.getByTestId("s")).toBeInTheDocument();
  });

  it("turns on the spin token and stops under reduced motion", () => {
    expect(css).toMatch(/animation:\s*pb-spin var\(--pb-motion-spin\) linear infinite/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(reduced?.[1]).toMatch(/animation:\s*none/);
  });
});
