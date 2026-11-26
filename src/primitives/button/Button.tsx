// A push button in the library's look. Its tone (neutral, primary, danger, or any other word, drawn neutral) and size
// are data attributes its stylesheet keys on. While busy it shows a Spinner over its words, which keep their place so
// the button keeps its width, says aria-busy, and ignores presses (it stays focusable, unlike a disabled button, so
// focus is not lost while a request is on its way). With a busyLabel it shows those words beside the spinner instead,
// both labels stacked in one grid cell so the width is the wider of the two, and says the change in a polite live
// region beside it; a button named by aria-label (a glyph button) has no words to show, so busyLabel names it instead.
import type { ComponentPropsWithRef, MouseEvent } from "react";
import { Spinner } from "../spinner";
import "./Button.css";

/** What the button does, by colour: neutral (the default), primary (the one main action), danger; others draw neutral. */
export type ButtonTone = "neutral" | "primary" | "danger" | (string & {});

/** md (the default) or sm, the compact one for dense rows; others draw as md. On touch both are at least 36 px tall. */
export type ButtonSize = "md" | "sm" | (string & {});

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** A request is on its way: a spinner over the words, aria-busy, and presses ignored. */
  busy?: boolean;
  /** The words shown while busy ("Saving"), beside the spinner; the width holds at the wider label, and the change is
   * announced politely. On a button named by aria-label it replaces that name while busy. */
  busyLabel?: string;
};

export function Button({
  tone = "neutral",
  size = "md",
  busy = false,
  busyLabel,
  type = "button",
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  function click(event: MouseEvent<HTMLButtonElement>) {
    if (busy) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }
  const swaps = busyLabel !== undefined && busyLabel !== "";
  const named = rest["aria-label"] !== undefined;
  const button = (
    <button
      {...rest}
      // A submit or reset button is asked for by name; a bare button inside a form never submits it.
      type={type}
      className={className === undefined ? "pb-button" : `pb-button ${className}`}
      data-tone={tone}
      data-size={size}
      aria-busy={busy || undefined}
      aria-disabled={busy || rest["aria-disabled"] || undefined}
      aria-label={busy && swaps && named ? busyLabel : rest["aria-label"]}
      onClick={click}
    >
      {swaps && !named ? (
        // Both labels hold one grid cell, so the button is as wide as the wider; the one not shown is hidden from
        // sight and from the accessible name.
        <span className="pb-button-stack">
          <span className="pb-button-content" aria-hidden={busy || undefined}>
            {children}
          </span>
          <span className="pb-button-content pb-button-busy" aria-hidden={!busy || undefined}>
            <Spinner />
            {busyLabel}
          </span>
        </span>
      ) : (
        <>
          <span className="pb-button-content">{children}</span>
          {busy && <Spinner className="pb-button-spinner" />}
        </>
      )}
    </button>
  );
  if (!swaps) return button;
  // The live region is there from the start, so a change of its words is announced; it says the busy words when the
  // button turns busy and empties when it is done (the focused button's own name says the rest).
  return (
    <>
      {button}
      <span className="pb-button-announce" aria-live="polite">
        {busy ? busyLabel : ""}
      </span>
    </>
  );
}
