import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { StatusWords } from "./StatusWords";
import css from "./StatusWords.css?raw";

describe("StatusWords", () => {
  it("draws its words in the order given, in one polite live list", () => {
    render(
      <StatusWords
        aria-label="Status"
        className="mine"
        items={[
          { tone: "err", label: "2 errors" },
          { tone: "ok", label: "saved" },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Status" });
    expect(list).toHaveClass("pb-status-words", "mine");
    expect(list).toHaveAttribute("aria-live", "polite");
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["2 errors", "saved"]);
    expect(items.map((item) => item.getAttribute("data-tone"))).toEqual(["err", "ok"]);
  });

  it("shows a word's title on hover", () => {
    render(<StatusWords items={[{ tone: "err", label: "2 errors", title: "Lines 4 and 9" }]} />);
    expect(screen.getByRole("listitem")).toHaveAttribute("title", "Lines 4 and 9");
  });

  it("draws a tone it does not know neutrally", () => {
    render(<StatusWords items={[{ tone: "sleeping", label: "sleeping" }]} />);
    expect(screen.getByRole("listitem")).toHaveAttribute("data-tone", "sleeping");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["accent", "err", "muted", "off", "ok", "quiet", "warn"]);
  });

  it("keeps an empty live list for the next change", () => {
    render(<StatusWords aria-label="Status" items={[]} />);
    expect(screen.getByRole("list", { name: "Status" })).toHaveAttribute("aria-live", "polite");
  });

  it("keeps two words with the same label", () => {
    render(
      <StatusWords
        items={[
          { tone: "warn", label: "late" },
          { tone: "warn", label: "late" },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("passes native props and the ref; the app may make it assertive", () => {
    const ref = createRef<HTMLUListElement>();
    render(<StatusWords ref={ref} id="s" aria-live="assertive" items={[{ tone: "ok", label: "saved" }]} />);
    expect(ref.current).toBe(screen.getByRole("list"));
    expect(ref.current).toHaveAttribute("id", "s");
    expect(ref.current).toHaveAttribute("aria-live", "assertive");
  });

  it("draws the dot between words for the eye only", () => {
    expect(css).toMatch(/\.pb-status-word \+ \.pb-status-word::before\s*\{[^}]*content: "·" \/ ""/);
  });

  it("has nothing to stop under reduced motion: no animation or transition", () => {
    expect(css).not.toMatch(/animation|transition/);
  });
});
