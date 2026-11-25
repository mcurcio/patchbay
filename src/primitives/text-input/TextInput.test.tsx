import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { TextInput } from "./TextInput";
import css from "./TextInput.css?raw";

describe("TextInput", () => {
  it("is a text box with the library's class and the ui face", () => {
    render(<TextInput aria-label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveClass("pb-text-input");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("data-font", "ui");
  });

  it("passes native props, the ref and its own class", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextInput ref={ref} aria-label="Name" className="mine" placeholder="none" type="search" font="code" />);
    const input = screen.getByRole("searchbox", { name: "Name" });
    expect(ref.current).toBe(input);
    expect(input).toHaveClass("pb-text-input", "mine");
    expect(input).toHaveAttribute("placeholder", "none");
    expect(input).toHaveAttribute("data-font", "code");
  });

  it("reports what is typed", async () => {
    const onChange = vi.fn();
    render(<TextInput aria-label="Name" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("takes no typing while disabled", async () => {
    const onChange = vi.fn();
    render(<TextInput aria-label="Name" disabled onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "ab");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is 16 px on a touch screen", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/font-size:\s*16px/);
    expect(touch?.[1]).toMatch(/min-height:\s*36px/);
  });

  it("draws aria-invalid in the error tone", () => {
    expect(css).toMatch(/\.pb-text-input\[aria-invalid="true"\]\s*\{\s*border-color:\s*var\(--pb-err\)/);
  });
});
