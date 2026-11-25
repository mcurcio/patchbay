// The theme: the cycle, data-theme written for light and dark and removed for system, the kept choice, and the inline
// script that applies it before the page draws.
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StorageLike } from "../use-persistent-state/usePersistentState";
import {
  applyTheme,
  checkTheme,
  defaultTheme,
  defaultThemeKey,
  nextTheme,
  themeChoices,
  themeScript,
  useTheme,
} from "./useTheme";

const html = document.documentElement;

afterEach(() => {
  delete html.dataset["theme"];
  window.localStorage.clear();
});

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("SecurityError");
  }
  setItem(): void {
    throw new Error("QuotaExceededError");
  }
  removeItem(): void {
    throw new Error("SecurityError");
  }
}

describe("the theme's logic", () => {
  it("starts at system", () => {
    expect(defaultTheme).toBe("system");
    expect(themeChoices).toEqual(["system", "light", "dark"]);
  });

  it("cycles system, light, dark and back", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });

  it("writes data-theme for light and dark and removes it for system", () => {
    const root = { dataset: {} as DOMStringMap };
    applyTheme(root, "light");
    expect(root.dataset["theme"]).toBe("light");
    applyTheme(root, "dark");
    expect(root.dataset["theme"]).toBe("dark");
    applyTheme(root, "system");
    expect("theme" in root.dataset).toBe(false);
  });

  it("accepts only the three choices", () => {
    for (const choice of themeChoices) expect(checkTheme(choice)).toBe(choice);
    for (const value of ["Dark", 3, null, undefined, {}]) expect(checkTheme(value)).toBeUndefined();
  });
});

describe("useTheme", () => {
  it("follows the system with no attribute until a choice is made", () => {
    const { result } = renderHook(() => useTheme({ key: "app/1/theme" }));
    expect(result.current[0]).toBe("system");
    expect(html).not.toHaveAttribute("data-theme");
    expect(window.localStorage.getItem("app/1/theme")).toBeNull();
  });

  it("writes the choice to <html> and keeps it", () => {
    const { result } = renderHook(() => useTheme({ key: "app/1/theme" }));
    act(() => {
      result.current[1]("dark");
    });
    expect(html).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("app/1/theme")).toBe('"dark"');
    act(() => {
      result.current[1]("system");
    });
    expect(html).not.toHaveAttribute("data-theme");
    expect(window.localStorage.getItem("app/1/theme")).toBe('"system"');
  });

  it("starts from the kept choice, under the default key without one", () => {
    window.localStorage.setItem(defaultThemeKey, '"light"');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("light");
    expect(html).toHaveAttribute("data-theme", "light");
  });

  it("ignores a kept value that is not a choice", () => {
    window.localStorage.setItem("app/1/theme", '"sepia"');
    const { result } = renderHook(() => useTheme({ key: "app/1/theme" }));
    expect(result.current[0]).toBe("system");
  });

  it("still switches when storage throws", () => {
    const { result } = renderHook(() => useTheme({ storage: new ThrowingStorage() }));
    act(() => {
      result.current[1]("light");
    });
    expect(result.current[0]).toBe("light");
    expect(html).toHaveAttribute("data-theme", "light");
  });

  it("writes onto the root it is given", () => {
    const root = { dataset: {} as DOMStringMap };
    const { result } = renderHook(() => useTheme({ root, storage: null }));
    act(() => {
      result.current[1]("dark");
    });
    expect(root.dataset["theme"]).toBe("dark");
    expect(html).not.toHaveAttribute("data-theme");
  });
});

describe("themeScript", () => {
  const run = (script: string) => {
    // The script is what an index.html inlines; running it here is what the browser does before the page draws.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const inline = new Function(script) as () => void;
    inline();
  };

  it("applies a kept light or dark choice", () => {
    window.localStorage.setItem("app/1/theme", '"dark"');
    run(themeScript("app/1/theme"));
    expect(html).toHaveAttribute("data-theme", "dark");
  });

  it("leaves the system's theme for system, a bad value or nothing kept", () => {
    for (const text of ['"system"', '"sepia"', "not json", null]) {
      if (text === null) window.localStorage.removeItem(defaultThemeKey);
      else window.localStorage.setItem(defaultThemeKey, text);
      run(themeScript());
      expect(html).not.toHaveAttribute("data-theme");
    }
  });

  it("cannot close its script element", () => {
    expect(themeScript("a</script><b")).not.toContain("</script>");
  });
});
