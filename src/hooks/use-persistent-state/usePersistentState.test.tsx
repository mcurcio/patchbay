// Kept values: storage that throws, values of the wrong shape, only set values written, and a new key read afresh.
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserStorage, readKept, type StorageLike, usePersistentState, writeKept } from "./usePersistentState";

class MapStorage implements StorageLike {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

/** Blocked storage: every access throws, as a SecurityError or QuotaExceededError does. */
class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("SecurityError: storage is blocked");
  }
  setItem(): void {
    throw new Error("QuotaExceededError: storage is full");
  }
  removeItem(): void {
    throw new Error("SecurityError: storage is blocked");
  }
}

const checkWidth = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("readKept and writeKept", () => {
  it("round-trip a value as JSON", () => {
    const storage = new MapStorage();
    writeKept(storage, "app/1/width", 320);
    expect(storage.items.get("app/1/width")).toBe("320");
    expect(readKept(storage, "app/1/width", checkWidth)).toBe(320);
  });

  it("ignore text that is not JSON and values that fail the check", () => {
    const storage = new MapStorage();
    storage.setItem("k", "not json");
    expect(readKept(storage, "k", checkWidth)).toBeUndefined();
    for (const text of ['"320"', "null", "-4", "{}"]) {
      storage.setItem("k", text);
      expect(readKept(storage, "k", checkWidth)).toBeUndefined();
    }
  });

  it("keep quiet when storage throws or is missing", () => {
    for (const storage of [new ThrowingStorage(), null]) {
      expect(readKept(storage, "k", checkWidth)).toBeUndefined();
      expect(() => {
        writeKept(storage, "k", 1);
      }).not.toThrow();
    }
  });

  it("find no storage where the accessor throws", () => {
    const blocked = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(browserStorage()).toBeNull();
    blocked.mockRestore();
  });
});

describe("usePersistentState", () => {
  it("starts from the initial value and writes nothing until set", () => {
    const storage = new MapStorage();
    const { result } = renderHook(() => usePersistentState("app/1/width", 300, checkWidth, { storage }));
    expect(result.current[0]).toBe(300);
    expect(storage.items.size).toBe(0);
  });

  it("starts from a good kept value", () => {
    const storage = new MapStorage();
    storage.setItem("app/1/width", "420");
    const { result } = renderHook(() => usePersistentState("app/1/width", 300, checkWidth, { storage }));
    expect(result.current[0]).toBe(420);
  });

  it("ignores a kept value of the wrong shape", () => {
    const storage = new MapStorage();
    storage.setItem("app/1/width", '"wide"');
    const { result } = renderHook(() => usePersistentState("app/1/width", 300, checkWidth, { storage }));
    expect(result.current[0]).toBe(300);
  });

  it("writes each value it is set to, plain or from the previous", () => {
    const storage = new MapStorage();
    const { result } = renderHook(() => usePersistentState("app/1/width", 300, checkWidth, { storage }));
    act(() => {
      result.current[1](360);
    });
    expect(result.current[0]).toBe(360);
    expect(storage.items.get("app/1/width")).toBe("360");
    act(() => {
      result.current[1]((width) => width + 40);
    });
    expect(result.current[0]).toBe(400);
    expect(storage.items.get("app/1/width")).toBe("400");
  });

  it("keeps the value for the page's life when storage throws", () => {
    const { result } = renderHook(() =>
      usePersistentState("app/1/width", 300, checkWidth, { storage: new ThrowingStorage() }),
    );
    expect(result.current[0]).toBe(300);
    act(() => {
      result.current[1](500);
    });
    expect(result.current[0]).toBe(500);
  });

  it("reads a new key's own value", () => {
    const storage = new MapStorage();
    storage.setItem("app/1/a", "111");
    storage.setItem("app/1/b", "222");
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => usePersistentState(key, 300, checkWidth, { storage }),
      { initialProps: { key: "app/1/a" } },
    );
    expect(result.current[0]).toBe(111);
    rerender({ key: "app/1/b" });
    expect(result.current[0]).toBe(222);
    rerender({ key: "app/1/c" });
    expect(result.current[0]).toBe(300);
    expect(storage.items.has("app/1/c")).toBe(false);
    act(() => {
      result.current[1](333);
    });
    expect(storage.items.get("app/1/c")).toBe("333");
    expect(storage.items.get("app/1/a")).toBe("111");
  });

  it("uses the browser's localStorage by default", () => {
    const { result } = renderHook(() =>
      usePersistentState("app/1/flag", false, (v) => (typeof v === "boolean" ? v : undefined)),
    );
    act(() => {
      result.current[1](true);
    });
    expect(window.localStorage.getItem("app/1/flag")).toBe("true");
  });
});
