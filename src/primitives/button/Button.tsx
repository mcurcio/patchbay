// A push button in the library's look. Its tone (neutral, primary, danger, or any other word, drawn neutral) and size
// are data attributes its stylesheet keys on. While busy it shows a Spinner over its words, which keep their place so
// the button keeps its width, says aria-busy, and ignores presses (it stays focusable, unlike a disabled button, so
// focus is not lost while a request is on its way).
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
};

export function Button({
  tone = "neutral",
  size = "md",
  busy = false,
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
  return (
    <button
      {...rest}
      // A submit or reset button is asked for by name; a bare button inside a form never submits it.
      type={type}
      className={className === undefined ? "pb-button" : `pb-button ${className}`}
      data-tone={tone}
      data-size={size}
      aria-busy={busy || undefined}
      aria-disabled={busy || rest["aria-disabled"] || undefined}
      onClick={click}
    >
      <span className="pb-button-content">{children}</span>
      {busy && <Spinner className="pb-button-spinner" />}
    </button>
  );
}
