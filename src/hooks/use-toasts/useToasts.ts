// useToasts (docs/components.md#usetoasts): the toast queue (toastQueue.ts) held in React state, with one timer for
// the soonest expiry on the monotonic clock. It returns what shows a toast and the props a Toaster draws from.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addToast,
  clearToasts,
  dismissToast,
  emptyToastQueue,
  expireToasts,
  holdToasts,
  nextToastExpiry,
  type Toast,
  type ToastInput,
  type ToastQueue,
  toastDefaults,
  visibleToasts,
} from "./toastQueue";

export type UseToastsOptions = {
  /** How long a toast lasts unheld, in ms (8000). A toast's own `duration` wins. */
  duration?: number;
  /** A toast shown again under its key within this many ms of its last showing counts up (5000). */
  coalesceWindow?: number;
  /** How many toasts are shown, the newest; older ones fold into "and n more" (4). */
  visible?: number;
  /** The monotonic clock, in ms (`performance.now` by default); tests pass their own. */
  now?: () => number;
};

/** What a Toaster draws from: spread it onto one (`<Toaster {...toasts.toasterProps} />`). */
export type ToasterBinding = {
  /** The shown toasts, oldest first. */
  toasts: readonly Toast[];
  /** How many older toasts are folded away. */
  more: number;
  onDismiss: (id: number) => void;
  /** Held while the person hovers over or is focused in the toasts: none expires. */
  onHold: (held: boolean) => void;
};

export type UseToastsResult = {
  /** Every toast in the queue, oldest first, the folded ones included. */
  toasts: readonly Toast[];
  /** Shows a toast, or counts up the one it coalesces with; returns its id. */
  show: (input: ToastInput) => number;
  dismiss: (id: number) => void;
  clear: () => void;
  toasterProps: ToasterBinding;
};

const performanceNow = () => performance.now();

export function useToasts(options: UseToastsOptions = {}): UseToastsResult {
  const { duration, coalesceWindow, visible = toastDefaults.visible, now = performanceNow } = options;
  const [queue, setQueue] = useState<ToastQueue>(emptyToastQueue);
  // The queue as last set, so show can return the id at once and two calls in one event both count.
  const current = useRef(queue);
  const latest = useRef({ duration, coalesceWindow, now });
  useEffect(() => {
    latest.current = { duration, coalesceWindow, now };
  });

  const update = useCallback((step: (queue: ToastQueue, now: number) => ToastQueue) => {
    const next = step(current.current, latest.current.now());
    if (next === current.current) return next;
    current.current = next;
    setQueue(next);
    return next;
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const { duration: forEach, coalesceWindow: window } = latest.current;
      const next = update((queue, at) => addToast(queue, input, at, { duration: forEach, coalesceWindow: window }));
      const added = next.toasts.at(-1);
      if (added === undefined) throw new Error("useToasts: a toast was shown but not added");
      return added.id;
    },
    [update],
  );
  const dismiss = useCallback((id: number) => void update((queue) => dismissToast(queue, id)), [update]);
  const clear = useCallback(() => void update(clearToasts), [update]);
  const hold = useCallback((held: boolean) => void update((queue, at) => holdToasts(queue, held, at)), [update]);

  // One timer, for the soonest expiry; a millisecond past it, so a timer that fires on the dot never finds the toast
  // not yet over, which would set no timer again.
  const at = nextToastExpiry(queue);
  useEffect(() => {
    if (at === undefined) return undefined;
    const timer = setTimeout(() => void update(expireToasts), Math.max(0, Math.ceil(at - latest.current.now()) + 1));
    return () => {
      clearTimeout(timer);
    };
  }, [at, update]);

  const toasterProps = useMemo(() => {
    const { shown, more } = visibleToasts(queue, visible);
    return { toasts: shown, more, onDismiss: dismiss, onHold: hold };
  }, [queue, visible, dismiss, hold]);
  return { toasts: queue.toasts, show, dismiss, clear, toasterProps };
}
