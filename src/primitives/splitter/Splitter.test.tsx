import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Splitter, type SplitterProps } from "./Splitter";
import css from "./Splitter.css?raw";
import { clamp, dragged, dragSign, growKey, keyed } from "./splitter-math";

const bounds = { min: 280, max: 560 };

describe("the maths", () => {
  it("clamps to whole px within the bounds, a max below the min read as the min", () => {
    expect(clamp(100, bounds)).toBe(280);
    expect(clamp(320.4, bounds)).toBe(320);
    expect(clamp(9000, bounds)).toBe(560);
    expect(clamp(50, { min: 120, max: 100 })).toBe(120);
  });

  it("drags: on the start edge moving left grows, on the end edge moving right grows", () => {
    expect(dragged(320, -40, -1, bounds)).toBe(360);
    expect(dragged(320, 40, -1, bounds)).toBe(280);
    expect(dragged(320, 40, 1, bounds)).toBe(360);
    expect(dragged(320, -1000, -1, bounds)).toBe(560);
  });

  it("picks the arrow that grows from the orientation, the edge and the text's direction", () => {
    expect(growKey("vertical", "start", "ltr")).toBe("ArrowLeft");
    expect(growKey("vertical", "end", "ltr")).toBe("ArrowRight");
    expect(growKey("horizontal", "start", "ltr")).toBe("ArrowUp");
    expect(growKey("horizontal", "end", "ltr")).toBe("ArrowDown");
    // Right to left, a vertical splitter's start is the pane's right edge; up and down do not mirror.
    expect(growKey("vertical", "start", "rtl")).toBe("ArrowRight");
    expect(growKey("vertical", "end", "rtl")).toBe("ArrowLeft");
    expect(growKey("horizontal", "start", "rtl")).toBe("ArrowUp");
    expect(growKey("horizontal", "end", "rtl")).toBe("ArrowDown");
  });

  it("signs a drag so moving outward from the edge grows, mirrored for a vertical one right to left", () => {
    expect(dragSign("vertical", "start", "ltr")).toBe(-1);
    expect(dragSign("vertical", "end", "ltr")).toBe(1);
    expect(dragSign("vertical", "start", "rtl")).toBe(1);
    expect(dragSign("vertical", "end", "rtl")).toBe(-1);
    expect(dragSign("horizontal", "start", "rtl")).toBe(-1);
    expect(dragSign("horizontal", "end", "rtl")).toBe(1);
  });

  it("moves by keys: the grow arrow, its opposite, Home and End; any other key is not its own", () => {
    expect(keyed(320, "ArrowLeft", "ArrowLeft", 16, bounds)).toBe(336);
    expect(keyed(320, "ArrowRight", "ArrowLeft", 16, bounds)).toBe(304);
    expect(keyed(550, "ArrowLeft", "ArrowLeft", 16, bounds)).toBe(560);
    expect(keyed(320, "Home", "ArrowLeft", 16, bounds)).toBe(280);
    expect(keyed(320, "End", "ArrowLeft", 16, bounds)).toBe(560);
    expect(keyed(320, "a", "ArrowLeft", 16, bounds)).toBeUndefined();
    expect(keyed(320, "ArrowUp", "ArrowLeft", 16, bounds)).toBeUndefined();
    expect(keyed(280, "ArrowDown", "ArrowUp", 10, { min: 120, max: 700 })).toBe(270);
  });
});

/** A splitter whose size the test holds, as an app does. */
function Held(props: Partial<SplitterProps> & { initial?: number; onSize?: (px: number) => void }) {
  const { initial = 320, onSize, ...rest } = props;
  const [size, setSize] = useState(initial);
  return (
    <Splitter
      orientation="vertical"
      label="Resize the pane"
      min={280}
      max={560}
      {...rest}
      value={size}
      onChange={(px) => {
        onSize?.(px);
        setSize(px);
      }}
    />
  );
}

