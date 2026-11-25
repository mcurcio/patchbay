import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../checkbox";
import { Select } from "../select";
import { TextInput } from "../text-input";
import { Field } from "./Field";

describe("Field", () => {
  it("names its control by its label", () => {
    render(
      <Field label="Name">
        <TextInput />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input.id).not.toBe("");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the control's own id", () => {
    render(
      <Field label="Name">
        <TextInput id="mine" />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("id", "mine");
  });

  it("describes the control by its hint and error, and marks it invalid", () => {
    render(
      <Field label="Port" hint="1 to 65535" error="Not a number">
        <TextInput />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Port" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("1 to 65535 Not a number");
  });

  it("keeps the control's own description first", () => {
    render(
      <>
        <span id="extra">Extra</span>
        <Field label="Port" hint="A hint">
          <TextInput aria-describedby="extra" />
        </Field>
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Port" })).toHaveAccessibleDescription("Extra A hint");
  });

  it("treats an empty error as none", () => {
    const { container } = render(
      <Field label="Name" error="">
        <TextInput />
      </Field>,
    );
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    expect(container.querySelector(".pb-field-error")).toBeNull();
    expect(container.firstElementChild).not.toHaveAttribute("data-invalid");
  });

  it("keeps the control's own aria-invalid while there is no error", () => {
    render(
      <Field label="Name">
        <TextInput aria-invalid="true" />
      </Field>,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("wires a Select and a Checkbox", () => {
    render(
      <>
        <Field label="Rate" error="Unsupported">
          <Select>
            <option>48000</option>
          </Select>
        </Field>
        <Field label="Enabled">
          <Checkbox />
        </Field>
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Rate" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("checkbox", { name: "Enabled" })).toBeInTheDocument();
  });

  it("draws its layout from a data attribute and passes native props", () => {
    const { container } = render(
      <Field label="Name" layout="inline" className="mine" data-testid="f">
        <TextInput />
      </Field>,
    );
    const field = container.firstElementChild;
    expect(field).toHaveClass("pb-field", "mine");
    expect(field).toHaveAttribute("data-layout", "inline");
    expect(screen.getByTestId("f")).toBe(field);
  });
});
