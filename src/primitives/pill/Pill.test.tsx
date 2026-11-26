import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pill, type PillTone } from "./Pill";
import pillCss from "./Pill.css?raw";

describe("Pill", () => {
  it("shows its word beside a dot hidden from screen readers", () => {
    const { container } = render(<Pill tone="ok" label="running" />);
    const pill = screen.getByText("running");
    expect(pill).toHaveClass("pb-pill");
    expect(pill).toHaveAttribute("data-tone", "ok");
    expect(container.querySelector(".pb-pill-dot")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws a tone it does not know by its own word", () => {
    render(<Pill tone="sleeping" label="sleeping" />);
    expect(screen.getByText("sleeping")).toHaveAttribute("data-tone", "sleeping");
    // Only the known tones have a colour of their own; anything else keeps the pill's muted default.
    expect(pillCss).not.toContain('[data-tone="sleeping"]');
    const tones = new Set([...pillCss.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["accent", "err", "muted", "off", "ok", "quiet", "warn"]);
  });

  it("takes any string as a tone, as its open type says", () => {
    const tone: PillTone = "anything-an-app-names";
    render(<Pill tone={tone} label="open" />);
    expect(screen.getByText("open")).toHaveAttribute("data-tone", "anything-an-app-names");
  });

  it("keeps the dot visible under forced colours", () => {
    expect(pillCss).toMatch(
      /forced-colors: active\)\s*\{\s*\.pb-pill-dot\s*\{\s*forced-color-adjust: none;\s*background: CanvasText;/,
    );
  });

  it("pulses only when asked", () => {
    const { rerender } = render(<Pill tone="quiet" label="configuring" />);
    expect(screen.getByText("configuring")).not.toHaveAttribute("data-pulse");
    rerender(<Pill tone="quiet" label="configuring" pulse />);
    expect(screen.getByText("configuring")).toHaveAttribute("data-pulse");
  });

  it("stops the pulse under reduced motion", () => {
    expect(pillCss).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.pb-pill\[data-pulse\] \.pb-pill-dot\s*\{\s*animation: none/,
    );
  });

  it("shows its title on hover and a detail in code type", () => {
    render(<Pill tone="err" label="failed" title="The device went away" detail="E_GONE" />);
    expect(screen.getByText("failed")).toHaveAttribute("title", "The device went away");
    const detail = screen.getByText("E_GONE");
    expect(detail.tagName).toBe("CODE");
    expect(detail).toHaveClass("pb-pill-detail");
  });

  it("has no detail unless given one", () => {
    const { container } = render(<Pill tone="ok" label="running" />);
    expect(container.querySelector("code")).toBeNull();
  });
});
