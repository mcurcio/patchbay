import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, type BadgeTone } from "./Badge";
import badgeCss from "./Badge.css?raw";

describe("Badge", () => {
  it("shows its children in a chip of its tone", () => {
    render(<Badge tone="warn">3 retries</Badge>);
    const badge = screen.getByText("3 retries");
    expect(badge).toHaveClass("pb-badge");
    expect(badge).toHaveAttribute("data-tone", "warn");
  });

  it("takes any content as children", () => {
    render(
      <Badge tone="err">
        <strong>not</strong> ready
      </Badge>,
    );
    expect(screen.getByText("not").tagName).toBe("STRONG");
    expect(screen.getByText(/ready/)).toHaveClass("pb-badge");
  });

  it("draws a tone it does not know neutrally", () => {
    render(<Badge tone="mystery">new</Badge>);
    expect(screen.getByText("new")).toHaveAttribute("data-tone", "mystery");
    expect(badgeCss).not.toContain('[data-tone="mystery"]');
    const tones = new Set([...badgeCss.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual([
      "accent",
      "added",
      "changed",
      "err",
      "muted",
      "off",
      "ok",
      "quiet",
      "removed",
      "renamed",
      "warn",
    ]);
    // Outlined, its edge is line-strong, as every unknown tone's is; off keeps a plain line.
    expect(badgeCss).toMatch(/\.pb-badge:not\(\[data-variant\]\) \{\s*border-color: var\(--pb-line-strong\);/);
  });

  it("takes any string as a tone, as its open type says", () => {
    const tone: BadgeTone = "anything-an-app-names";
    render(<Badge tone={tone}>open</Badge>);
    expect(screen.getByText("open")).toHaveAttribute("data-tone", "anything-an-app-names");
  });

  it("is outlined unless asked to fill", () => {
    const { rerender } = render(<Badge tone="err">not ready</Badge>);
    expect(screen.getByText("not ready")).not.toHaveAttribute("data-variant");
    rerender(
      <Badge tone="err" variant="outlined">
        not ready
      </Badge>,
    );
    expect(screen.getByText("not ready")).not.toHaveAttribute("data-variant");
    rerender(
      <Badge tone="err" variant="filled">
        not ready
      </Badge>,
    );
    expect(screen.getByText("not ready")).toHaveAttribute("data-variant", "filled");
  });

  it("fills with its tone's colour under on-strong words", () => {
    expect(badgeCss).toMatch(
      /\.pb-badge\[data-variant="filled"\]\s*\{[^}]*background: var\(--_pb-badge-ink\);[^}]*color: var\(--pb-on-strong\)/,
    );
  });

  it("fills a tone it does not know neutrally", () => {
    render(
      <Badge tone="mystery" variant="filled">
        new
      </Badge>,
    );
    expect(screen.getByText("new")).toHaveAttribute("data-variant", "filled");
    // The ink a tone it does not know keeps is the base rule's: muted.
    expect(badgeCss).toMatch(/\.pb-badge\s*\{\s*--_pb-badge-ink: var\(--pb-muted\);/);
  });

  it("draws changed as a warning on its soft surface", () => {
    expect(badgeCss).toMatch(
      /\[data-tone="changed"\]\s*\{\s*--_pb-badge-ink: var\(--pb-warn\);\s*--_pb-badge-soft: var\(--pb-warn-soft\);/,
    );
  });

  it("shows its title on hover, and none unless given", () => {
    const { rerender } = render(<Badge tone="ok">live</Badge>);
    expect(screen.getByText("live")).not.toHaveAttribute("title");
    rerender(
      <Badge tone="ok" title="Receiving data">
        live
      </Badge>,
    );
    expect(screen.getByText("live")).toHaveAttribute("title", "Receiving data");
  });
});
