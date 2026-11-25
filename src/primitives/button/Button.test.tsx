import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import css from "./Button.css?raw";

describe("Button", () => {
  it("is a plain button that never submits a form unless asked", () => {
    const submit = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Button>Apply</Button>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Apply" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits when its type says so", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("calls onClick when pressed, by pointer or keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Apply</Button>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("draws its tone and size as data attributes, neutral and md by default", () => {
    const { rerender } = render(<Button>A</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-tone", "neutral");
    expect(button).toHaveAttribute("data-size", "md");
    rerender(
      <Button tone="danger" size="sm">
        A
      </Button>,
    );
    expect(button).toHaveAttribute("data-tone", "danger");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("takes a tone it does not know, and its stylesheet styles only the ones it does", () => {
    render(<Button tone="sparkly">A</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-tone", "sparkly");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["danger", "primary"]);
  });

  it("while busy shows a spinner, says aria-busy, keeps its name and ignores presses", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button busy onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button.querySelector(".pb-spinner")).toHaveAttribute("aria-hidden", "true");
    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();

    rerender(<Button onClick={onClick}>Save</Button>);
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button.querySelector(".pb-spinner")).toBeNull();
    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not submit its form while busy", () => {
    const submit = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Button type="submit" busy>
          Send
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(submit).not.toHaveBeenCalled();
  });

  it("keeps its width while busy: the words stay in the box, only hidden", () => {
    render(<Button busy>Save</Button>);
    expect(screen.getByText("Save")).toHaveClass("pb-button-content");
    expect(css).toMatch(/\[aria-busy="true"\] > \.pb-button-content \{\s*opacity: 0;/);
    expect(css).toMatch(/\.pb-button > \.pb-button-spinner \{\s*position: absolute;/);
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        A
      </Button>,
    );
    await userEvent.setup().click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes native props, a ref and extra classes through", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} className="mine" aria-pressed title="Hint">
        A
      </Button>,
    );
    const button = screen.getByRole("button", { pressed: true });
    expect(ref.current).toBe(button);
    expect(button).toHaveClass("pb-button", "mine");
    expect(button).toHaveAttribute("title", "Hint");
  });

  it("is at least 36 px tall on touch", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/min-height: 36px/);
  });
});
