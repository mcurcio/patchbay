import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type MediaWidth, mediaQueries } from "../../hooks";
import { AppShell, type AppShellDrawer, type AppShellInspector, defaultAppShellLabels } from "./AppShell";
import { clampDrawerHeight, clampInspectorWidth, drawerBounds, drawerMaxHeight, inspectorBounds } from "./bounds";
import css from "./AppShell.css?raw";

/** A window of the given width class, for useMediaBreakpoint. */
function windowOf(width: MediaWidth) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: (query === mediaQueries.narrow && width !== "wide") || (query === mediaQueries.phone && width === "phone"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function inspectorOf(props: Partial<AppShellInspector> = {}): AppShellInspector {
  return {
    content: <p>Settings</p>,
    open: true,
    onOpen: vi.fn(),
    width: 320,
    onWidth: vi.fn(),
    ...props,
  };
}

function drawerOf(props: Partial<AppShellDrawer> = {}): AppShellDrawer {
  return {
    header: <span>Log</span>,
    content: <textarea aria-label="Draft" defaultValue="" />,
    open: true,
    onOpen: vi.fn(),
    height: 200,
    onHeight: vi.fn(),
    ...props,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppShell", () => {
  it("draws the bar's slots left to right, the canvas in main, and its class", () => {
    windowOf("wide");
    const { container } = render(
      <AppShell
        className="mine"
        topBar={{ brand: <b>Mark</b>, status: <i>live</i>, start: <button>Add</button>, end: <button>Theme</button> }}
      >
        <div>Canvas</div>
      </AppShell>,
    );
    const shell = container.firstElementChild;
    expect(shell).toHaveClass("pb-shell", "mine");
    expect(shell).toHaveAttribute("data-layout", "wide");
    expect(shell).toHaveAttribute("data-bar");
    const bar = screen.getByRole("banner");
    expect([...bar.children].map((slot) => [slot.className, slot.textContent])).toEqual([
      ["pb-shell-brand", "Mark"],
      ["pb-shell-status", "live"],
      ["pb-shell-start", "Add"],
      ["pb-shell-end", "Theme"],
    ]);
    expect(screen.getByRole("main")).toHaveTextContent("Canvas");
  });

  it("has no bar, inspector or drawer that the app does not give", () => {
    windowOf("wide");
    const { container } = render(
      <AppShell>
        <div>Canvas</div>
      </AppShell>,
    );
    expect(container.firstElementChild).not.toHaveAttribute("data-bar");
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByRole("separator")).toBeNull();
  });

  describe("on a wide window", () => {
    it("draws the open inspector beside the canvas at its width, with a splitter on its start edge", () => {
      windowOf("wide");
      render(
        <AppShell inspector={inspectorOf()}>
          <div />
        </AppShell>,
      );
      const inspector = screen.getByRole("complementary", { name: "Inspector" });
      expect(inspector).toHaveStyle({ width: "320px" });
      expect(inspector).toHaveTextContent("Settings");
      const splitter = within(inspector).getByRole("separator", { name: "Resize the inspector" });
      expect(splitter).toHaveAttribute("aria-valuenow", "320");
      expect(splitter).toHaveAttribute("aria-valuemin", "280");
      expect(splitter).toHaveAttribute("aria-valuemax", "560");
      expect(splitter).toHaveAttribute("data-edge", "start");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("asks for a new width from the splitter's keys", async () => {
      windowOf("wide");
      const onWidth = vi.fn();
      render(
        <AppShell inspector={inspectorOf({ onWidth })}>
          <div />
        </AppShell>,
      );
      screen.getByRole("separator", { name: "Resize the inspector" }).focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(onWidth).toHaveBeenLastCalledWith(336);
      await userEvent.keyboard("{End}");
      expect(onWidth).toHaveBeenLastCalledWith(560);
    });

    it("draws no inspector while it is closed", () => {
      windowOf("wide");
      render(
        <AppShell inspector={inspectorOf({ open: false })}>
          <div />
        </AppShell>,
      );
      expect(screen.queryByRole("complementary")).toBeNull();
      expect(screen.queryByText("Settings")).toBeNull();
    });

    it("leaves Escape inside the inspector to the app", () => {
      windowOf("wide");
      const onOpen = vi.fn();
      render(
        <AppShell inspector={inspectorOf({ onOpen, content: <input aria-label="Name" /> })}>
          <div />
        </AppShell>,
      );
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), { key: "Escape" });
      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe("on a narrow window", () => {
    it("draws the inspector as a sheet over the canvas's inline end, at its width", () => {
      windowOf("narrow");
      const { container } = render(
        <AppShell inspector={inspectorOf({ width: 400 })}>
          <div />
        </AppShell>,
      );
      expect(container.firstElementChild).toHaveAttribute("data-layout", "narrow");
      expect(screen.queryByRole("complementary")).toBeNull();
      const sheet = screen.getByRole("dialog", { name: "Inspector" });
      expect(sheet).toHaveAttribute("data-side", "end");
      expect(sheet.style.getPropertyValue("--pb-sheet-width")).toBe("400px");
      expect(screen.getByRole("main")).toContainElement(sheet);
      expect(screen.queryByRole("separator")).toBeNull();
    });

    it("asks to close the inspector on Escape inside the sheet and on its close button", async () => {
      windowOf("narrow");
      const onOpen = vi.fn();
      render(
        <AppShell inspector={inspectorOf({ onOpen, content: <input aria-label="Name" /> })}>
          <div />
        </AppShell>,
      );
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), { key: "Escape" });
      expect(onOpen).toHaveBeenLastCalledWith(false);
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onOpen).toHaveBeenCalledTimes(2);
    });

    it("draws no sheet while the inspector is closed", () => {
      windowOf("narrow");
      render(
        <AppShell inspector={inspectorOf({ open: false })}>
          <div />
        </AppShell>,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("raises the inspector from the bottom on a phone", () => {
    windowOf("phone");
    render(
      <AppShell inspector={inspectorOf()}>
        <div />
      </AppShell>,
    );
    expect(screen.getByRole("dialog", { name: "Inspector" })).toHaveAttribute("data-side", "bottom");
  });

  describe("the drawer", () => {
    it("draws its header and body at its height, with a splitter on its top edge", () => {
      windowOf("wide");
      vi.stubGlobal("innerHeight", 800);
      render(
        <AppShell drawer={drawerOf()}>
          <div />
        </AppShell>,
      );
      const drawer = screen.getByRole("region", { name: "Drawer" });
      expect(drawer).toHaveStyle({ height: "200px" });
      expect(drawer).toHaveTextContent("Log");
      const splitter = within(drawer).getByRole("separator", { name: "Resize the drawer" });
      expect(splitter).toHaveAttribute("aria-orientation", "horizontal");
      expect(splitter).toHaveAttribute("aria-valuemin", "120");
      expect(splitter).toHaveAttribute("aria-valuemax", "560");
      const toggle = within(drawer).getByRole("button", { name: "Hide the drawer" });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("textbox", { name: "Draft" })).toBeVisible();
      expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).toContainElement(
        screen.getByRole("textbox", { name: "Draft" }),
      );
    });

    it("asks for a new height from the splitter's keys: up grows it", async () => {
      windowOf("wide");
      vi.stubGlobal("innerHeight", 800);
      const onHeight = vi.fn();
      render(
        <AppShell drawer={drawerOf({ onHeight })}>
          <div />
        </AppShell>,
      );
      screen.getByRole("separator", { name: "Resize the drawer" }).focus();
      await userEvent.keyboard("{ArrowUp}");
      expect(onHeight).toHaveBeenLastCalledWith(216);
      await userEvent.keyboard("{End}");
      expect(onHeight).toHaveBeenLastCalledWith(560);
    });

    it("keeps its body mounted but hidden while closed, and asks to open from its button", async () => {
      windowOf("wide");
      const onOpen = vi.fn();
      render(
        <AppShell drawer={drawerOf({ open: false, onOpen })}>
          <div />
        </AppShell>,
      );
      const drawer = screen.getByRole("region", { name: "Drawer" });
      expect(drawer).not.toHaveAttribute("style");
      expect(drawer).toHaveTextContent("Log");
      expect(screen.queryByRole("separator")).toBeNull();
      const draft = screen.getByRole("textbox", { name: "Draft", hidden: true });
      expect(draft).not.toBeVisible();
      const toggle = screen.getByRole("button", { name: "Show the drawer" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      await userEvent.click(toggle);
      expect(onOpen).toHaveBeenCalledWith(true);
    });

    it("keeps what its body holds across closing and opening", async () => {
      windowOf("wide");
      const { rerender } = render(
        <AppShell drawer={drawerOf()}>
          <div />
        </AppShell>,
      );
      await userEvent.type(screen.getByRole("textbox", { name: "Draft" }), "half a thought");
      rerender(
        <AppShell drawer={drawerOf({ open: false })}>
          <div />
        </AppShell>,
      );
      rerender(
        <AppShell drawer={drawerOf()}>
          <div />
        </AppShell>,
      );
      expect(screen.getByRole("textbox", { name: "Draft" })).toHaveValue("half a thought");
    });

    it("asks to hide from its button while open", async () => {
      windowOf("wide");
      const onOpen = vi.fn();
      render(
        <AppShell drawer={drawerOf({ onOpen })}>
          <div />
        </AppShell>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Hide the drawer" }));
      expect(onOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("sizes out of bounds", () => {
    it("draws a width or height out of bounds, or not a number, within the bounds, without asking to change it", () => {
      windowOf("wide");
      vi.stubGlobal("innerHeight", 500);
      const onWidth = vi.fn();
      const onHeight = vi.fn();
      const { rerender } = render(
        <AppShell inspector={inspectorOf({ width: 9000, onWidth })} drawer={drawerOf({ height: 9000, onHeight })}>
          <div />
        </AppShell>,
      );
      expect(screen.getByRole("complementary")).toHaveStyle({ width: "560px" });
      expect(screen.getByRole("region")).toHaveStyle({ height: "350px" });
      rerender(
        <AppShell inspector={inspectorOf({ width: Number.NaN, onWidth })} drawer={drawerOf({ height: -4, onHeight })}>
          <div />
        </AppShell>,
      );
      expect(screen.getByRole("complementary")).toHaveStyle({ width: "280px" });
      expect(screen.getByRole("region")).toHaveStyle({ height: "120px" });
      expect(onWidth).not.toHaveBeenCalled();
      expect(onHeight).not.toHaveBeenCalled();
    });

    it("follows the window's height for the drawer's largest", () => {
      windowOf("wide");
      vi.stubGlobal("innerHeight", 1000);
      render(
        <AppShell drawer={drawerOf({ height: 9000 })}>
          <div />
        </AppShell>,
      );
      expect(screen.getByRole("region")).toHaveStyle({ height: "700px" });
      vi.stubGlobal("innerHeight", 400);
      fireEvent(window, new Event("resize"));
      expect(screen.getByRole("region")).toHaveStyle({ height: "280px" });
    });
  });

  it("takes its words through labels, the rest keeping their defaults", () => {
    windowOf("wide");
    render(
      <AppShell
        inspector={inspectorOf()}
        drawer={drawerOf()}
        labels={{ inspector: "Eigenschaften", hideDrawer: "Einklappen" }}
      >
        <div />
      </AppShell>,
    );
    expect(screen.getByRole("complementary", { name: "Eigenschaften" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einklappen" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Drawer" })).toBeInTheDocument();
    expect(defaultAppShellLabels).toEqual({
      inspector: "Inspector",
      drawer: "Drawer",
      resizeInspector: "Resize the inspector",
      resizeDrawer: "Resize the drawer",
      showDrawer: "Show the drawer",
      hideDrawer: "Hide the drawer",
      close: "Close",
    });
  });

  it("names the sheet's close button through labels", () => {
    windowOf("narrow");
    render(
      <AppShell inspector={inspectorOf()} labels={{ close: "Fermer" }}>
        <div />
      </AppShell>,
    );
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });

  it("fills the dynamic viewport, pads by the safe-area insets and has no motion of its own", () => {
    expect(css).toContain("height: 100dvh");
    for (const side of ["top", "right", "bottom", "left"]) expect(css).toContain(`env(safe-area-inset-${side})`);
    expect(css).toMatch(/min-height: var\(--pb-bar\)/);
    expect(css).not.toMatch(/\b(animation|transition)\s*:/);
  });

  it("pads each side by that side's own inset, also in right-to-left text", () => {
    // The insets are physical, so a logical padding would put the left inset on the right under dir="rtl".
    const declarations = css.split(";").filter((part) => /env\(safe-area-inset-(left|right)\)/.test(part));
    expect(declarations.length).toBeGreaterThan(0);
    for (const part of declarations) {
      const side = /safe-area-inset-(left|right)/.exec(part)?.[1];
      expect(part.trim()).toMatch(new RegExp(`^padding-${side ?? ""}:`));
    }
  });
});

describe("the bounds", () => {
  it("holds an inspector to 280–560 px, in whole px", () => {
    expect(inspectorBounds).toEqual({ min: 280, max: 560 });
    expect(clampInspectorWidth(100)).toBe(280);
    expect(clampInspectorWidth(400.6)).toBe(401);
    expect(clampInspectorWidth(9000)).toBe(560);
    expect(clampInspectorWidth(Number.NaN)).toBe(280);
  });

  it("holds a drawer to 120 px and 70 % of the window", () => {
    expect(drawerBounds).toEqual({ min: 120, maxShare: 0.7 });
    expect(drawerMaxHeight(1000)).toBe(700);
    expect(drawerMaxHeight(100)).toBe(120);
    expect(drawerMaxHeight(Number.NaN)).toBe(120);
    expect(clampDrawerHeight(50, 1000)).toBe(120);
    expect(clampDrawerHeight(300, 1000)).toBe(300);
    expect(clampDrawerHeight(900, 1000)).toBe(700);
    expect(clampDrawerHeight(Number.POSITIVE_INFINITY, 1000)).toBe(120);
  });
});
