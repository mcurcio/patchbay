// A state pill: a dot in the state's tone and the word beside it, so the state never rests on colour alone. A tone it
// does not know is drawn neutrally, by its own word.
import type { ReactNode } from "react";
import "./Pill.css";

/** The tones a pill draws; any other string is drawn neutrally. */
export type PillTone = "ok" | "warn" | "err" | "quiet" | "off" | "accent" | "muted" | (string & {});

export type PillProps = {
  /** The state's tone: the dot's and the word's colour. */
  tone: PillTone;
  /** The state in words, always shown beside the dot. */
  label: string;
  /** Pulses the dot (never the word) while the state is on its way, such as "starting"; stops under reduced motion. */
  pulse?: boolean;
  /** Shown on hover: what the state means or why it is so. */
  title?: string;
  /** After the word, in code type: a failure's code, say. */
  detail?: ReactNode;
  /** A class added to the pill. */
  className?: string;
};

/** Draws a state as a dot and its word, in the state's tone. */
export function Pill({ tone, label, pulse = false, title, detail, className }: PillProps) {
  return (
    <span
      className={className === undefined ? "pb-pill" : `pb-pill ${className}`}
      data-tone={tone}
      data-pulse={pulse ? "" : undefined}
      title={title}
    >
      <span className="pb-pill-dot" aria-hidden="true" />
      {label}
      {detail !== undefined && <code className="pb-pill-detail">{detail}</code>}
    </span>
  );
}
