// A square button that shows a glyph and is named by its label: the label is its accessible name and, unless a title
// is given, its tooltip, and the glyph is hidden from screen readers. Tone, size and busy are Button's.
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../button";
import "./IconButton.css";

export type IconButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  /** The button's name for screen readers, and its tooltip unless title says otherwise. */
  label: string;
  /** The glyph: an icon or a character, hidden from screen readers. */
  children: ReactNode;
};

export function IconButton({ label, title, className, children, ...rest }: IconButtonProps) {
  return (
    <Button
      {...rest}
      className={className === undefined ? "pb-icon-button" : `pb-icon-button ${className}`}
      aria-label={label}
      title={title ?? label}
    >
      <span className="pb-icon-button-glyph" aria-hidden="true">
        {children}
      </span>
    </Button>
  );
}
