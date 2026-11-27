import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "./Banner";
import css from "./Banner.css?raw";

/** The banner's own box, which is not a live region: its words are read through the regions inside it. */
function bannerOf(container: HTMLElement): HTMLElement {
  const banner = container.querySelector<HTMLElement>(".pb-banner");
  if (banner === null) throw new Error("no banner");
  return banner;
}

describe("Banner", () => {
  it("draws its words in its tone and says them in its status region", () => {
    const { container } = render(
      <Banner tone="warn" className="mine">
        Changed on disk.
      </Banner>,
    );
    const banner = bannerOf(container);
    expect(banner).toHaveClass("pb-banner", "mine");
    expect(banner).toHaveAttribute("data-tone", "warn");
    expect(banner).not.toHaveAttribute("role");
    expect(banner.querySelector(".pb-banner-text")).toHaveTextContent("Changed on disk.");
    expect(screen.getByRole("status")).toHaveTextContent("Changed on disk.");
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("says an error in its alert region", () => {
    render(<Banner tone="err">Lost.</Banner>);
    expect(screen.getByRole("alert")).toHaveTextContent("Lost.");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("has its regions in the page, empty, in the commit that mounts it with its words", () => {
    const seen: (string | null)[] = [];
    function Probe() {
      useLayoutEffect(() => {
        seen.push(document.querySelector('[role="status"]')?.textContent ?? null);
      }, []);
      return <>Changed on disk.</>;
    }
    render(
      <Banner tone="warn">
        <Probe />
      </Banner>,
    );
    // The probe in the drawn words saw the region there and empty; the words came in the next commit.
    expect(seen[0]).toBe("");
    expect(screen.getByRole("status")).toHaveTextContent("Changed on disk.");
  });

  it("moves its words to the region its new tone picks", () => {
    const { rerender } = render(<Banner tone="warn">Reconnecting.</Banner>);
    const status = screen.getByRole("status");
    const alert = screen.getByRole("alert");
    rerender(<Banner tone="err">Lost.</Banner>);
    expect(screen.getByRole("status")).toBe(status);
    expect(screen.getByRole("alert")).toBe(alert);
    expect(status).toBeEmptyDOMElement();
    expect(alert).toHaveTextContent("Lost.");
  });

  it("draws a tone it does not know neutrally, said as a status", () => {
    const { container } = render(<Banner tone="sleeping">Idle.</Banner>);
    expect(bannerOf(container)).toHaveAttribute("data-tone", "sleeping");
    expect(screen.getByRole("status")).toHaveTextContent("Idle.");
    const tones = new Set([...css.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual(["accent", "err", "muted", "off", "ok", "quiet", "warn"]);
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

  it("passes native props and the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Banner ref={ref} tone="warn" id="news" data-pane="files">
        Changed.
      </Banner>,
    );
    const banner = bannerOf(container);
    expect(ref.current).toBe(banner);
    expect(banner).toHaveAttribute("id", "news");
    expect(banner).toHaveAttribute("data-pane", "files");
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
