import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, type DialogProps } from "./Dialog";
import css from "./Dialog.css?raw";

/** A page with an opener and a dialog the page holds, as an app holds it. */
function Page(props: Partial<DialogProps> & { body?: DialogProps["children"]; onCloseSpy?: () => void }) {
  const [open, setOpen] = useState(false);
  const { body, onCloseSpy, ...rest } = props;
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
      <button type="button">Behind</button>
      <Dialog
        title="Add a node"
        {...rest}
        open={open}
        onClose={() => {
          onCloseSpy?.();
          setOpen(false);
        }}
      >
        {body ?? (
          <>
            <input aria-label="Search" />
            <button type="button">Choose</button>
          </>
        )}
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("draws nothing while closed", () => {
    render(
      <Dialog open={false} onClose={() => undefined} title="T">
        body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal dialog named by its title, on <body>", () => {
    const { container } = render(
      <Dialog open onClose={() => undefined} title="Add a node" actions={<button type="button">Add</button>}>
        <p>Pick a type</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Add a node" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveClass("pb-dialog");
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveTextContent("Pick a type");
    expect(screen.getByRole("button", { name: "Add" }).closest(".pb-dialog-actions")).not.toBeNull();
  });

  it("focuses the content's first control on opening and gives focus back on closing", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("keeps a control the content focused itself", async () => {
    const user = userEvent.setup();
    render(
      <Page
        body={
          <>
            <input aria-label="First" />
            <input aria-label="Second" autoFocus />
          </>
        }
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("textbox", { name: "Second" })).toHaveFocus();
  });

  it("focuses the dialog itself when it holds no control", async () => {
    const user = userEvent.setup();
    render(<Page body={<p>Nothing to press</p>} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps Tab and Shift+Tab inside, the body a stop of its own", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const search = screen.getByRole("textbox", { name: "Search" });
    const choose = screen.getByRole("button", { name: "Choose" });
    const close = screen.getByRole("button", { name: "Close" });
    const body = search.parentElement;
    await user.tab();
    expect(choose).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(body).toHaveFocus();
    await user.tab();
    expect(search).toHaveFocus();
    await user.tab({ shift: true });
    expect(body).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(choose).toHaveFocus();
  });

  it("brings back focus that wanders out", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    screen.getByRole("button", { name: "Behind" }).focus();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("asks to close on Escape, the close button and a press on the scrim, not on a press inside", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="T">
        <input aria-label="Name" />
      </Dialog>,
    );
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("textbox"));
    const scrim = document.querySelector(".pb-dialog-scrim");
    expect(scrim).not.toBeNull();
    if (scrim !== null) await user.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("keeps Escape from the page behind it", async () => {
    const user = userEvent.setup();
    const behind = vi.fn();
    document.addEventListener("keydown", behind);
    render(
      <Dialog open onClose={() => undefined} title="T">
        <input aria-label="Name" />
      </Dialog>,
    );
    await user.keyboard("{Escape}");
    document.removeEventListener("keydown", behind);
    expect(behind).not.toHaveBeenCalled();
  });

  it("closes only the topmost of two dialogs on Escape, and gives focus back to the one below", async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    function Nested() {
      const [inner, setInner] = useState(false);
      return (
        <Dialog open onClose={outer} title="Outer">
          <button
            type="button"
            onClick={() => {
              setInner(true);
            }}
          >
            More
          </button>
          <Dialog
            open={inner}
            onClose={() => {
              setInner(false);
            }}
            title="Inner"
          >
            <button type="button">Inner button</button>
          </Dialog>
        </Dialog>
      );
    }
    render(<Nested />);
    const more = screen.getByRole("button", { name: "More" });
    expect(more).toHaveFocus();
    await user.click(more);
    expect(screen.getByRole("button", { name: "Inner button" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull();
    expect(outer).not.toHaveBeenCalled();
    expect(more).toHaveFocus();
  });

  it("takes the app's word for Close and its own class", () => {
    render(
      <Dialog open onClose={() => undefined} title="T" labels={{ close: "Fermer" }} className="mine">
        x
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("pb-dialog", "mine");
  });

  it("moves on motion tokens and is still under reduced motion", () => {
    expect(css).toMatch(/animation: pb-dialog-rise var\(--pb-motion-slow\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/);
  });

  it("closes from an IconButton, which keeps the 36 px touch target", () => {
    render(
      <Dialog open onClose={() => undefined} title="T">
        x
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveClass("pb-icon-button", "pb-dialog-close");
  });
});
