// Status words: a short row of states, each a word in its tone (a pane's "3 errors · 1 warning · saved"), in the order
// the app gives, which is most urgent first. The row is one polite live region, so a screen reader reads a change
// when it is free. A tone it does not know is drawn neutrally.
import type { ComponentPropsWithRef } from "react";
import "./StatusWords.css";

/** The tones a word draws; any other string is drawn neutrally. */
export type StatusWordTone = "ok" | "warn" | "err" | "quiet" | "off" | (string & {});

export type StatusWord = {
  tone: StatusWordTone;
  /** The state in words. */
  label: string;
  /** Shown on hover: what the state means or why it is so. */
  title?: string;
};

export type StatusWordsProps = Omit<ComponentPropsWithRef<"ul">, "children"> & {
  /** The states, most urgent first; drawn in this order. */
  items: readonly StatusWord[];
};

export function StatusWords({ items, className, ...rest }: StatusWordsProps) {
  return (
    <ul
      aria-live="polite"
      {...rest}
      className={className === undefined ? "pb-status-words" : `pb-status-words ${className}`}
    >
      {items.map((item, index) => (
        <li key={`${String(index)}:${item.label}`} className="pb-status-word" data-tone={item.tone} title={item.title}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
