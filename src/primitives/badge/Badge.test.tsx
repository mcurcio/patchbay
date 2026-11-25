import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import badgeCss from "./Badge.css?raw";

describe("Badge", () => {
  it("shows its children in a chip of its tone", () => {
    render(<Badge tone="warn">3 dropouts</Badge>);
    const badge = screen.getByText("3 dropouts");
    expect(badge).toHaveClass("pb-badge");
    expect(badge).toHaveAttribute("data-tone", "warn");
  });

  it("takes any content as children", () => {
    render(
      <Badge tone="err">
        <strong>not</strong> realtime
      </Badge>,
    );
    expect(screen.getByText("not").tagName).toBe("STRONG");
    expect(screen.getByText(/realtime/)).toHaveClass("pb-badge");
  });

  it("draws a tone it does not know neutrally", () => {
    render(<Badge tone="mystery">new</Badge>);
    expect(screen.getByText("new")).toHaveAttribute("data-tone", "mystery");
    expect(badgeCss).not.toContain('[data-tone="mystery"]');
    const tones = new Set([...badgeCss.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["err", "off", "ok", "quiet", "warn"]);
  });

  it("shows its title on hover, and none unless given", () => {
    const { rerender } = render(<Badge tone="ok">live</Badge>);
    expect(screen.getByText("live")).not.toHaveAttribute("title");
    rerender(
      <Badge tone="ok" title="Receiving audio">
        live
      </Badge>,
    );
    expect(screen.getByText("live")).toHaveAttribute("title", "Receiving audio");
  });
});
