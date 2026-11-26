import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "./Banner";
import css from "./Banner.css?raw";

describe("Banner", () => {
  it("is a status with its words and tone", () => {
    render(
      <Banner tone="warn" className="mine">
        Changed on disk.
      </Banner>,
    );
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Changed on disk.");
    expect(banner).toHaveClass("pb-banner", "mine");
    expect(banner).toHaveAttribute("data-tone", "warn");
  });

  it("is an alert for an error", () => {
    render(<Banner tone="err">Lost.</Banner>);
    expect(screen.getByRole("alert")).toHaveTextContent("Lost.");
  });

  it("draws a tone it does not know neutrally, as a status", () => {
    render(<Banner tone="sleeping">Idle.</Banner>);
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "sleeping");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["err", "off", "ok", "quiet", "warn"]);
  });

  it("puts its actions at the end", () => {
    render(
      <Banner tone="warn" actions={<button type="button">Reload</button>}>
        Changed.
      </Banner>,
    );
    const actions = screen.getByRole("button", { name: "Reload" }).parentElement;
    expect(actions).toHaveClass("pb-banner-actions");
    expect(actions?.previousElementSibling).toHaveClass("pb-banner-text");
  });

  it("has no close button unless the app lets it go", () => {
    render(<Banner tone="ok">Saved.</Banner>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("asks the app to take it away by its close button, named as given", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <Banner tone="ok" onDismiss={onDismiss}>
        Saved.
      </Banner>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
    rerender(
      <Banner tone="ok" onDismiss={onDismiss} labels={{ dismiss: "Hide" }}>
        Saved.
      </Banner>,
    );
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("passes native props and the ref, but keeps its own role", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Banner ref={ref} tone="warn" id="news" aria-label="News">
        Changed.
      </Banner>,
    );
    const banner = screen.getByRole("status", { name: "News" });
    expect(ref.current).toBe(banner);
    expect(banner).toHaveAttribute("id", "news");
  });

  it("closes by an IconButton, which keeps a touch target of its own", () => {
    render(
      <Banner tone="ok" onDismiss={() => {}}>
        Saved.
      </Banner>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveClass("pb-icon-button");
  });

  it("has nothing to stop under reduced motion: no animation or transition", () => {
    expect(css).not.toMatch(/animation|transition/);
  });
});
