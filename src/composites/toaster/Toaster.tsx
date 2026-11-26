// A stack of toasts: short news that comes and goes (a refused edit, a lost connection, a saved file), each in its
// tone, with an optional action and a Dismiss button. The queue is the app's (useToasts holds one): the toaster draws
// the toasts it is given and says when the person dismisses one or holds the stack by hovering over or focusing in it.
// Each toast's words are their own live region, announced without its buttons: an err toast as an alert and every other as a status; the region itself is not a
// live region, so nothing is read twice. Escape on a focused toast dismisses it, and the focus moves to the toast
// beside it, or back to where it came from when none is left.
import { type ComponentPropsWithRef, type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import type { ToastAction, ToastTone } from "../../hooks";
import { Button } from "../../primitives";
import "./Toaster.css";

/** Where the stack sits; any other string is drawn inline. */
export type ToasterPlacement =
  "top-start" | "top" | "top-end" | "bottom-start" | "bottom" | "bottom-end" | "inline" | (string & {});

/** A toast as the toaster draws it; useToasts' toasts are these. */
export type ToasterToast = {
  id: number;
  tone: ToastTone;
  text: ReactNode;
  /** How many times it was shown, coalesced; above 1 it shows "×n". */
  count?: number;
  action?: ToastAction;
};

export type ToasterProps = Omit<ComponentPropsWithRef<"section">, "children"> & {
  /** The toasts shown, oldest first. */
  toasts: readonly ToasterToast[];
  /** How many older toasts are folded away, shown as "and n more". */
  more?: number;
  /** The person dismissed a toast (its button, its action, or Escape on it). */
  onDismiss: (id: number) => void;
  /** True while the person hovers over or is focused in the toasts, so the app holds their expiry. */
  onHold?: (held: boolean) => void;
  /**
   * A corner or edge of the nearest positioned container ("bottom-end" by default; start and end follow the text's
   * direction), or "inline": in the flow, where the app put it (in a canvas's own panel).
   */
  placement?: ToasterPlacement;
  /** The region's name, "Notifications" by default. */
  label?: string;
  /** The words on each Dismiss button, "Dismiss" by default. */
  dismissLabel?: string;
  /** The words for the folded toasts, "and n more" by default. */
  moreLabel?: (more: number) => ReactNode;
  /** What a screen reader reads for a count in place of "×n", "n times" by default. */
  countLabel?: (count: number) => string;
};

const placements = new Set(["top-start", "top", "top-end", "bottom-start", "bottom", "bottom-end", "inline"]);
const defaultMoreLabel = (more: number) => `and ${more} more`;
const defaultCountLabel = (count: number) => `${count} times`;

export function Toaster({
  toasts,
  more = 0,
  onDismiss,
  onHold,
  placement = "bottom-end",
  label = "Notifications",
  dismissLabel = "Dismiss",
  moreLabel = defaultMoreLabel,
  countLabel = defaultCountLabel,
  className,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: ToasterProps) {
  const ids = useId();
  const drawn = placements.has(placement) ? placement : "inline";
  const top = drawn.startsWith("top");
  // Nearest the edge is newest: at the top the newest comes first, in the reading order as on screen.
  const ordered = top ? [...toasts].reverse() : toasts;
  const empty = toasts.length === 0 && more <= 0;

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // A toast taken away under the pointer or the focus fires no leave or blur; with none left, the hold is let go.
  if (empty && (hovered || focused)) {
    setHovered(false);
    setFocused(false);
  }
  const held = hovered || focused;
  const latestHold = useRef(onHold);
  useLayoutEffect(() => {
    latestHold.current = onHold;
  });
  useLayoutEffect(() => {
    latestHold.current?.(held);
  }, [held]);
  useLayoutEffect(
    () => () => {
      latestHold.current?.(false);
    },
    [],
  );

  const list = useRef<HTMLOListElement>(null);
  // Where the focus came from into the toasts, so it goes back there when the last focused toast is dismissed.
  const cameFrom = useRef<HTMLElement | null>(null);
  // After a dismissal that held the focus: the toast to focus next, or null to send it back.
  const focusNext = useRef<number | null | undefined>(undefined);
  useLayoutEffect(() => {
    const next = focusNext.current;
    if (next === undefined) return;
    focusNext.current = undefined;
    // The toast beside the dismissed one, else any still shown (one unfolded from "and n more"), else back.
    const item =
      (next === null ? null : list.current?.querySelector<HTMLElement>(`[data-toast-id="${next}"]`)) ??
      list.current?.querySelector<HTMLElement>(".pb-toast");
    if (item !== null && item !== undefined) {
      item.focus();
      return;
    }
    const back = cameFrom.current;
    cameFrom.current = null;
    if (back?.isConnected === true) back.focus();
  });

  const dismiss = (id: number) => {
    if (list.current?.contains(document.activeElement) === true) {
      const at = ordered.findIndex((toast) => toast.id === id);
      focusNext.current = (ordered[at + 1] ?? ordered[at - 1])?.id ?? null;
    }
    onDismiss(id);
  };

  if (empty) return null;

  const moreLine = more > 0 && <p className="pb-toaster-more">{moreLabel(more)}</p>;
  return (
    <section
      {...rest}
      aria-label={rest["aria-label"] ?? label}
      className={className === undefined ? "pb-toaster" : `pb-toaster ${className}`}
      data-placement={drawn}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(false);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        const from = event.relatedTarget;
        if (!focused && from instanceof HTMLElement && !event.currentTarget.contains(from)) cameFrom.current = from;
        setFocused(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      {!top && moreLine}
      <ol className="pb-toaster-list" ref={list}>
        {ordered.map((toast) => {
          const textId = `${ids}-${toast.id}`;
          const count = toast.count ?? 1;
          return (
            <li
              key={toast.id}
              className="pb-toast"
              data-tone={toast.tone}
              data-toast-id={toast.id}
              tabIndex={-1}
              onKeyDown={(event) => {
                // Escape here is the toast's alone, so a sheet or dialog behind it does not also close.
                if (event.key !== "Escape" || event.defaultPrevented) return;
                event.preventDefault();
                event.stopPropagation();
                dismiss(toast.id);
              }}
            >
              <div className="pb-toast-text" id={textId} role={toast.tone === "err" ? "alert" : "status"}>
                {toast.text}
                {count > 1 && (
                  <span className="pb-toast-count">
                    <span aria-hidden="true"> ×{count}</span>
                    <span className="pb-toast-hidden">, {countLabel(count)}</span>
                  </span>
                )}
              </div>
              <div className="pb-toast-actions">
                {toast.action !== undefined && (
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.action?.run();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </Button>
                )}
                <Button
                  size="sm"
                  aria-describedby={textId}
                  onClick={() => {
                    dismiss(toast.id);
                  }}
                >
                  {dismissLabel}
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {top && moreLine}
    </section>
  );
}
