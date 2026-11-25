// A value kept in the browser's localStorage across reloads. Every read and write is in try, so a private window,
// blocked storage or a full quota leaves a value that lasts the page's life instead of a failure; every value is
// checked on read and one that fails the check is ignored, as is text that is not JSON. The key is the app's whole
// key: an app prefixes its own (with a version number that moves if a value's shape ever changes), so two apps on one
// origin never share a value. The initial value is never written; only a value the app sets is.
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";

/** What a kept value needs of window.localStorage. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** window.localStorage, or null without a window or where its accessor throws (blocked storage). */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Checks a value read back from storage: returns it (or a value made from it) when it is good, and undefined when it
 * is not, so the initial value is used instead.
 */
export type KeptCheck<T> = (value: unknown) => T | undefined;

/** The value kept under `key`, checked; undefined when there is none, storage throws, or it is not good JSON. */
export function readKept<T>(storage: StorageLike | null, key: string, check: KeptCheck<T>): T | undefined {
  try {
    const text = storage?.getItem(key);
    if (text === null || text === undefined) return undefined;
    return check(JSON.parse(text) as unknown);
  } catch {
    return undefined;
  }
}

/** Writes `value` as JSON under `key`; a full or blocked storage is ignored. */
export function writeKept(storage: StorageLike | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked storage: the page keeps the value for its life.
  }
}

export interface PersistentStateOptions {
  /** Where values are kept; the browser's localStorage by default. null keeps nothing. */
  storage?: StorageLike | null;
}

interface Held<T> {
  key: string;
  value: T;
  /** Set by the app (so written), not read or initial. */
  set: boolean;
}

/**
 * React state kept under `key` in localStorage: starts from the kept value when `check` accepts it, else `initial`,
 * and writes every value the app sets. A new `key` reads that key's value afresh.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  check: KeptCheck<T>,
  options: PersistentStateOptions = {},
): [T, Dispatch<SetStateAction<T>>] {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const [held, setHeld] = useState<Held<T>>(() => ({
    key,
    value: readKept(storage, key, check) ?? initial,
    set: false,
  }));

  let current = held;
  if (held.key !== key) {
    // A new key: its own kept value, read during render (React's way to reset state on a prop change).
    current = { key, value: readKept(storage, key, check) ?? initial, set: false };
    setHeld(current);
  }

  useEffect(() => {
    if (current.set) writeKept(storage, current.key, current.value);
    // Only a change of what is held writes; a new storage object on each render does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setHeld((previous) => ({
      key: previous.key,
      value: typeof next === "function" ? (next as (previous: T) => T)(previous.value) : next,
      set: true,
    }));
  }, []);

  return [current.value, set];
}
