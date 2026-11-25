// A badge: a short word or count in a rounded chip, tinted by its tone (a count of retries, a "not ready"). A tone it
// does not know is drawn neutrally.
import type { ReactNode } from "react";
import "./Badge.css";

/** The tones a badge draws; any other string is drawn neutrally. */
export type BadgeTone = "ok" | "warn" | "err" | "quiet" | "off" | (string & {});

export type BadgeProps = {
  /** The badge's tone: its text and border colour, and for warn and err a soft surface. */
  tone: BadgeTone;
  /** What the badge says: a word, a count, a WarnMark beside them. */
  children: ReactNode;
  /** Shown on hover: what the badge means. */
  title?: string;
  /** A class added to the badge. */
  className?: string;
};

/** Draws a short word or count in a chip of its tone. */
export function Badge({ tone, children, title, className }: BadgeProps) {
  return (
    <span className={className === undefined ? "pb-badge" : `pb-badge ${className}`} data-tone={tone} title={title}>
      {children}
    </span>
  );
}
