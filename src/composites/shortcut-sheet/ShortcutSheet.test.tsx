import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type ShortcutLine, ShortcutSheet, groupShortcuts } from "./ShortcutSheet";

const shortcuts: ShortcutLine[] = [
  { keys: "Mod+K", label: "Open the palette", group: "General" },
  { keys: ["Delete", "Backspace"], label: "Delete the selection", group: "Edit" },
  { keys: "Shift+?", label: "Show the keys", group: "General" },
  { keys: "Mod+Shift+Z", label: "Redo", group: "Edit" },
];

describe("groupShortcuts", () => {
  it("groups the lines by first appearance, keeping their order", () => {
    expect(groupShortcuts(shortcuts).map(({ group, lines }) => [group, lines.map((line) => line.label)])).toEqual([
      ["General", ["Open the palette", "Show the keys"]],
      ["Edit", ["Delete the selection", "Redo"]],
    ]);
    expect(groupShortcuts([])).toEqual([]);
  });
});

describe("ShortcutSheet", () => {
  it("draws nothing while closed", () => {
    render(<ShortcutSheet open={false} onClose={() => {}} shortcuts={shortcuts} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a dialog titled Keyboard shortcuts, one named section per group", () => {
    render(<ShortcutSheet open onClose={() => {}} shortcuts={shortcuts} platform="other" className="mine" />);
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog).toHaveClass("pb-shortcut-sheet", "mine");
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "General",
      "Edit",
    ]);
    const edit = screen.getByRole("region", { name: "Edit" });
    expect(
      within(edit)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Delete the selection", "Redo"]);
  });

  it("writes keys through keyLabel for the platform, several joined by or", () => {
    const { unmount } = render(<ShortcutSheet open onClose={() => {}} shortcuts={shortcuts} platform="other" />);
    const definitions = screen.getAllByRole("definition");
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      "Ctrl+K",
      "Shift+?",
      "Delete or Backspace",
      "Ctrl+Shift+Z",
    ]);
    expect(definitions[0]).toHaveAttribute("aria-keyshortcuts", "Control+K");
    unmount();
    render(
      <ShortcutSheet
        open
        onClose={() => {}}
        shortcuts={shortcuts}
        platform="apple"
        labels={{ or: "/", keyNames: { Delete: "Del" } }}
      />,
    );
    expect(screen.getAllByRole("definition").map((definition) => definition.textContent)).toEqual([
      "⌘K",
      "⇧?",
      "Del / ⌫",
      "⇧⌘Z",
    ]);
  });

  it("says when there are none, and shows a note as children", () => {
    render(
      <ShortcutSheet open onClose={() => {}} shortcuts={[]} labels={{ empty: "Nothing bound", title: "Keys" }}>
        Keys do not act while you type.
      </ShortcutSheet>,
    );
    expect(screen.getByRole("dialog", { name: "Keys" })).toHaveTextContent("Nothing bound");
    expect(screen.getByText("Keys do not act while you type.")).toBeInTheDocument();
  });

  it("asks to close on Escape and its close button, named by its close label", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ShortcutSheet open onClose={onClose} shortcuts={shortcuts} labels={{ close: "Done" }} />);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
