// A badge: a short word or count in a rounded chip, tinted by its tone (a count of retries, a "not ready", a change
// not yet applied), outlined or filled. A tone it does not know is drawn neutrally.
import type { ReactNode } from "react";
import "./Badge.css";

/** The tones a badge draws; any other string is drawn neutrally. */
export type BadgeTone =
  | "ok"
  | "warn"
  | "err"
  | "quiet"
  | "off"
  | "accent"
  | "muted"
  | "added"
  | "removed"
  | "renamed"
  | "changed"
  | (string & {});

/** How a badge is drawn: outlined in its tone (the default), or filled with it. */
export type BadgeVariant = "outlined" | "filled";

export type BadgeProps = {
  /** The badge's tone: its text and border colour (outlined) or its fill (filled). */
  tone: BadgeTone;
  /** Outlined (the default): text and border in the tone. Filled: the tone's fill under on-strong text, for a fact that must stand out. */
  variant?: BadgeVariant;
  /** What the badge says: a word, a count, a WarnMark beside them. */
  children: ReactNode;
  /** Shown on hover: what the badge means. */
  title?: string;
  /** A class added to the badge. */
  className?: string;
};

/** Draws a short word or count in a chip of its tone. */
export function Badge({ tone, variant = "outlined", children, title, className }: BadgeProps) {
  return (
    <span
      className={className === undefined ? "pb-badge" : `pb-badge ${className}`}
      data-tone={tone}
      data-variant={variant === "filled" ? "filled" : undefined}
      title={title}
    >
      {children}
    </span>
  );
}
