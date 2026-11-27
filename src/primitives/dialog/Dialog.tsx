// A modal dialog: drawn over the page (in a portal on <body>) above a scrim, with a title, a close button, the app's
// content and an optional row of actions. While it is open, Tab and Shift+Tab stay inside it and focus that wanders
// out is brought back; Escape, the close button and a press on the scrim ask the app to close it (onClose), and the
// app closes it by setting open to false. Opening focuses the content's first control (or one the content focused
// itself, as with autoFocus), else the dialog; the body is a tab stop of its own, so a long one scrolls from the
// keyboard; closing gives focus back to what had it before. Only the topmost of
// several open dialogs keeps the focus.
import { type ReactNode, type KeyboardEvent, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "../icon-button";
import { CloseGlyph } from "./CloseGlyph";
import "./Dialog.css";

/** The dialog's own words, each replaceable. */
export interface DialogLabels {
  /** The close button's name: "Close". */
  close: string;
}

export const defaultDialogLabels: DialogLabels = {
  close: "Close",
};

export type DialogProps = {
  /** Whether the dialog is shown; the app holds it. */
  open: boolean;
  /** Asked for on Escape, the close button and a press on the scrim. */
  onClose: () => void;
  /** The dialog's title, which also names it for screen readers. */
  title: ReactNode;
  children: ReactNode;
  /** A row at the foot of the dialog, for its buttons. */
  actions?: ReactNode;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<DialogLabels>;
  /** A class added to the dialog's box. */
  className?: string;
};

const focusable = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

/** The controls inside `root` that Tab reaches, in order. */
function tabbable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(focusable)].filter(
    (element) => element.closest("[hidden], [inert]") === null && element.tabIndex >= 0,
  );
}

/** Whether `box` is the topmost open dialog: each opens in a portal appended to <body>, so the last one is on top. */
function topmost(box: HTMLElement): boolean {
  const open = box.ownerDocument.querySelectorAll(".pb-dialog");
  return open[open.length - 1] === box;
}

function OpenDialog({ onClose, title, children, actions, labels, className }: Omit<DialogProps, "open">) {
  const words = { ...defaultDialogLabels, ...labels };
  const boxRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const box = boxRef.current;
    if (box === null) return undefined;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!box.contains(document.activeElement)) {
      const body = bodyRef.current;
      (body === null ? undefined : tabbable(body)[0])?.focus();
      if (!box.contains(document.activeElement)) box.focus();
    }
    const keepFocus = (event: FocusEvent) => {
      if (!topmost(box)) return;
      if (event.target instanceof Node && box.contains(event.target)) return;
      (tabbable(box)[0] ?? box).focus();
    };
    document.addEventListener("focusin", keepFocus);
    return () => {
      document.removeEventListener("focusin", keepFocus);
      if (before?.isConnected === true) before.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    // An Escape inside an input method's composition ends the composition, and only that
    // (docs/ux-rules.md#focus-and-keyboard, U14). The Tab trap holds during one, so the focus never leaves the modal.
    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab" || boxRef.current === null) return;
    const controls = tabbable(boxRef.current);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === boxRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="pb-dialog-scrim"
      onMouseDown={(event) => {
        // Only a press that starts on the scrim itself: a drag out of a text field does not close.
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={boxRef}
        className={className === undefined ? "pb-dialog" : `pb-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="pb-dialog-head">
          <h2 className="pb-dialog-title" id={titleId}>
            {title}
          </h2>
          <IconButton
            className="pb-dialog-close"
            label={words.close}
            onClick={() => {
              onCloseRef.current();
            }}
          >
            <CloseGlyph />
          </IconButton>
        </div>
        {/* Focusable, so a body that scrolls can be scrolled from the keyboard. */}
        <div ref={bodyRef} className="pb-dialog-body" tabIndex={0}>
          {children}
        </div>
        {actions === undefined ? null : <div className="pb-dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Dialog({ open, ...rest }: DialogProps) {
  if (!open) return null;
  return createPortal(<OpenDialog {...rest} />, document.body);
}
