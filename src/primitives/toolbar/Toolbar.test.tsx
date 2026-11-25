import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { moved } from "./roving";
import { Toolbar } from "./Toolbar";

function Three(props: { orientation?: "horizontal" | "vertical"; disabledB?: boolean }) {
  return (
    <>
      <button type="button">Before</button>
      <Toolbar label="Tools" orientation={props.orientation}>
        <button type="button">A</button>
        <button type="button" disabled={props.disabledB}>
          B
        </button>
        <button type="button">C</button>
      </Toolbar>
      <button type="button">After</button>
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

describe("moved", () => {
  it("steps with its orientation's arrows, wraps at the ends, and takes Home and End", () => {
    expect(moved(0, 3, "ArrowRight", "horizontal", false)).toBe(1);
    expect(moved(2, 3, "ArrowRight", "horizontal", false)).toBe(0);
    expect(moved(0, 3, "ArrowLeft", "horizontal", false)).toBe(2);
    expect(moved(0, 3, "ArrowDown", "horizontal", false)).toBeUndefined();
    expect(moved(0, 3, "ArrowDown", "vertical", false)).toBe(1);
    expect(moved(0, 3, "ArrowRight", "vertical", false)).toBeUndefined();
    expect(moved(0, 3, "ArrowLeft", "horizontal", true)).toBe(1);
    expect(moved(1, 3, "Home", "horizontal", false)).toBe(0);
    expect(moved(1, 3, "End", "vertical", false)).toBe(2);
    expect(moved(0, 0, "End", "vertical", false)).toBeUndefined();
    expect(moved(0, 3, "a", "horizontal", false)).toBeUndefined();
  });
});

describe("Toolbar", () => {
  it("is a named toolbar that says its orientation", () => {
    render(<Three orientation="vertical" />);
    const toolbar = screen.getByRole("toolbar", { name: "Tools" });
    expect(toolbar).toHaveAttribute("aria-orientation", "vertical");
    expect(toolbar).toHaveClass("pb-toolbar");
  });

  it("is one tab stop: the first item at first", async () => {
    render(<Three />);
    expect(button("A")).toHaveAttribute("tabindex", "0");
    expect(button("B")).toHaveAttribute("tabindex", "-1");
    expect(button("C")).toHaveAttribute("tabindex", "-1");
    const user = userEvent.setup();
    await user.tab();
    await user.tab();
    expect(button("A")).toHaveFocus();
    await user.tab();
    expect(button("After")).toHaveFocus();
  });

  it("moves the focus with the arrows, wrapping, and with Home and End", async () => {
    render(<Three />);
    const user = userEvent.setup();
    button("A").focus();
    await user.keyboard("{ArrowRight}");
    expect(button("B")).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(button("A")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(button("C")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(button("A")).toHaveFocus();
    await user.keyboard("{End}");
    expect(button("C")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(button("C")).toHaveFocus();
  });

  it("uses up and down when vertical", async () => {
    render(<Three orientation="vertical" />);
    const user = userEvent.setup();
    button("A").focus();
    await user.keyboard("{ArrowDown}");
    expect(button("B")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(button("C")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(button("C")).toHaveFocus();
  });

  it("keeps the tab stop on the item last focused, by keys or by pointer", async () => {
    render(<Three />);
    const user = userEvent.setup();
    button("A").focus();
    await user.keyboard("{ArrowRight}");
    expect(button("B")).toHaveAttribute("tabindex", "0");
    expect(button("A")).toHaveAttribute("tabindex", "-1");
    await user.click(button("C"));
    expect(button("C")).toHaveAttribute("tabindex", "0");
    expect(button("B")).toHaveAttribute("tabindex", "-1");
    await user.click(button("After"));
    await user.tab({ shift: true });
    expect(button("C")).toHaveFocus();
  });

  it("skips a disabled item, and gives the tab stop back when the item holding it goes", async () => {
    const { rerender } = render(<Three disabledB />);
    const user = userEvent.setup();
    button("A").focus();
    await user.keyboard("{ArrowRight}");
    expect(button("C")).toHaveFocus();

    rerender(<Three />);
    button("A").focus();
    await user.keyboard("{ArrowRight}");
    expect(button("B")).toHaveFocus();
    await user.click(button("After"));
    rerender(<Three disabledB />);
    // MutationObserver's callback runs as a microtask.
    await Promise.resolve();
    expect(button("A")).toHaveAttribute("tabindex", "0");
  });

  it("settles the tab stop when a child adds an item on its own", async () => {
    function Growing() {
      const [more, setMore] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setMore(true);
            }}
          >
            Grow
          </button>
          {more && <button type="button">Extra</button>}
        </>
      );
    }
    render(
      <Toolbar label="Tools">
        <Growing />
      </Toolbar>,
    );
    await userEvent.setup().click(button("Grow"));
    await Promise.resolve();
    expect(button("Grow")).toHaveAttribute("tabindex", "0");
    expect(button("Extra")).toHaveAttribute("tabindex", "-1");
  });

  it("leaves a text field's arrow keys to the field, and keys with a modifier alone", () => {
    render(
      <Toolbar label="Tools">
        <button type="button">A</button>
        <input aria-label="Find" />
        <button type="button">C</button>
      </Toolbar>,
    );
    const find = screen.getByRole("textbox", { name: "Find" });
    expect(find).toHaveAttribute("tabindex", "-1");
    expect(fireEvent.keyDown(find, { key: "ArrowRight" })).toBe(true);
    expect(fireEvent.keyDown(find, { key: "Home" })).toBe(true);
    expect(fireEvent.keyDown(button("A"), { key: "ArrowRight", altKey: true })).toBe(true);
    expect(fireEvent.keyDown(button("A"), { key: "ArrowRight" })).toBe(false);
    expect(find).toHaveFocus();
  });

  it("leaves the items of a toolbar inside it to that toolbar", async () => {
    render(
      <Toolbar label="Outer">
        <button type="button">A</button>
        <Toolbar label="Inner">
          <button type="button">X</button>
          <button type="button">Y</button>
        </Toolbar>
        <button type="button">C</button>
      </Toolbar>,
    );
    expect(button("X")).toHaveAttribute("tabindex", "0");
    const user = userEvent.setup();
    button("A").focus();
    await user.keyboard("{ArrowRight}");
    expect(button("C")).toHaveFocus();
    button("X").focus();
    await user.keyboard("{ArrowRight}");
    expect(button("Y")).toHaveFocus();
  });

  it("passes a ref, classes, props and the app's own handlers through", () => {
    const ref = createRef<HTMLDivElement>();
    const onKeyDown = vi.fn();
    render(
      <Toolbar label="Tools" ref={ref} className="mine" id="tools" onKeyDown={onKeyDown}>
        <button type="button">A</button>
      </Toolbar>,
    );
    const toolbar = screen.getByRole("toolbar");
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveClass("pb-toolbar", "mine");
    expect(toolbar).toHaveAttribute("id", "tools");
    fireEvent.keyDown(button("A"), { key: "End" });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });
});
