import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { overflows } from "./scroll-focus";
import { Panel } from "./Panel";
import css from "./Panel.css?raw";

describe("Panel", () => {
  it("is a region named by its title, an h2 by default, over its body", () => {
    render(
      <Panel title="Inspector">
        <p>Body</p>
      </Panel>,
    );
    const region = screen.getByRole("region", { name: "Inspector" });
    expect(region).toHaveClass("pb-panel");
    expect(screen.getByRole("heading", { level: 2, name: "Inspector" })).toHaveClass("pb-panel-title");
    expect(screen.getByText("Body").parentElement).toHaveClass("pb-panel-body");
  });

  it("takes its heading level", () => {
    render(<Panel title="Ports" level={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Ports" })).toBeInTheDocument();
  });

  it("draws its actions at the header's far end, with or without a title", () => {
    const { rerender } = render(
      <Panel title="Inspector" actions={<button type="button">Close</button>}>
        x
      </Panel>,
    );
    const close = screen.getByRole("button", { name: "Close" });
    expect(close.parentElement).toHaveClass("pb-panel-actions");
    expect(close.closest(".pb-panel-header")).not.toBeNull();

    rerender(<Panel aria-label="Tools" actions={<button type="button">Close</button>} />);
    expect(screen.getByRole("region", { name: "Tools" })).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(css).toMatch(/\.pb-panel-actions \{[^}]*margin-left: auto;/);
  });

  it("has no header without a title or actions, and an app's own name wins over the title", () => {
    const { container, rerender } = render(<Panel aria-label="Plain">x</Panel>);
    expect(container.querySelector(".pb-panel-header")).toBeNull();
    rerender(
      <Panel title="Inspector" aria-label="Inspector: transform">
        x
      </Panel>,
    );
    expect(screen.getByRole("region", { name: "Inspector: transform" })).not.toHaveAttribute("aria-labelledby");
  });

  it("scrolls its body alone", () => {
    expect(css).toMatch(/\.pb-panel-body \{[^}]*overflow-y: auto;/);
    expect(css).toMatch(/\.pb-panel-header \{[^}]*flex: none;/);
  });

  it("passes a ref, classes and props through", () => {
    const ref = createRef<HTMLElement>();
    render(<Panel ref={ref} title="T" className="mine" id="panel" />);
    const region = screen.getByRole("region");
    expect(ref.current).toBe(region);
    expect(region).toHaveClass("pb-panel", "mine");
    expect(region).toHaveAttribute("id", "panel");
  });

  it("makes its body a tab stop only while it overflows", async () => {
    const { container, rerender } = render(<Panel title="T">short</Panel>);
    const body = container.querySelector<HTMLElement>(".pb-panel-body");
    expect(body).not.toBeNull();
    if (body === null) return;
    expect(body).not.toHaveAttribute("tabindex");
    // jsdom lays nothing out: give the body a content taller than itself.
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: 400 });
    expect(overflows(body)).toBe(true);
    rerender(<Panel title="T">long</Panel>);
    // MutationObserver's callback runs as a microtask.
    await Promise.resolve();
    expect(body).toHaveAttribute("tabindex", "0");
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: 100 });
    rerender(<Panel title="T">short again</Panel>);
    await Promise.resolve();
    expect(body).not.toHaveAttribute("tabindex");
  });
});
