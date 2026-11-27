import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { type Command, CommandPalette, defaultCommandPaletteLabels, placePalette } from "./CommandPalette";
import css from "./CommandPalette.css?raw";

function commands(run = vi.fn()): Command[] {
  return [
    { id: "zoom-in", label: "Zoom in", group: "View", keys: "Mod+=", run },
    { id: "fit", label: "Fit view", group: "View", hint: "Every node in sight", run },
    { id: "save", label: "Save", group: "File", keys: "Mod+S", run },
    { id: "export", label: "Export", group: "File", disabled: true, run },
    { id: "add", label: "Add a node", group: "Edit", keys: ["Shift+A", "Mod+Shift+N"], run },
  ];
}

/** A palette over app state, opened by a button, as an app holds it. */
function Held({ list, at }: { list: Command[]; at?: { x: number; y: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      <CommandPalette
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        commands={list}
        at={at}
        platform="other"
      />
    </>
  );
}

async function openHeld(list: Command[], at?: { x: number; y: number }) {
  const user = userEvent.setup();
  render(<Held list={list} at={at} />);
  await user.click(screen.getByRole("button", { name: "Open" }));
  return user;
}

const activeName = () => {
  const field = screen.getByRole("combobox");
  const id = field.getAttribute("aria-activedescendant");
  return id === null ? null : (document.getElementById(id)?.querySelector(".pb-palette-label")?.textContent ?? null);
};

describe("CommandPalette", () => {
  it("draws nothing while closed", () => {
    render(<CommandPalette open={false} onClose={() => {}} commands={commands()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a named dialog holding a combobox over a listbox of commands in groups, the field focused", async () => {
    await openHeld(commands());
    const dialog = screen.getByRole("dialog", { name: "Commands" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const field = screen.getByRole("combobox", { name: "Commands" });
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("placeholder", "Type a command");
    expect(field).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("listbox");
    expect(field).toHaveAttribute("aria-controls", list.id);
    const groups = screen.getAllByRole("group");
    expect(groups.map((group) => group.querySelector(".pb-palette-heading")?.textContent)).toEqual([
      "View",
      "File",
      "Edit",
    ]);
    expect(screen.getByRole("group", { name: "File" })).toBe(groups[1]);
    expect(screen.getAllByRole("option")).toHaveLength(5);
    expect(activeName()).toBe("Zoom in");
  });

  it("shows a hint as the option's description, keys through keyLabel, and marks a disabled command", async () => {
    await openHeld(commands());
    const fit = screen.getByRole("option", { name: /^Fit view/ });
    // An option is named by its words as shown: the label, the hint and the keys.
    expect(fit.querySelector(".pb-palette-hint")).toHaveTextContent("Every node in sight");
    expect(fit).toHaveAccessibleName(/^Fit view\s*Every node in sight$/);
    const add = screen.getByRole("option", { name: /^Add a node/ });
    expect(add).toHaveAttribute("aria-keyshortcuts", "Shift+A Control+Shift+N");
    expect([...add.querySelectorAll("kbd")].map((kbd) => kbd.textContent)).toEqual(["Shift+A", "Ctrl+Shift+N"]);
    expect(screen.getByRole("option", { name: /^Export/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("ranks by the query and marks the matched letters", async () => {
    const user = await openHeld(commands());
    await user.keyboard("sa");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["SaveCtrl+S"]);
    const marks = [...screen.getByRole("option").querySelectorAll("mark")].map((mark) => mark.textContent);
    expect(marks).toEqual(["Sa"]);
    expect(activeName()).toBe("Save");
  });

  it("moves with the arrows (wrapping), Page Up and Down, Home and End, skipping disabled commands", async () => {
    const user = await openHeld(commands());
    await user.keyboard("{ArrowDown}");
    expect(activeName()).toBe("Fit view");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    // Export is disabled: skipped.
    expect(activeName()).toBe("Add a node");
    await user.keyboard("{ArrowDown}");
    expect(activeName()).toBe("Zoom in");
    await user.keyboard("{ArrowUp}");
    expect(activeName()).toBe("Add a node");
    await user.keyboard("{Home}");
    expect(activeName()).toBe("Zoom in");
    await user.keyboard("{End}");
    expect(activeName()).toBe("Add a node");
    await user.keyboard("{PageUp}");
    expect(activeName()).toBe("Zoom in");
    await user.keyboard("{PageDown}");
    expect(activeName()).toBe("Add a node");
    expect(screen.getByRole("option", { name: /^Add a node/ })).toHaveAttribute("aria-selected", "true");
  });

  it("runs the active command on Enter, asking to close first", async () => {
    const order: string[] = [];
    const user = userEvent.setup();
    render(
      <CommandPalette open onClose={() => order.push("close")} commands={commands(vi.fn(() => order.push("run")))} />,
    );
    await user.keyboard("{ArrowDown}{Enter}");
    expect(order).toEqual(["close", "run"]);
  });

  it("gives the focus back to what had it when a command closes it", async () => {
    const run = vi.fn();
    const user = await openHeld(commands(run));
    await user.keyboard("{Enter}");
    expect(run).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });

  it("runs a command on a press, and a disabled one does nothing", async () => {
    const run = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette open onClose={onClose} commands={commands(run)} />);
    await user.click(screen.getByRole("option", { name: /^Export/ }));
    expect(run).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("option", { name: /^Save/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
  });

  it("makes a pointed-at command active, the focus staying in the field", () => {
    render(<CommandPalette open onClose={() => {}} commands={commands()} />);
    fireEvent.pointerMove(screen.getByRole("option", { name: /^Save/ }));
    expect(activeName()).toBe("Save");
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("closes on Escape without passing it on, and on Tab, giving the focus back", async () => {
    const outer = vi.fn();
    window.addEventListener("keydown", outer);
    const user = await openHeld(commands());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(outer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.keyboard("{Tab}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    window.removeEventListener("keydown", outer);
  });

  it("closes on a press outside, not on one inside", () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={commands()} />);
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(onClose).not.toHaveBeenCalled();
    const layer = document.querySelector(".pb-palette-layer");
    if (layer === null) throw new Error("no layer");
    fireEvent.mouseDown(layer);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the focus leaves for somewhere else", () => {
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Elsewhere</button>
        <CommandPalette open onClose={onClose} commands={commands()} />
      </>,
    );
    act(() => {
      screen.getByRole("button", { name: "Elsewhere" }).focus();
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("says when there are no commands, and when none match, in a status there from the start", async () => {
    const { unmount } = render(<CommandPalette open onClose={() => {}} commands={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No commands");
    expect(screen.getByRole("listbox", { hidden: true })).not.toBeVisible();
    unmount();
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onClose={() => {}}
        commands={commands()}
        labels={{ noMatch: (query) => `Nothing for ${query}` }}
      />,
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.keyboard("qqq");
    expect(screen.getByRole("status")).toHaveTextContent("Nothing for qqq");
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{Enter}");
  });

  it("keeps the active command by id while the list changes", async () => {
    const user = userEvent.setup();
    const list = commands();
    const { rerender } = render(<CommandPalette open onClose={() => {}} commands={list} />);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(activeName()).toBe("Save");
    rerender(<CommandPalette open onClose={() => {}} commands={[...list].reverse()} />);
    expect(activeName()).toBe("Save");
  });

  it("takes its words through labels, English for the rest", () => {
    const { unmount } = render(
      <CommandPalette
        open
        onClose={() => {}}
        commands={[]}
        labels={{ palette: "Actions", placeholder: "Find", empty: "Empty" }}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Find");
    expect(screen.getByRole("status")).toHaveTextContent("Empty");
    unmount();
    render(
      <CommandPalette
        open
        onClose={() => {}}
        commands={[{ id: "close", label: "Close", group: "View", keys: "Escape", run: () => {} }]}
        platform="other"
        labels={{ keyNames: { Escape: "Échap" } }}
      />,
    );
    expect(screen.getByRole("dialog", { name: defaultCommandPaletteLabels.palette })).toBeInTheDocument();
    expect(screen.getByRole("option")).toHaveTextContent("Échap");
  });

  it("is centred over a scrim by default, and anchored at a point inside the window with `at`", () => {
    const { unmount } = render(<CommandPalette open onClose={() => {}} commands={commands()} className="mine" />);
    expect(document.querySelector(".pb-palette-layer")).not.toHaveAttribute("data-anchored");
    expect(screen.getByRole("dialog")).toHaveClass("pb-palette", "mine");
    unmount();
    render(<CommandPalette open onClose={() => {}} commands={commands()} at={{ x: 5000, y: 20 }} />);
    expect(document.querySelector(".pb-palette-layer")).toHaveAttribute("data-anchored");
    const box = screen.getByRole("dialog");
    expect(box.style.left).toBe(`${window.innerWidth - 320 - 8}px`);
    expect(box.style.top).toBe("20px");
    expect(box.style.width).toBe("320px");
  });

  it("follows the window's size while anchored", () => {
    render(<CommandPalette open onClose={() => {}} commands={commands()} at={{ x: 900, y: 900 }} />);
    const before = window.innerWidth;
    act(() => {
      window.innerWidth = 600;
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByRole("dialog").style.left).toBe(`${600 - 320 - 8}px`);
    act(() => {
      window.innerWidth = before;
      window.dispatchEvent(new Event("resize"));
    });
  });

  it("keeps touch sizes, stops under reduced motion and keeps the active command under forced colours", () => {
    expect(css).toMatch(/@media \(hover: none\) and \(pointer: coarse\)[^@]*font-size: 16px/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^@]*animation: none/);
    expect(css).toMatch(/@media \(forced-colors: active\)[^@]*Highlight/);
  });

  it("writes the active row out whole, and every row on touch, where a tap runs a row before it is active", () => {
    // The rows are measured in Chromium by the LongRows story; here, that the rules are there.
    expect(css).toMatch(
      /\[aria-selected="true"\] :is\(\.pb-palette-label, \.pb-palette-hint\) \{[^}]*white-space: normal/,
    );
    expect(css).toMatch(
      /@media \(hover: none\) and \(pointer: coarse\)[^@]*\.pb-palette-hint \{[^}]*white-space: normal/,
    );
  });
});

describe("placePalette", () => {
  const room = { width: 1000, height: 800 };

  it("puts the corner at the point when it fits", () => {
    expect(placePalette({ x: 100, y: 50 }, room)).toEqual({ left: 100, top: 50, width: 320, height: 360 });
  });

  it("moves it back inside the window less the gutter at each edge", () => {
    expect(placePalette({ x: 990, y: 790 }, room)).toEqual({ left: 672, top: 432, width: 320, height: 360 });
    expect(placePalette({ x: -40, y: 2 }, room)).toEqual({ left: 8, top: 8, width: 320, height: 360 });
  });

  it("shrinks it in a window smaller than the palette", () => {
    expect(placePalette({ x: 200, y: 200 }, { width: 300, height: 200 })).toEqual({
      left: 8,
      top: 8,
      width: 284,
      height: 184,
    });
  });
});
