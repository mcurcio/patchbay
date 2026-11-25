// The busy mark: an open ring in the current text colour that turns once per --pb-motion-spin, and under reduced
// motion stands still (the open ring is still the mark). Without a label it is decoration, hidden from screen
// readers, as inside a busy Button, whose own words and aria-busy say what is happening. With a label it is a status
// that screen readers announce.
import type { ComponentPropsWithRef } from "react";
import "./Spinner.css";

export type SpinnerProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  /** What is being waited for, read by screen readers; without it the spinner is hidden from them. */
  label?: string;
};

export function Spinner({ label, className, ...rest }: SpinnerProps) {
  const classes = className === undefined ? "pb-spinner" : `pb-spinner ${className}`;
  if (label === undefined || label === "") {
    return <span {...rest} className={classes} aria-hidden="true" />;
  }
  return (
    <span {...rest} className={`${classes} pb-spinner-labelled`} role="status">
      <span className="pb-spinner-ring" aria-hidden="true" />
      <span className="pb-spinner-label">{label}</span>
    </span>
  );
}
