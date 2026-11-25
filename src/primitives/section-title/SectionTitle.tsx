// A section's title in a panel or inspector, a heading with its actions (buttons, a count) at the far end. The
// heading's level fits the page it sits in.
import type { ReactNode } from "react";
import "./SectionTitle.css";

export type SectionTitleProps = {
  /** The title. */
  children: ReactNode;
  /** Slot at the title's far end: buttons, a count, a badge. */
  actions?: ReactNode;
  /** The heading's level, h2 to h6. */
  level?: 2 | 3 | 4 | 5 | 6;
  /** A class added to the title's row. */
  className?: string;
};

/** Draws a section's heading, with its actions at the far end. */
export function SectionTitle({ children, actions, level = 3, className }: SectionTitleProps) {
  const Heading = `h${level}` as const;
  return (
    <div className={className === undefined ? "pb-section-title" : `pb-section-title ${className}`}>
      <Heading className="pb-section-title-text">{children}</Heading>
      {actions !== undefined && <div className="pb-section-title-actions">{actions}</div>}
    </div>
  );
}
