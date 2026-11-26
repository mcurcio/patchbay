import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { type ToasterToast, Toaster } from "./Toaster";
import css from "./Toaster.css?raw";

const two: ToasterToast[] = [
  { id: 1, tone: "warn", text: "Slow to answer." },
  { id: 2, tone: "err", text: "The edit was refused." },
];

/** A toaster over app state, as an app holds it. */
function Held({ initial, onHold }: { initial: ToasterToast[]; onHold?: (held: boolean) => void }) {
  const [toasts, setToasts] = useState(initial);
  return (
    <>
      <button type="button">Before</button>
      <Toaster
        toasts={toasts}
        onHold={onHold}
        onDismiss={(id) => {
          setToasts((all) => all.filter((toast) => toast.id !== id));
        }}
      />
    </>
  );
}

describe("Toaster", () => {
  it("is a named region of toasts, oldest first, each its own status or alert by tone", () => {
    render(<Toaster toasts={two} onDismiss={() => {}} className="mine" />);
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region).toHaveClass("pb-toaster", "mine");
    expect(region).toHaveAttribute("data-placement", "bottom-end");
    expect(region).not.toHaveAttribute("aria-live");
    expect(screen.getByRole("status")).toHaveTextContent("Slow to answer.");
    expect(screen.getByRole("alert")).toHaveTextContent("The edit was refused.");
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.getAttribute("data-tone"))).toEqual(["warn", "err"]);
  });

  it("draws nothing with no toasts", () => {
    const { container } = render(<Toaster toasts={[]} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws a tone it does not know neutrally, as a status", () => {
    render(<Toaster toasts={[{ id: 1, tone: "sleeping", text: "Idle." }]} onDismiss={() => {}} />);
    expect(screen.getByRole("status").closest("li")).toHaveAttribute("data-tone", "sleeping");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["err", "off", "ok", "quiet", "warn"]);
  });

  it("puts the newest nearest the edge: last at the bottom, first at the top", () => {
    const { rerender } = render(<Toaster toasts={two} more={3} onDismiss={() => {}} />);
    const texts = () => screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(texts()[0]).toContain("Slow");
    expect(screen.getByText("and 3 more").nextElementSibling).toHaveClass("pb-toaster-list");
    rerender(<Toaster toasts={two} more={3} placement="top-start" onDismiss={() => {}} />);
    expect(texts()[0]).toContain("refused");
    expect(screen.getByText("and 3 more").previousElementSibling).toHaveClass("pb-toaster-list");
  });

  it("draws a placement it does not know inline", () => {
    const { rerender } = render(<Toaster toasts={two} placement="middle" onDismiss={() => {}} />);
    expect(screen.getByRole("region")).toHaveAttribute("data-placement", "inline");
    rerender(<Toaster toasts={two} placement="inline" onDismiss={() => {}} />);
    expect(screen.getByRole("region")).toHaveAttribute("data-placement", "inline");
  });

  it("shows a count, and reads it in words", () => {
    render(<Toaster toasts={[{ id: 1, tone: "ok", text: "Saved.", count: 3 }]} onDismiss={() => {}} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Saved. ×3, 3 times");
    expect(screen.getByText("×3", { exact: false })).toHaveAttribute("aria-hidden", "true");
  });

  it("dismisses by its button, which the toast's words describe", async () => {
    const onDismiss = vi.fn();
    render(<Toaster toasts={two} onDismiss={onDismiss} />);
    const buttons = screen.getAllByRole("button", { name: "Dismiss" });
    expect(buttons[1]).toHaveAccessibleDescription("The edit was refused.");
    await userEvent.click(buttons[1] as HTMLElement);
    expect(onDismiss).toHaveBeenCalledWith(2);
  });

  it("runs an action, then dismisses the toast", async () => {
    const run = vi.fn();
    const onDismiss = vi.fn();
    render(
      <Toaster
        toasts={[{ id: 7, tone: "err", text: "Lost.", action: { label: "Retry", run } }]}
        onDismiss={onDismiss}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(run).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith(7);
  });

  it("takes its words as props", () => {
    render(
      <Toaster
        toasts={[{ id: 1, tone: "ok", text: "Gespeichert.", count: 2 }]}
        more={1}
        onDismiss={() => {}}
        label="Meldungen"
        dismissLabel="Schließen"
        moreLabel={(more) => `und ${more} weitere`}
        countLabel={(count) => `${count} Mal`}
      />,
    );
    expect(screen.getByRole("region", { name: "Meldungen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
    expect(screen.getByText("und 1 weitere")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 Mal");
  });

  it("dismisses the focused toast on Escape, alone, and moves the focus to the one beside it, then back", async () => {
    const outer = vi.fn();
    render(
      <div onKeyDown={outer}>
        <Held initial={two} />
      </div>,
    );
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();
    await userEvent.tab();
    expect(screen.getAllByRole("button", { name: "Dismiss" })[0]).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(outer.mock.calls.some(([event]) => (event as KeyboardEvent).key === "Escape")).toBe(false);
    expect(screen.queryByText("Slow to answer.")).toBeNull();
    expect(screen.getByRole("alert").closest("li")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    expect(before).toHaveFocus();
  });

  it("holds while hovered or focused, and lets go when left, blurred, emptied or unmounted", async () => {
    const onHold = vi.fn();
    const { unmount } = render(<Held initial={two} onHold={onHold} />);
    expect(onHold).toHaveBeenLastCalledWith(false);
    const region = screen.getByRole("region");
    fireEvent.pointerEnter(region, { pointerType: "mouse" });
    expect(onHold).toHaveBeenLastCalledWith(true);
    fireEvent.pointerLeave(region, { pointerType: "mouse" });
    expect(onHold).toHaveBeenLastCalledWith(false);
    fireEvent.pointerEnter(region, { pointerType: "touch" });
    expect(onHold).toHaveBeenLastCalledWith(false);

    act(() => {
      screen.getAllByRole("button", { name: "Dismiss" })[0]?.focus();
    });
    expect(onHold).toHaveBeenLastCalledWith(true);
    act(() => {
      screen.getByRole("button", { name: "Before" }).focus();
    });
    expect(onHold).toHaveBeenLastCalledWith(false);

    // Emptied under the pointer: no leave comes, so the hold is let go.
    fireEvent.pointerEnter(screen.getByRole("region"), { pointerType: "mouse" });
    expect(onHold).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onHold).toHaveBeenLastCalledWith(false);
    onHold.mockClear();
    unmount();
    expect(onHold).toHaveBeenCalledWith(false);
  });

  it("passes native props and the ref, and calls the app's own handlers", () => {
    const ref = createRef<HTMLElement>();
    const onPointerEnter = vi.fn();
    render(
      <Toaster
        ref={ref}
        toasts={two}
        onDismiss={() => {}}
        id="news"
        aria-label="News"
        onPointerEnter={onPointerEnter}
      />,
    );
    const region = screen.getByRole("region", { name: "News" });
    expect(ref.current).toBe(region);
    expect(region).toHaveAttribute("id", "news");
    fireEvent.pointerEnter(region);
    expect(onPointerEnter).toHaveBeenCalledOnce();
  });

  it("acts by Buttons, which keep a touch target of their own, and stops its rise under reduced motion", () => {
    render(<Toaster toasts={two} onDismiss={() => {}} />);
    for (const button of screen.getAllByRole("button")) expect(button).toHaveClass("pb-button");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.pb-toast\s*{\s*animation: none;/);
    expect(css).toMatch(/forced-colors: active/);
  });
});
