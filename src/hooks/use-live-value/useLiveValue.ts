// A hot value kept outside React state: something that changes many times a second (a level, a rate) is read through
// a subscription and handed to a callback that paints it through refs, so the component never re-renders for it
// (docs/components.md#uselivevalue).
import { type RefObject, useLayoutEffect, useRef } from "react";

/** Adds a listener, called whenever a new value is ready to read; returns what removes it. */
export type LiveSubscribe = (listener: () => void) => () => void;

/**
 * Subscribes to a hot value while the component is mounted, without React state. On subscribing, and on every call
 * of the listener, it reads the value, keeps it in the returned ref and passes it to `onValue` (the paint). `read`
 * and `onValue` may change every render; a new `subscribe` subscribes afresh, so pass a stable one.
 */
export function useLiveValue<T>(
  subscribe: LiveSubscribe,
  read: () => T,
  onValue?: (value: T) => void,
): RefObject<T | undefined> {
  const value = useRef<T | undefined>(undefined);
  const latest = useRef({ read, onValue });
  // A layout effect, so a value that arrives before the browser paints reads through the latest callbacks.
  useLayoutEffect(() => {
    latest.current = { read, onValue };
  });
  useLayoutEffect(() => {
    let live = true;
    const take = () => {
      if (!live) return;
      const next = latest.current.read();
      value.current = next;
      latest.current.onValue?.(next);
    };
    const unsubscribe = subscribe(take);
    // What changed between the render and the subscription is read now, so the first paint shows it.
    take();
    return () => {
      live = false;
      unsubscribe();
    };
  }, [subscribe]);
  return value;
}
