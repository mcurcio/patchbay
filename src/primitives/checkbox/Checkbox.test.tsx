import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";
import css from "./Checkbox.css?raw";

describe("Checkbox", () => {
  it("is a bare checkbox without a label", () => {
    const { container } = render(<Checkbox aria-label="Notify me" className="mine" />);
    const box = screen.getByRole("checkbox", { name: "Notify me" });
    expect(container.firstElementChild).toBe(box);
    expect(box).toHaveClass("pb-checkbox", "mine");
  });

  it("is named by its label, which ticks it too", async () => {
    const onChange = vi.fn();
    const { container } = render(<Checkbox label="Notify me" className="mine" onChange={onChange} />);
    expect(container.firstElementChild).toHaveClass("pb-checkbox-row", "mine");
    const box = screen.getByRole("checkbox", { name: "Notify me" });
    await userEvent.click(screen.getByText("Notify me"));
    expect(onChange).toHaveBeenCalledOnce();
    expect(box).toBeChecked();
  });

  it("ticks by the space key", async () => {
    render(<Checkbox label="Notify me" />);
    const box = screen.getByRole("checkbox");
    box.focus();
    await userEvent.keyboard(" ");
    expect(box).toBeChecked();
  });

  it("passes id and aria props to the input, and the ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} label="Notify me" id="m" aria-invalid="true" aria-describedby="x" />);
    const box = screen.getByRole("checkbox");
    expect(ref.current).toBe(box);
    expect(box).toHaveAttribute("id", "m");
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAttribute("aria-describedby", "x");
  });

  it("calls a callback ref", () => {
    const ref = vi.fn();
    render(<Checkbox ref={ref} aria-label="Notify me" />);
    expect(ref).toHaveBeenCalledWith(screen.getByRole("checkbox"));
  });

  it("is indeterminate by a prop, and clears it", () => {
    const { rerender } = render(<Checkbox label="All" indeterminate />);
    expect(screen.getByRole("checkbox")).toBePartiallyChecked();
    rerender(<Checkbox label="All" />);
    expect(screen.getByRole("checkbox")).not.toBePartiallyChecked();
  });

  it("takes no tick while disabled, and marks its row", async () => {
    const onChange = vi.fn();
    const { container } = render(<Checkbox label="Notify me" disabled onChange={onChange} />);
    await userEvent.click(screen.getByText("Notify me"));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.firstElementChild).toHaveAttribute("data-disabled", "true");
  });

  it("is a 36 px row with 16 px words on a touch screen", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/min-height:\s*36px/);
    expect(touch?.[1]).toMatch(/font-size:\s*16px/);
  });
});
