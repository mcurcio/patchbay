import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";
import css from "./Sheet.css?raw";

describe("Sheet", () => {
  it("draws nothing while closed", () => {
    render(
      <Sheet open={false} onClose={() => undefined} title="Inspector">
        body
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a dialog that is not modal, named by its title, in place", () => {
    const { container } = render(
      <Sheet open onClose={() => undefined} title="gain_1">
        <p>Settings</p>
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "gain_1" });
    expect(sheet).not.toHaveAttribute("aria-modal", "true");
    expect(container.contains(sheet)).toBe(true);
    expect(sheet).toHaveTextContent("Settings");
  });

  it("is named by its label without a title", () => {
    render(
      <Sheet open onClose={() => undefined} label="Inspector">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Inspector" })).toBeInTheDocument();
  });

  it("is drawn from the right by default, or from the bottom", () => {
    const { rerender } = render(
      <Sheet open onClose={() => undefined} label="S">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right");
    rerender(
      <Sheet open onClose={() => undefined} label="S" side="bottom">
        x
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "bottom");
  });

  it("does not take the focus on opening", () => {
    render(
      <>
        <button type="button">Canvas</button>
        <Sheet open onClose={() => undefined} label="S">
          <input aria-label="Name" />
        </Sheet>
      </>,
    );
    expect(document.body).toHaveFocus();
  });

  it("asks to close on Escape inside it and on its close button, not on Escape outside", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Canvas</button>
        <Sheet open onClose={onClose} label="S">
          <input aria-label="Name" />
        </Sheet>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Canvas" }));
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("textbox", { name: "Name" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("gives the focus back to where it came from when it closes holding it", async () => {
    const user = userEvent.setup();
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button">Canvas</button>
          <Sheet
            open={open}
            onClose={() => {
              setOpen(false);
            }}
            label="S"
          >
            <input aria-label="Name" />
          </Sheet>
        </>
      );
    }
    render(<Page />);
    const canvas = screen.getByRole("button", { name: "Canvas" });
    await user.click(canvas);
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(canvas).toHaveFocus();
  });

  it("leaves the focus alone when it closes without holding it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <input aria-label="Elsewhere" />
        <Sheet open onClose={() => undefined} label="S">
          x
        </Sheet>
      </>,
    );
    const elsewhere = screen.getByRole("textbox", { name: "Elsewhere" });
    await user.click(elsewhere);
    rerender(
      <>
        <input aria-label="Elsewhere" />
        <Sheet open={false} onClose={() => undefined} label="S">
          x
        </Sheet>
      </>,
    );
    expect(elsewhere).toHaveFocus();
  });

  it("takes a width, the app's word for Close and its own class", () => {
    render(
      <Sheet open onClose={() => undefined} label="S" width={420} closeLabel="Fermer" className="mine">
        x
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog");
    expect(sheet.style.getPropertyValue("--pb-sheet-width")).toBe("420px");
    expect(sheet).toHaveClass("pb-sheet", "mine");
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });

  it("holds the inspector's sizes: 280–560 px on the right, 62 % from the bottom", () => {
    expect(css).toMatch(/width: min\(clamp\(280px, var\(--pb-sheet-width, 360px\), 560px\), calc\(100% - 48px\)\)/);
    expect(css).toMatch(/\.pb-sheet\[data-side="bottom"\] \{[^}]*max-height: 62%/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/);
  });

  it("closes from an IconButton, which keeps the 36 px touch target", () => {
    render(
      <Sheet open onClose={() => undefined} label="S">
        x
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveClass("pb-icon-button", "pb-sheet-close");
  });
});
