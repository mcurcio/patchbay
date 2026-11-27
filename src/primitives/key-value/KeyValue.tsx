// Facts as a two-column list of keys and values (a status summary, an inspector's details), drawn as a <dl> so each key
// names its value for screen readers. A row's tone colours its value; a tone it does not know draws it muted.
import type { ReactNode } from "react";
import "./KeyValue.css";

/** The tones a value draws in; any other string draws it muted. */
export type KeyValueTone = "ok" | "warn" | "err" | "quiet" | "off" | "accent" | "muted" | (string & {});

export type KeyValueRow = {
  /** The fact's name. */
  key: string;
  /** Its value. */
  value: ReactNode;
  /** Colours the value: a fact that is wrong or worth a look. */
  tone?: KeyValueTone;
  /** Shown on hover over the key: what the fact means. */
  title?: string;
};

export type KeyValueProps = {
  /** The facts, in order. */
  rows: readonly KeyValueRow[];
  /** Names the list for screen readers when no heading does. */
  label?: string;
  /** A class added to the list. */
  className?: string;
};

/** Draws facts as keys and their values, side by side. */
export function KeyValue({ rows, label, className }: KeyValueProps) {
  return (
    <dl className={className === undefined ? "pb-key-value" : `pb-key-value ${className}`} aria-label={label}>
      {rows.map((row, index) => (
        // Rows have no identity beyond their place; two may share a key.
        <div key={index} className="pb-key-value-row" data-tone={row.tone}>
          <dt title={row.title}>{row.key}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
