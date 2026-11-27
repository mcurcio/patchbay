// ChangeList: the count in a status line there from the start; each change in order with its Badge (the list's word,
// or an unknown change's own), its words, a refusal's reason and its mark; Drop asking with the id and described by
// the row's words; the actions slot; its words through labels; and its stylesheet.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChangeList, defaultChangeListLabels, type QueuedChange } from "./ChangeList";
import css from "./ChangeList.css?raw";

const changes: QueuedChange[] = [
  { id: "1", change: "added", label: "mix-2", detail: "mixer" },
  { id: "2", change: "changed", label: "Tone 1", detail: "gain 0.8 → 1.2", refused: "gain must be at most 1" },
  { id: "3", change: "removed", label: "Tone 1: left → out: in" },
  { id: "4", change: "moved", label: "sink-1" },
];

describe("ChangeList", () => {
  it("lists each change in order with its Badge, words and drop button", () => {
    render(<ChangeList changes={changes} onDrop={() => {}} />);
    const list = screen.getByRole("region", { name: "4 changes" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector(".pb-badge")?.textContent)).toEqual([
      "added",
      "changed",
      "removed",
      "moved",
    ]);
    expect(rows.map((row) => row.querySelector(".pb-badge")?.getAttribute("data-tone"))).toEqual([
      "added",
      "changed",
      "removed",
      "moved",
    ]);
    expect(rows[0]).toHaveTextContent("mix-2mixer");
    expect(rows[1]).toHaveAttribute("data-refused");
    expect(within(rows[1] as HTMLElement).getByText("Refused: gain must be at most 1")).toBeInTheDocument();
    expect(rows[0]).not.toHaveAttribute("data-refused");
    const drop = within(rows[2] as HTMLElement).getByRole("button", { name: "Drop" });
    expect(drop).toHaveAccessibleDescription("Tone 1: left → out: in");
  });

  it("asks to drop a change by its id", async () => {
    const onDrop = vi.fn();
    render(<ChangeList changes={changes} onDrop={onDrop} />);
    await userEvent.click(screen.getByRole("button", { name: "Drop", description: /gain 0\.8/ }));
    expect(onDrop).toHaveBeenCalledWith("2");
  });

  it("has no drop buttons without onDrop", () => {
    render(<ChangeList changes={changes} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says the count in a status line there while empty, and draws the actions beside it", () => {
    const { rerender } = render(<ChangeList changes={[]} actions={<button type="button">Save</button>} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No changes");
    expect(screen.queryByRole("list")).toBeNull();
    expect(status.nextElementSibling).toContainElement(screen.getByRole("button", { name: "Save" }));
    rerender(<ChangeList changes={changes.slice(0, 1)} aria-label="Queue" />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("1 change");
    expect(screen.getByRole("region", { name: "Queue" })).toBeInTheDocument();
  });

  it("takes its words through labels", () => {
    render(
      <ChangeList
        changes={changes.slice(0, 2)}
        onDrop={() => {}}
        labels={{
          added: "neu",
          count: (n) => `${String(n)} Änderungen`,
          drop: "Verwerfen",
          refused: (r) => `Abgelehnt: ${r}`,
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 Änderungen");
    expect(screen.getByText("neu")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Verwerfen" })).toHaveLength(2);
    expect(screen.getByText("Abgelehnt: gain must be at most 1")).toBeInTheDocument();
    expect(defaultChangeListLabels.count(3)).toBe("3 changes");
  });

  it("marks a refused row with a stripe at the inline start, kept under forced colours", () => {
    expect(css).toMatch(/\.pb-change-row\[data-refused\] \{\s*border-inline-start-color: var\(--pb-err\);/);
    expect(css).toMatch(/@media \(forced-colors: active\)[^@]*CanvasText/);
  });
});
