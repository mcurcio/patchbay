import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";
import css from "./IconButton.css?raw";

describe("IconButton", () => {
  it("is named by its label, with the glyph hidden from screen readers", () => {
    render(<IconButton label="Zoom in">+</IconButton>);
    const button = screen.getByRole("button", { name: "Zoom in" });
    expect(button).toHaveClass("pb-button", "pb-icon-button");
    expect(button).toHaveAttribute("type", "button");
    expect(screen.getByText("+")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows its label as the tooltip unless a title is given", () => {
    const { rerender } = render(<IconButton label="Fit view">F</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Fit view");
    rerender(
      <IconButton label="Fit view" title="Fit view (F)">
        F
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Fit view" })).toHaveAttribute("title", "Fit view (F)");
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Tidy" onClick={onClick}>
        T
      </IconButton>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Tidy" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps Button's tone, size, pressed and busy", async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Minimap" tone="primary" size="sm" aria-pressed busy onClick={onClick}>
        M
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Minimap", pressed: true });
    expect(button).toHaveAttribute("data-tone", "primary");
    expect(button).toHaveAttribute("data-size", "sm");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".pb-spinner")).not.toBeNull();
    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes a ref and extra classes through", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton ref={ref} className="mine" label="Close">
        x
      </IconButton>,
    );
    expect(ref.current).toBe(screen.getByRole("button", { name: "Close" }));
    expect(ref.current).toHaveClass("mine");
  });

  it("is a 36 px target on touch", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/width: 36px/);
    expect(touch?.[1]).toMatch(/height: 36px/);
    // Edged at rest on touch, where nothing hovers, so it can be found.
    expect(touch?.[1]).toMatch(
      /:not\(:disabled, \[data-tone="primary"\]\) \{\s*border-color: var\(--pb-line-strong\);/,
    );
  });

  it("takes a tone it does not know, and its stylesheet styles only the ones Button knows", () => {
    render(
      <IconButton label="Odd" tone="sparkly">
        ?
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Odd" })).toHaveAttribute("data-tone", "sparkly");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["danger", "primary"]);
  });

  it("keeps a pressed one visible in forced colours, where it has no face", () => {
    expect(css).toMatch(/forced-colors: active\)\s*\{[^@]*\[aria-pressed="true"\]\s*\{\s*border-color: Highlight/);
  });

  it("while busy with a busyLabel is named and titled by it, announces it, and shows the glyph still", () => {
    const { rerender } = render(
      <IconButton label="Refresh" busyLabel="Refreshing">
        R
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button).toHaveAttribute("title", "Refresh");
    rerender(
      <IconButton label="Refresh" busy busyLabel="Refreshing">
        R
      </IconButton>,
    );
    expect(button).toHaveAccessibleName("Refreshing");
    expect(button).toHaveAttribute("title", "Refreshing");
    expect(screen.getByText("R")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector(".pb-button-announce")).toHaveTextContent("Refreshing");
    rerender(
      <IconButton label="Refresh" title="Refresh (R)" busy busyLabel="Refreshing">
        R
      </IconButton>,
    );
    expect(button).toHaveAttribute("title", "Refresh (R)");
  });
});
