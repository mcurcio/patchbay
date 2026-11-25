// The warning mark: an "!" in a circle beside words, for something that rose lately (a badge's or a counter's). The
// glyph is hidden from screen readers, which read its label instead.
import "./WarnMark.css";

export type WarnMarkProps = {
  /** What the mark means, read by screen readers in its place. */
  label: string;
  /** Shown on hover over the mark. */
  title?: string;
  /** A class added to the mark. */
  className?: string;
};

/** Draws a warning "!" for the eye and its words for screen readers. */
export function WarnMark({ label, title, className }: WarnMarkProps) {
  return (
    <>
      <span
        className={className === undefined ? "pb-warn-mark" : `pb-warn-mark ${className}`}
        aria-hidden="true"
        title={title}
      >
        !
      </span>
      <span className="pb-warn-mark-text">{label}</span>
    </>
  );
}
