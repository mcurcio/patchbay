import { render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
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

  it("has its region in the page, empty, in the commit that adds it, and its label in the next", () => {
    const seen: (string | null)[] = [];
    function Probe({ label }: { label?: string }) {
      useLayoutEffect(() => {
        seen.push(document.querySelector('[role="status"]')?.textContent ?? null);
      });
      return <Spinner label={label} />;
    }
    const { rerender } = render(<Probe label="Saving" />);
    expect(seen[0]).toBe("");
    expect(screen.getByRole("status")).toHaveTextContent("Saving");
    // The label goes and comes back: the region comes back empty first, as on mounting.
    rerender(<Probe />);
    expect(screen.queryByRole("status")).toBeNull();
    seen.length = 0;
    rerender(<Probe label="Loading" />);
    expect(seen[0]).toBe("");
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
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