describe("Splitter", () => {
  it("is a focusable separator that says its orientation, value and bounds", () => {
    render(<Held />);
    const splitter = screen.getByRole("separator", { name: "Resize the pane" });
    expect(splitter).toHaveAttribute("tabindex", "0");
    expect(splitter).toHaveAttribute("aria-orientation", "vertical");
    expect(splitter).toHaveAttribute("aria-valuenow", "320");
    expect(splitter).toHaveAttribute("aria-valuemin", "280");
    expect(splitter).toHaveAttribute("aria-valuemax", "560");
    expect(splitter).toHaveAttribute("data-edge", "start");
  });

  it("moves by the arrow keys, Home and End while focused", async () => {
    const onSize = vi.fn();
    render(<Held onSize={onSize} />);
    const splitter = screen.getByRole("separator");
    splitter.focus();
    const user = userEvent.setup();
    await user.keyboard("{ArrowLeft}");
    expect(splitter).toHaveAttribute("aria-valuenow", "336");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(splitter).toHaveAttribute("aria-valuenow", "304");
    await user.keyboard("{End}");
    expect(splitter).toHaveAttribute("aria-valuenow", "560");
    await user.keyboard("{Home}");
    expect(splitter).toHaveAttribute("aria-valuenow", "280");
    expect(onSize.mock.calls.map((call) => call[0] as number)).toEqual([336, 320, 304, 560, 280]);
  });

  it("leaves keys it does not own, and does not call onChange when the size would not move", () => {
    const onChange = vi.fn();
    render(<Splitter orientation="vertical" label="R" value={280} min={280} max={560} onChange={onChange} />);
    const splitter = screen.getByRole("separator");
    expect(fireEvent.keyDown(splitter, { key: "ArrowUp" })).toBe(true);
    expect(fireEvent.keyDown(splitter, { key: "a" })).toBe(true);
    expect(fireEvent.keyDown(splitter, { key: "ArrowLeft", ctrlKey: true })).toBe(true);
    // At the min, shrinking and Home are taken (the key is the splitter's) but change nothing.
    expect(fireEvent.keyDown(splitter, { key: "ArrowRight" })).toBe(false);
    expect(fireEvent.keyDown(splitter, { key: "Home" })).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses the up and down arrows when horizontal, and its step", async () => {
    render(<Held orientation="horizontal" edge="end" initial={300} step={10} />);
    const splitter = screen.getByRole("separator");
    splitter.focus();
    const user = userEvent.setup();
    await user.keyboard("{ArrowDown}");
    expect(splitter).toHaveAttribute("aria-valuenow", "310");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(splitter).toHaveAttribute("aria-valuenow", "290");
    await user.keyboard("{ArrowLeft}");
    expect(splitter).toHaveAttribute("aria-valuenow", "290");
  });

  it("follows a pointer drag from where it started, clamped, and only with the main button", () => {
    const onSize = vi.fn();
    render(<Held onSize={onSize} />);
    const splitter = screen.getByRole("separator");
    fireEvent.pointerDown(splitter, { button: 0, pointerId: 1, clientX: 500 });
    expect(splitter).toHaveFocus();
    expect(splitter).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(splitter, { pointerId: 1, clientX: 460 });
    expect(splitter).toHaveAttribute("aria-valuenow", "360");
    fireEvent.pointerMove(splitter, { pointerId: 1, clientX: 0 });
    expect(splitter).toHaveAttribute("aria-valuenow", "560");
    fireEvent.pointerMove(splitter, { pointerId: 1, clientX: 520 });
    expect(splitter).toHaveAttribute("aria-valuenow", "300");
    fireEvent.pointerUp(splitter, { pointerId: 1, clientX: 520 });
    expect(splitter).not.toHaveAttribute("data-dragging");
    onSize.mockClear();
    fireEvent.pointerMove(splitter, { pointerId: 1, clientX: 100 });
    expect(onSize).not.toHaveBeenCalled();

    fireEvent.pointerDown(splitter, { button: 2, pointerId: 2, clientX: 500 });
    fireEvent.pointerMove(splitter, { pointerId: 2, clientX: 400 });
    expect(onSize).not.toHaveBeenCalled();
  });

  it("grows the other way on its end edge, and by clientY when horizontal; a cancel ends the drag", () => {
    render(<Held orientation="horizontal" edge="end" initial={300} />);
    const splitter = screen.getByRole("separator");
    fireEvent.pointerDown(splitter, { button: 0, pointerId: 1, clientX: 0, clientY: 300 });
    fireEvent.pointerMove(splitter, { pointerId: 1, clientX: 999, clientY: 340 });
    expect(splitter).toHaveAttribute("aria-valuenow", "340");
    fireEvent.pointerCancel(splitter, { pointerId: 1 });
    fireEvent.pointerMove(splitter, { pointerId: 1, clientY: 400 });
    expect(splitter).toHaveAttribute("aria-valuenow", "340");
  });

  it("mirrors its keys and drag in right-to-left text, read from the element at the time", async () => {
    const onSize = vi.fn();
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Held onSize={onSize} />
      </div>,
    );
    const splitter = screen.getByRole("separator");
    splitter.focus();
    const user = userEvent.setup();
    await user.keyboard("{ArrowRight}");
    expect(splitter).toHaveAttribute("aria-valuenow", "336");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(splitter).toHaveAttribute("aria-valuenow", "304");
    // Its start edge is the pane's right: dragging right, outward, grows the pane.
    fireEvent.pointerDown(splitter, { button: 0, pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(splitter, { pointerId: 1, clientX: 140 });
    expect(splitter).toHaveAttribute("aria-valuenow", "344");
    fireEvent.pointerUp(splitter, { pointerId: 1, clientX: 140 });
    // The direction is read when a key is pressed, so a page that turns left to right is followed at once.
    (splitter.parentElement as HTMLElement).style.direction = "ltr";
    await user.keyboard("{ArrowLeft}");
    expect(splitter).toHaveAttribute("aria-valuenow", "360");
    expect(onSize.mock.calls.map((call) => call[0] as number)).toEqual([336, 320, 304, 344, 360]);
  });

  it("places itself by logical properties, so the start edge follows the text's direction", () => {
    expect(css).toMatch(/\[data-edge="start"\] \{\s*inset-inline-start: -3px;/);
    expect(css).toMatch(/\[data-edge="end"\] \{\s*inset-inline-end: -3px;/);
    expect(css).not.toMatch(/\b(left|right):/);
  });

  it("passes the app's own handlers, classes and props through", () => {
    const onKeyDown = vi.fn();
    const onPointerDown = vi.fn();
    render(
      <Splitter
        orientation="vertical"
        label="R"
        value={300}
        min={280}
        max={560}
        onChange={vi.fn()}
        className="mine"
        id="split"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
      />,
    );
    const splitter = screen.getByRole("separator");
    fireEvent.keyDown(splitter, { key: "Home" });
    fireEvent.pointerDown(splitter, { button: 0, pointerId: 1 });
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(splitter).toHaveClass("pb-splitter", "mine");
    expect(splitter).toHaveAttribute("id", "split");
  });

  it("takes no drag-and-scroll gesture from touch, and widens its hit area to 36 px on touch", () => {
    expect(css).toMatch(/\.pb-splitter \{[^}]*touch-action: none;/);
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    // 6 px bar, 15 px either side.
    expect(css).toMatch(/width: 6px/);
    expect(touch.match(/inset-(?:inline|block): -15px/g)).toHaveLength(2);
  });
});
