// The toast queue, pure (docs/components.md#usetoasts): every step takes the queue and the time and returns a new
// queue, so it is tested without React or timers. A toast shown again under the same key within the coalescing window
// counts up in place of stacking; each lasts its duration on the monotonic clock the caller reads; none expires while
// the queue is held (the person is hovering over or focused in the toasts), and letting go moves each expiry on by the
// time it was held; the newest few are shown and the rest fold into a count.
import type { ReactNode } from "react";

/** The tones a toast is drawn in; any other string is drawn neutrally. An `err` toast is an alert, the rest status. */
export type ToastTone = "ok" | "warn" | "err" | "quiet" | "off" | "accent" | "muted" | (string & {});

/** A button on a toast that acts on its news. Pressing it runs `run`, then dismisses the toast. */
export type ToastAction = {
  /** The button's words. */
  label: string;
  run: () => void;
};

/** What the app shows. */
export type ToastInput = {
  tone: ToastTone;
  /** The news; any node, so it may hold code or emphasis. */
  text: ReactNode;
  /**
   * Toasts shown under the same key within the coalescing window are one toast that counts up ("×3"), taking the
   * newest tone, text and action. Without a key a toast never coalesces.
   */
  key?: string;
  action?: ToastAction;
  /** How long this toast lasts unheld, in ms, in place of the queue's duration; Infinity keeps it until dismissed. */
  duration?: number;
};

/** A toast in the queue. */
export type Toast = Omit<ToastInput, "duration"> & {
  /** Its own, never reused while the queue lives. */
  id: number;
  /** How many times it was shown, coalesced; 1 at first. */
  count: number;
  /** When it was last shown, on the queue's clock. */
  lastAt: number;
  /** When it goes, on the queue's clock; Infinity for one kept until dismissed. */
  expiresAt: number;
};

export type ToastQueue = {
  /** Oldest first. */
  readonly toasts: readonly Toast[];
  /** While held: since when. */
  readonly heldSince?: number;
  /** The id the next new toast takes. */
  readonly nextId: number;
};

export type ToastQueueOptions = {
  /** How long a toast lasts unheld, in ms. */
  duration?: number;
  /** A toast shown again under its key within this many ms of its last showing counts up. */
  coalesceWindow?: number;
};

/** The defaults: 8 s a toast, 5 s to coalesce, the newest four shown. */
export const toastDefaults = { duration: 8000, coalesceWindow: 5000, visible: 4 } as const;

/** The empty queue. */
export const emptyToastQueue: ToastQueue = Object.freeze({ toasts: Object.freeze([]), nextId: 1 });

/** Adds a toast as the newest, or counts up the one it coalesces with and makes that the newest. */
export function addToast(
  queue: ToastQueue,
  input: ToastInput,
  now: number,
  options: ToastQueueOptions = {},
): ToastQueue {
  const window = options.coalesceWindow ?? toastDefaults.coalesceWindow;
  const { duration = options.duration ?? toastDefaults.duration, ...shown } = input;
  const same =
    input.key === undefined
      ? undefined
      : queue.toasts.find((toast) => toast.key === input.key && now - toast.lastAt < window);
  const rest = same === undefined ? queue.toasts : queue.toasts.filter((toast) => toast !== same);
  const toast: Toast = {
    ...shown,
    id: same?.id ?? queue.nextId,
    count: (same?.count ?? 0) + 1,
    lastAt: now,
    expiresAt: now + duration,
  };
  return { ...queue, toasts: [...rest, toast], nextId: same === undefined ? queue.nextId + 1 : queue.nextId };
}

/** Takes the toast away; the same queue if it is not there. */
export function dismissToast(queue: ToastQueue, id: number): ToastQueue {
  const toasts = queue.toasts.filter((toast) => toast.id !== id);
  return toasts.length === queue.toasts.length ? queue : { ...queue, toasts };
}

/** Takes every toast away. */
export function clearToasts(queue: ToastQueue): ToastQueue {
  return queue.toasts.length === 0 ? queue : { ...queue, toasts: [] };
}

/**
 * Holds the queue (nothing expires) or lets it go. Letting go moves each toast's expiry on by the time it was held:
 * since the hold began, or since it was last shown if that came later. The same queue when nothing changes.
 */
export function holdToasts(queue: ToastQueue, held: boolean, now: number): ToastQueue {
  const { heldSince } = queue;
  if (held) return heldSince === undefined ? { ...queue, heldSince: now } : queue;
  if (heldSince === undefined) return queue;
  const toasts = queue.toasts.map((toast) => ({
    ...toast,
    expiresAt: toast.expiresAt + Math.max(0, now - Math.max(heldSince, toast.lastAt)),
  }));
  return { toasts, nextId: queue.nextId };
}

/** Drops the toasts whose time is over; nothing while held. The same queue when none is over. */
export function expireToasts(queue: ToastQueue, now: number): ToastQueue {
  if (queue.heldSince !== undefined) return queue;
  const toasts = queue.toasts.filter((toast) => toast.expiresAt > now);
  return toasts.length === queue.toasts.length ? queue : { ...queue, toasts };
}

/** When the soonest toast expires; undefined while held, or with none that expires. */
export function nextToastExpiry(queue: ToastQueue): number | undefined {
  if (queue.heldSince !== undefined) return undefined;
  let soonest: number | undefined;
  for (const { expiresAt } of queue.toasts) {
    if (Number.isFinite(expiresAt) && (soonest === undefined || expiresAt < soonest)) soonest = expiresAt;
  }
  return soonest;
}

/** The newest `visible` toasts, oldest first, and how many older ones fold into "and n more". */
export function visibleToasts(
  queue: ToastQueue,
  visible: number = toastDefaults.visible,
): { shown: readonly Toast[]; more: number } {
  const cap = Number.isNaN(visible) ? toastDefaults.visible : Math.max(0, Math.floor(visible));
  const more = Math.max(0, queue.toasts.length - cap);
  return { shown: queue.toasts.slice(more), more };
}
