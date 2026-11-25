import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { RadioGroup } from "./RadioGroup";
import css from "./RadioGroup.css?raw";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma", disabled: true },
];

describe("RadioGroup", () => {
  it("is a radiogroup named by its legend, its radios sharing one name", () => {
    render(<RadioGroup legend="Letter" options={options} value="a" onChange={() => {}} className="mine" />);
    const group = screen.getByRole("radiogroup", { name: "Letter" });
    expect(group.tagName).toBe("FIELDSET");
    expect(group).toHaveClass("pb-radio-group", "mine");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    const names = new Set(radios.map((radio) => radio.getAttribute("name")));
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it("uses the name it is given", () => {
    render(<RadioGroup legend="Letter" name="letter" options={options} value="a" onChange={() => {}} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveAttribute("name", "letter");
  });

  it("is controlled: it shows the value and asks for a pick without taking it", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<RadioGroup legend="Letter" options={options} value="a" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeChecked();
    await userEvent.click(screen.getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeChecked();
    rerender(<RadioGroup legend="Letter" options={options} value="b" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Beta" })).toBeChecked();
  });

  it("picks none for a value no option has", () => {
    render(<RadioGroup legend="Letter" options={options} value={undefined} onChange={() => {}} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked();
  });

  it("moves the pick by the arrow keys", async () => {
    const onChange = vi.fn();
    render(<RadioGroup legend="Letter" options={options} value="a" onChange={onChange} />);
    screen.getByRole("radio", { name: "Alpha" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("takes no pick on a disabled option, and marks its row", async () => {
    const onChange = vi.fn();
    render(<RadioGroup legend="Letter" options={options} value="a" onChange={onChange} />);
    await userEvent.click(screen.getByText("Gamma"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Gamma" })).toBeDisabled();
    expect(screen.getByText("Gamma").closest("label")).toHaveAttribute("data-disabled", "true");
  });

  it("disables every option when the group is disabled", () => {
    render(<RadioGroup legend="Letter" options={options} value="a" onChange={() => {}} disabled />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
  });

  it("wires its hint and error as Field does", () => {
    render(
      <RadioGroup
        legend="Letter"
        options={options}
        value={undefined}
        onChange={() => {}}
        aria-describedby="own"
        hint="Pick a letter."
        error="A letter is needed."
      />,
    );
    const group = screen.getByRole("radiogroup");
    const hint = screen.getByText("Pick a letter.");
    const error = screen.getByText("A letter is needed.");
    expect(group.getAttribute("aria-describedby")).toBe(`own ${hint.id} ${error.id}`);
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAccessibleDescription("Pick a letter. A letter is needed.");
  });

  it("counts an empty error as none", () => {
    render(<RadioGroup legend="Letter" options={options} value="a" onChange={() => {}} error="" />);
    const group = screen.getByRole("radiogroup");
    expect(group).not.toHaveAttribute("aria-invalid");
    expect(group).not.toHaveAttribute("aria-describedby");
  });

  it("hides its legend for the eye only when asked", () => {
    const { rerender } = render(<RadioGroup legend="Letter" options={options} value="a" onChange={() => {}} />);
    expect(screen.getByText("Letter")).not.toHaveAttribute("data-hidden");
    rerender(<RadioGroup legend="Letter" legendHidden options={options} value="a" onChange={() => {}} />);
    expect(screen.getByText("Letter")).toHaveAttribute("data-hidden", "true");
    expect(screen.getByRole("radiogroup", { name: "Letter" })).toBeInTheDocument();
    expect(css).toMatch(/\.pb-radio-group-legend\[data-hidden\]\s*\{[^}]*clip-path: inset\(50%\)/);
  });

  it("sets its layout as an attribute, and styles only the layouts it knows", () => {
    render(<RadioGroup legend="Letter" layout="diagonal" options={options} value="a" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-layout", "diagonal");
    const layouts = new Set([...css.matchAll(/data-layout="([^"]+)"/g)].map((match) => match[1]));
    expect([...layouts]).toEqual(["inline"]);
  });

  it("passes the ref to the fieldset", () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(<RadioGroup ref={ref} legend="Letter" options={options} value="a" onChange={() => {}} />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
  });

  it("has rows at least 36 px tall with 16 px words on a touch screen", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/\.pb-radio-row\s*\{[^}]*min-height:\s*36px/);
    expect(touch?.[1]).toMatch(/font-size:\s*16px/);
    expect(touch?.[1]).toMatch(/\.pb-radio\s*\{[^}]*width:\s*20px/);
  });

  it("has nothing to stop under reduced motion: no animation or transition", () => {
    expect(css).not.toMatch(/animation|transition/);
  });
});
