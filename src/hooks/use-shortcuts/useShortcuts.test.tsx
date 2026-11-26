// Shortcuts: the key strings and how they match, Mod per platform, the text field rule (single keys and Escape never,
// chords by opt-in, React Flow's nokey), the labels, and the hook's one listener.
import { fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ariaKeyShortcuts,
  detectPlatform,
  findShortcut,
  isTextTarget,
  keyLabel,
  matchesKeys,
  type Shortcut,
  useShortcuts,
} from "./useShortcuts";

type Init = Partial<Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">>;
const press = (init: Init) => ({
  key: "",
  code: "",
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...init,
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("matching a key string", () => {
  it("reads Mod as Cmd on Apple platforms and Ctrl elsewhere", () => {
    expect(matchesKeys(press({ key: "k", metaKey: true }), "Mod+K", "apple")).toBe(true);
    expect(matchesKeys(press({ key: "k", ctrlKey: true }), "Mod+K", "apple")).toBe(false);
    expect(matchesKeys(press({ key: "k", ctrlKey: true }), "Mod+K", "other")).toBe(true);
    expect(matchesKeys(press({ key: "k", metaKey: true }), "Mod+K", "other")).toBe(false);
  });

  it("wants exactly the modifiers it names", () => {
    expect(matchesKeys(press({ key: "k" }), "Mod+K", "other")).toBe(false);
    expect(matchesKeys(press({ key: "k", ctrlKey: true, altKey: true }), "Mod+K", "other")).toBe(false);
    expect(matchesKeys(press({ key: "Z", ctrlKey: true, shiftKey: true }), "Mod+Shift+Z", "other")).toBe(true);
    expect(matchesKeys(press({ key: "z", ctrlKey: true }), "Mod+Shift+Z", "other")).toBe(false);
    expect(matchesKeys(press({ key: "Z", ctrlKey: true, shiftKey: true }), "Mod+Z", "other")).toBe(false);
    expect(matchesKeys(press({ key: "Delete" }), "Delete", "other")).toBe(true);
    expect(matchesKeys(press({ key: "Delete", shiftKey: true }), "Delete", "other")).toBe(false);
  });

  it("ignores letter case, and Shift for a character Shift itself makes", () => {
    expect(matchesKeys(press({ key: "K", shiftKey: true }), "Shift+k", "other")).toBe(true);
    expect(matchesKeys(press({ key: "?", shiftKey: true }), "?", "other")).toBe(true);
    expect(matchesKeys(press({ key: "?", shiftKey: true }), "Shift+?", "other")).toBe(true);
    expect(matchesKeys(press({ key: "escape" }), "Escape", "other")).toBe(true);
  });

  it("wants Shift named for a digit, which is found by its physical key", () => {
    expect(matchesKeys(press({ key: "1", code: "Digit1" }), "1", "other")).toBe(true);
    expect(matchesKeys(press({ key: "!", code: "Digit1", shiftKey: true }), "1", "other")).toBe(false);
    expect(matchesKeys(press({ key: "!", code: "Digit1", ctrlKey: true, shiftKey: true }), "Mod+1", "other")).toBe(
      false,
    );
    expect(
      matchesKeys(press({ key: "!", code: "Digit1", ctrlKey: true, shiftKey: true }), "Mod+Shift+1", "other"),
    ).toBe(true);
  });

  it("reads aliases, Space and Plus", () => {
    expect(matchesKeys(press({ key: " " }), "Space", "other")).toBe(true);
    expect(matchesKeys(press({ key: " " }), " ", "other")).toBe(true);
    expect(matchesKeys(press({ key: "Escape" }), "Esc", "other")).toBe(true);
    expect(matchesKeys(press({ key: "+", ctrlKey: true }), "Mod++", "other")).toBe(true);
    expect(matchesKeys(press({ key: "+", shiftKey: true }), "+", "other")).toBe(true);
  });

  it("finds a letter by its physical key when Alt or the layout changed its character", () => {
    expect(matchesKeys(press({ key: "˚", code: "KeyK", altKey: true }), "Alt+K", "apple")).toBe(true);
    expect(matchesKeys(press({ key: "л", code: "KeyK", ctrlKey: true }), "Mod+K", "other")).toBe(true);
    expect(matchesKeys(press({ key: "¡", code: "Digit1", altKey: true }), "Alt+1", "apple")).toBe(true);
    // A Latin letter that differs is another key: Q on an AZERTY layout types "a".
    expect(matchesKeys(press({ key: "a", code: "KeyQ", ctrlKey: true }), "Mod+Q", "other")).toBe(false);
  });

  it("matches any of several strings", () => {
    expect(matchesKeys(press({ key: "Backspace" }), ["Delete", "Backspace"], "other")).toBe(true);
  });

  it("never matches a string naming a modifier it does not know, or no key", () => {
    expect(matchesKeys(press({ key: "k", ctrlKey: true }), "Hyper+K", "other")).toBe(false);
    expect(matchesKeys(press({ key: "k" }), "Hyper+K", "other")).toBe(false);
    expect(matchesKeys(press({ key: "k", ctrlKey: true }), "Mod+", "other")).toBe(false);
    expect(matchesKeys(press({ key: "" }), "", "other")).toBe(false);
  });
});

describe("the platform", () => {
  it("is apple on a Mac, iPhone or iPad and other elsewhere", () => {
    const nav = (platform: string) => ({ platform, userAgent: "" }) as Navigator;
    expect(detectPlatform(nav("MacIntel"))).toBe("apple");
    expect(detectPlatform(nav("iPhone"))).toBe("apple");
    expect(detectPlatform(nav("Win32"))).toBe("other");
    expect(detectPlatform(nav("Linux x86_64"))).toBe("other");
    expect(detectPlatform({ platform: "", userAgentData: { platform: "macOS" } } as unknown as Navigator)).toBe(
      "apple",
    );
  });
});

describe("text targets", () => {
  const make = (html: string) => {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
  };

  it("are text inputs, textareas, selects and editable content", () => {
    expect(isTextTarget(make('<input type="text">'))).toBe(true);
    expect(isTextTarget(make("<input>"))).toBe(true);
    expect(isTextTarget(make('<input type="search">'))).toBe(true);
    expect(isTextTarget(make('<input type="number">'))).toBe(true);
    expect(isTextTarget(make("<textarea></textarea>"))).toBe(true);
    expect(isTextTarget(make("<select></select>"))).toBe(true);
    expect(isTextTarget(make('<div contenteditable="true"><b>x</b></div>')?.firstElementChild ?? null)).toBe(true);
  });

  it("are not buttons, checkboxes, ranges or plain elements", () => {
    for (const type of ["checkbox", "radio", "range", "button", "submit", "color", "file"]) {
      expect(isTextTarget(make(`<input type="${type}">`))).toBe(false);
    }
    expect(isTextTarget(make("<button>x</button>"))).toBe(false);
    expect(isTextTarget(make('<div contenteditable="false"></div>'))).toBe(false);
    expect(isTextTarget(document.body)).toBe(false);
    expect(isTextTarget(null)).toBe(false);
    expect(isTextTarget(window)).toBe(false);
  });

  it("include anything inside React Flow's nokey class", () => {
    expect(isTextTarget(make('<div class="nokey"><button>x</button></div>')?.firstElementChild ?? null)).toBe(true);
  });
});

describe("finding the binding a press runs", () => {
  const keydown = (target: EventTarget, init: KeyboardEventInit) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    Object.defineProperty(event, "target", { value: target });
    return event;
  };
  const table = (extra: Partial<Shortcut> = {}): Shortcut[] => [
    { keys: "Mod+K", run: () => {}, ...extra },
    { keys: "Delete", run: () => {}, ...extra },
    { keys: "Escape", run: () => {}, ...extra },
    { keys: "Shift+?", run: () => {}, ...extra },
  ];

  it("keeps single keys, Shift characters and Escape out of text fields, even when they opt in", () => {
    document.body.innerHTML = "<input>";
    const input = document.body.firstElementChild as HTMLElement;
    const bindings = table({ inTextFields: true });
    expect(findShortcut(keydown(input, { key: "Delete" }), bindings, "other")).toBeUndefined();
    expect(findShortcut(keydown(input, { key: "Escape" }), bindings, "other")).toBeUndefined();
    expect(findShortcut(keydown(input, { key: "?", shiftKey: true }), bindings, "other")).toBeUndefined();
    expect(findShortcut(keydown(document.body, { key: "Delete" }), bindings, "other")).toBe(bindings[1]);
  });

  it("lets a chord act in a text field only when its binding opts in", () => {
    document.body.innerHTML = "<textarea></textarea>";
    const area = document.body.firstElementChild as HTMLElement;
    expect(findShortcut(keydown(area, { key: "k", ctrlKey: true }), table(), "other")).toBeUndefined();
    const opted = table({ inTextFields: true });
    expect(findShortcut(keydown(area, { key: "k", ctrlKey: true }), opted, "other")).toBe(opted[0]);
  });

  it("skips a press already handled, a repeat, a composition and a binding turned off", () => {
    const bindings = table();
    const handled = keydown(document.body, { key: "Delete" });
    handled.preventDefault();
    expect(findShortcut(handled, bindings, "other")).toBeUndefined();
    expect(findShortcut(keydown(document.body, { key: "Delete", repeat: true }), bindings, "other")).toBeUndefined();
    expect(
      findShortcut(keydown(document.body, { key: "Delete", isComposing: true }), bindings, "other"),
    ).toBeUndefined();
    expect(findShortcut(keydown(document.body, { key: "Delete" }), table({ enabled: false }), "other")).toBeUndefined();
    const repeating = table({ repeat: true });
    expect(findShortcut(keydown(document.body, { key: "Delete", repeat: true }), repeating, "other")).toBe(
      repeating[1],
    );
  });

  it("returns the first binding that matches", () => {
    const first: Shortcut = { keys: "Delete", run: () => {} };
    const second: Shortcut = { keys: ["Backspace", "Delete"], run: () => {} };
    expect(findShortcut(keydown(document.body, { key: "Delete" }), [first, second], "other")).toBe(first);
  });
});

describe("labels", () => {
  it("draws Apple modifiers as symbols in Apple's order", () => {
    expect(keyLabel("Mod+K", { platform: "apple" })).toBe("⌘K");
    expect(keyLabel("Mod+Shift+Z", { platform: "apple" })).toBe("⇧⌘Z");
    expect(keyLabel("Shift+Alt+Ctrl+Meta+P", { platform: "apple" })).toBe("⌃⌥⇧⌘P");
    expect(keyLabel("Backspace", { platform: "apple" })).toBe("⌫");
    expect(keyLabel("Delete", { platform: "apple" })).toBe("⌦");
    expect(keyLabel("Enter", { platform: "apple" })).toBe("↩");
  });

  it("spells modifiers out elsewhere, joined by +", () => {
    expect(keyLabel("Mod+K", { platform: "other" })).toBe("Ctrl+K");
    expect(keyLabel("Mod+Shift+Z", { platform: "other" })).toBe("Ctrl+Shift+Z");
    expect(keyLabel("Delete", { platform: "other" })).toBe("Delete");
    expect(keyLabel("Mod++", { platform: "other" })).toBe("Ctrl++");
  });

  it("names the keys both share", () => {
    for (const platform of ["apple", "other"] as const) {
      expect(keyLabel("Escape", { platform })).toBe("Esc");
      expect(keyLabel("Esc", { platform })).toBe("Esc");
      expect(keyLabel("Space", { platform })).toBe("Space");
      expect(keyLabel("ArrowUp", { platform })).toBe("↑");
      expect(keyLabel("?", { platform })).toBe("?");
      expect(keyLabel("PageDown", { platform })).toBe("Page Down");
    }
  });

  it("takes the app's words for keys and modifiers", () => {
    expect(keyLabel("Mod+Escape", { platform: "other", names: { Escape: "Échap", Ctrl: "Strg" } })).toBe("Strg+Échap");
    expect(keyLabel("Space", { platform: "apple", names: { Space: "espace" } })).toBe("espace");
  });

  it("shows a key it does not know by its name, and a string it cannot read as written", () => {
    expect(keyLabel("F5", { platform: "other" })).toBe("F5");
    expect(keyLabel("Mod+MediaPlayPause", { platform: "other" })).toBe("Ctrl+MediaPlayPause");
    expect(keyLabel("Hyper+K", { platform: "other" })).toBe("Hyper+K");
  });

  it("writes aria-keyshortcuts values", () => {
    expect(ariaKeyShortcuts("Mod+K", "apple")).toBe("Meta+K");
    expect(ariaKeyShortcuts("Mod+K", "other")).toBe("Control+K");
    expect(ariaKeyShortcuts(["Delete", "Backspace"], "other")).toBe("Delete Backspace");
    expect(ariaKeyShortcuts("Mod+Shift+Space", "other")).toBe("Control+Shift+Space");
    expect(ariaKeyShortcuts(["Hyper+K", "Escape"], "other")).toBe("Escape");
  });
});

describe("useShortcuts", () => {
  it("runs the matching binding and prevents the browser's action", () => {
    const run = vi.fn();
    renderHook(() => {
      useShortcuts([{ keys: "Mod+K", run }], { platform: "other" });
    });
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(run).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves the browser's action when the binding says so", () => {
    const run = vi.fn();
    renderHook(() => {
      useShortcuts([{ keys: "Delete", run, preventDefault: false }], { platform: "other" });
    });
    const event = new KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(run).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
  });

  it("reads the latest table without binding again", () => {
    const first = vi.fn();
    const second = vi.fn();
    const add = vi.spyOn(window, "addEventListener");
    const { rerender } = renderHook(
      ({ run }) => {
        useShortcuts([{ keys: "Delete", run }], { platform: "other" });
      },
      {
        initialProps: { run: first },
      },
    );
    rerender({ run: second });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    add.mockRestore();
  });

  it("acts on presses from the page but not from a text field", () => {
    const run = vi.fn();
    function Page() {
      useShortcuts([{ keys: "Delete", run }], { platform: "other" });
      return (
        <>
          <button type="button">Plain</button>
          <input aria-label="Name" />
        </>
      );
    }
    const { getByRole } = render(<Page />);
    fireEvent.keyDown(getByRole("textbox"), { key: "Delete" });
    expect(run).not.toHaveBeenCalled();
    fireEvent.keyDown(getByRole("button"), { key: "Delete" });
    expect(run).toHaveBeenCalledOnce();
  });

  it("does nothing while turned off, and stops when unmounted", () => {
    const run = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ enabled }) => {
        useShortcuts([{ keys: "Delete", run }], { enabled, platform: "other" });
      },
      { initialProps: { enabled: false } },
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(run).not.toHaveBeenCalled();
    rerender({ enabled: true });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(run).toHaveBeenCalledOnce();
    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(run).toHaveBeenCalledOnce();
  });
});
