// The busy mark: an open ring in the current text colour that turns once per --pb-motion-spin, and under reduced
// motion stands still (the open ring is still the mark). Without a label it is decoration, hidden from screen
// readers, as inside a busy Button, whose own words and aria-busy say what is happening. With a label it is a status
// that screen readers announce: the region is drawn empty in its first commit and takes the label in the next, as a
// region added with its words is not reliably read (docs/ux-rules.md#feedback, U42).
import { type ComponentPropsWithRef, useEffect, useState } from "react";
import "./Spinner.css";

export type SpinnerProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  /** What is being waited for, read by screen readers; without it the spinner is hidden from them. */
  label?: string;
};

export function Spinner({ label, className, ...rest }: SpinnerProps) {
  const classes = className === undefined ? "pb-spinner" : `pb-spinner ${className}`;
  const labelled = label !== undefined && label !== "";
  // Whether the region is in the page: false in the commit that adds it (the spinner's first with a label), true from
  // the next. Set from an effect on purpose: the label must reach the region in a commit after the region is there.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(labelled);
  }, [labelled]);
  if (!labelled) {
    return <span {...rest} className={classes} aria-hidden="true" />;
  }
  return (
    <span {...rest} className={`${classes} pb-spinner-labelled`} role="status">
      <span className="pb-spinner-ring" aria-hidden="true" />
      <span className="pb-spinner-label">{ready && label}</span>
    </span>
  );
}
