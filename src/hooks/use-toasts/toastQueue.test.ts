// The toast queue: adding, coalescing by key within the window, dismissing, expiry on the given clock, holding and
// letting go (each expiry moved on by the time it was held), and the newest few shown with the rest folded.
import { describe, expect, it } from "vitest";
import {
  addToast,
  clearToasts,
  dismissToast,
  emptyToastQueue,
  expireToasts,
  holdToasts,
  nextToastExpiry,
  toastDefaults,
  visibleToasts,
} from "./toastQueue";

const ok = { tone: "ok", text: "Saved." } as const;

describe("the toast queue", () => {
  it("has the defaults the docs give", () => {
    expect(toastDefaults).toEqual({ duration: 8000, coalesceWindow: 5000, visible: 4 });
  });

  it("adds toasts newest last, each with its own id, a count of one and an expiry", () => {
    let queue = addToast(emptyToastQueue, ok, 100);
    queue = addToast(queue, { tone: "err", text: "Refused." }, 200);
    expect(queue.toasts.map(({ id, count, lastAt, expiresAt }) => ({ id, count, lastAt, expiresAt }))).toEqual([
      { id: 1, count: 1, lastAt: 100, expiresAt: 8100 },
      { id: 2, count: 1, lastAt: 200, expiresAt: 8200 },
    ]);
    expect(emptyToastQueue.toasts).toEqual([]);
  });

  it("never coalesces toasts without a key", () => {
    let queue = addToast(emptyToastQueue, ok, 0);
    queue = addToast(queue, ok, 10);
    expect(queue.toasts).toHaveLength(2);
  });

  it("counts up a toast shown again under its key within the window, as the newest, with the newest words", () => {
    let queue = addToast(emptyToastQueue, { tone: "warn", text: "Slow.", key: "a" }, 0);
    queue = addToast(queue, { tone: "ok", text: "Other." }, 100);
    queue = addToast(queue, { tone: "err", text: "Slower.", key: "a" }, 4999);
    expect(queue.toasts.map((toast) => [toast.id, toast.text, toast.tone, toast.count])).toEqual([
      [2, "Other.", "ok", 1],
      [1, "Slower.", "err", 2],
    ]);
    expect(queue.toasts[1]?.expiresAt).toBe(4999 + 8000);
    expect(queue.nextId).toBe(3);
  });

  it("measures the window from the last showing, and starts afresh past it", () => {
    let queue = addToast(emptyToastQueue, { ...ok, key: "a" }, 0);
    queue = addToast(queue, { ...ok, key: "a" }, 4000);
    queue = addToast(queue, { ...ok, key: "a" }, 8000);
    expect(queue.toasts).toHaveLength(1);
    expect(queue.toasts[0]?.count).toBe(3);
    queue = addToast(queue, { ...ok, key: "a" }, 13000);
    expect(queue.toasts.map((toast) => toast.count)).toEqual([3, 1]);
  });

  it("takes its duration and window from the options, and a toast's own duration first", () => {
    let queue = addToast(emptyToastQueue, { ...ok, key: "a" }, 0, { duration: 1000, coalesceWindow: 100 });
    queue = addToast(queue, { ...ok, key: "a" }, 200, { duration: 1000, coalesceWindow: 100 });
    expect(queue.toasts.map((toast) => toast.expiresAt)).toEqual([1000, 1200]);
    queue = addToast(queue, { ...ok, duration: 50 }, 300, { duration: 1000 });
    expect(queue.toasts[2]?.expiresAt).toBe(350);
    expect(queue.toasts[2]).not.toHaveProperty("duration");
  });

  it("dismisses one toast or all, and keeps the same queue when nothing changes", () => {
    let queue = addToast(addToast(emptyToastQueue, ok, 0), ok, 0);
    expect(dismissToast(queue, 9)).toBe(queue);
    queue = dismissToast(queue, 1);
    expect(queue.toasts.map((toast) => toast.id)).toEqual([2]);
    queue = clearToasts(queue);
    expect(queue.toasts).toEqual([]);
    expect(clearToasts(queue)).toBe(queue);
    expect(addToast(queue, ok, 0).toasts[0]?.id).toBe(3);
  });

  it("expires toasts whose time is over, and tells when the soonest goes", () => {
    let queue = addToast(emptyToastQueue, ok, 0);
    queue = addToast(queue, ok, 1000);
    expect(nextToastExpiry(queue)).toBe(8000);
    expect(expireToasts(queue, 7999)).toBe(queue);
    queue = expireToasts(queue, 8000);
    expect(queue.toasts.map((toast) => toast.id)).toEqual([2]);
    expect(nextToastExpiry(queue)).toBe(9000);
    expect(nextToastExpiry(expireToasts(queue, 9000))).toBeUndefined();
  });

  it("keeps a toast whose duration is Infinity until it is dismissed", () => {
    const queue = addToast(emptyToastQueue, { ...ok, duration: Infinity }, 0);
    expect(nextToastExpiry(queue)).toBeUndefined();
    expect(expireToasts(queue, 1e12)).toBe(queue);
  });

  it("expires nothing while held, and moves each expiry on by the time it was held when let go", () => {
    let queue = addToast(emptyToastQueue, ok, 0);
    queue = holdToasts(queue, true, 1000);
    expect(holdToasts(queue, true, 1500)).toBe(queue);
    expect(nextToastExpiry(queue)).toBeUndefined();
    expect(expireToasts(queue, 20000)).toBe(queue);
    // Shown during the hold: held only from then.
    queue = addToast(queue, ok, 3000);
    queue = holdToasts(queue, false, 5000);
    expect(queue.heldSince).toBeUndefined();
    expect(queue.toasts.map((toast) => toast.expiresAt)).toEqual([8000 + 4000, 11000 + 2000]);
    expect(holdToasts(queue, false, 6000)).toBe(queue);
  });

  it("shows the newest few, oldest first, and folds the rest", () => {
    let queue = emptyToastQueue;
    for (let at = 0; at < 6; at += 1) queue = addToast(queue, ok, at);
    const { shown, more } = visibleToasts(queue);
    expect(shown.map((toast) => toast.id)).toEqual([3, 4, 5, 6]);
    expect(more).toBe(2);
    expect(visibleToasts(queue, 10)).toMatchObject({ more: 0 });
    expect(visibleToasts(queue, 1.5).shown.map((toast) => toast.id)).toEqual([6]);
    expect(visibleToasts(queue, Number.NaN).more).toBe(2);
    expect(visibleToasts(queue, Infinity).more).toBe(0);
  });
});
