import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";
import css from "./Select.css?raw";

function Options() {
  return (
    <>
      <option value="15">15 s</option>
      <option value="30">30 s</option>
    </>
  );
}

describe("Select", () => {
  it("is a combobox of its options with the library's class", () => {
    render(
      <Select aria-label="Interval">
        <Options />
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Interval" });
    expect(select).toHaveClass("pb-select");
    expect(select).toHaveAttribute("data-font", "ui");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("passes native props, the ref and its own class", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} aria-label="Interval" className="mine" font="code" defaultValue="30">
        <Options />
      </Select>,
    );
    const select = screen.getByRole("combobox");
    expect(ref.current).toBe(select);
    expect(select).toHaveClass("pb-select", "mine");
    expect(select).toHaveAttribute("data-font", "code");
    expect(select).toHaveValue("30");
  });

  it("reports a choice", async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Interval" onChange={onChange}>
        <Options />
      </Select>,
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "30");
    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole("combobox")).toHaveValue("30");
  });

  it("is 16 px on a touch screen", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/font-size:\s*16px/);
    expect(touch?.[1]).toMatch(/min-height:\s*36px/);
  });
});
