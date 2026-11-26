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

  it("with a busyLabel shows those words while busy, named by them, and the idle words while not", () => {
    const { rerender } = render(<Button busyLabel="Saving">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(screen.getByText("Save")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByText("Saving", { selector: ".pb-button-busy" })).toHaveAttribute("aria-hidden", "true");

    rerender(
      <Button busy busyLabel="Saving">
        Save
      </Button>,
    );
    expect(button).toHaveAccessibleName("Saving");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Save")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Saving", { selector: ".pb-button-busy" })).not.toHaveAttribute("aria-hidden");
    expect(button.querySelector(".pb-button-busy > .pb-spinner")).not.toBeNull();
    // The spinner sits beside the busy words, not over them.
    expect(button.querySelector(".pb-button-spinner")).toBeNull();
  });

  it("with a busyLabel holds its width: both labels stay in one grid cell, the one not shown only hidden", () => {
    render(
      <Button busy busyLabel="Saving every change">
        Save
      </Button>,
    );
    const stack = screen.getByRole("button").querySelector(".pb-button-stack");
    expect(stack?.children).toHaveLength(2);
    expect(css).toMatch(/\.pb-button-stack \{\s*display: inline-grid;/);
    expect(css).toMatch(/\.pb-button-stack > \.pb-button-content \{\s*grid-area: 1 \/ 1;/);
    expect(css).toMatch(/\.pb-button-stack > \[aria-hidden="true"\] \{\s*visibility: hidden;/);
  });

  it("announces the busy words politely when it turns busy, and empties the announcement when done", () => {
    const { rerender } = render(<Button busyLabel="Saving">Save</Button>);
    const region = document.querySelector(".pb-button-announce");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
    rerender(
      <Button busy busyLabel="Saving">
        Save
      </Button>,
    );
    expect(region).toHaveTextContent("Saving");
    rerender(<Button busyLabel="Saving">Save</Button>);
    expect(region).toBeEmptyDOMElement();
    expect(css).toMatch(/\.pb-button-announce \{[^}]*clip-path: inset\(50%\)/);
  });

  it("keeps the focus and ignores presses while busy with a busyLabel", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button busyLabel="Saving" onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    button.focus();
    rerender(
      <Button busy busyLabel="Saving" onClick={onClick}>
        Save
      </Button>,
    );
    expect(button).toHaveFocus();
    const user = userEvent.setup();
    await user.keyboard("{Enter}");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(
      <Button busyLabel="Saving" onClick={onClick}>
        Save
      </Button>,
    );
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("without a busyLabel, or with an empty one, adds no live region and keeps the spinner over its words", () => {
    render(
      <>
        <Button busy>Save</Button>
        <Button busy busyLabel="">
          Load
        </Button>
      </>,
    );
    expect(document.querySelector(".pb-button-announce")).toBeNull();
    expect(screen.getByRole("button", { name: "Load" }).querySelector(".pb-button-spinner")).not.toBeNull();
  });

  it("named by aria-label, takes the busyLabel as its name while busy instead of showing it", () => {
    const { rerender } = render(
      <Button aria-label="Refresh" busyLabel="Refreshing">
        R
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button.querySelector(".pb-button-stack")).toBeNull();
    rerender(
      <Button aria-label="Refresh" busy busyLabel="Refreshing">
        R
      </Button>,
    );
    expect(button).toHaveAccessibleName("Refreshing");
    expect(document.querySelector(".pb-button-announce")).toHaveTextContent("Refreshing");
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
