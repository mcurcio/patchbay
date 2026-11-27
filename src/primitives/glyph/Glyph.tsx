// One glyph grid (docs/foundations.md#glyphs, F50): a glyph is drawn inside a 16 px box, its lines within the middle
// 12 px (from 2 to 14 in the box's own units), at a 1.75 stroke with round caps and joins, in the current text colour,
// hidden from screen readers (the control's name carries its meaning, F49). Every glyph of patchbay's is drawn with
// it, and an app's own glyphs drawn with it sit beside them.
import type { ComponentPropsWithRef, ReactNode } from "react";
import "./Glyph.css";

/** The glyph's box, in px: its width, its height and its viewBox's size. */
export const GLYPH_BOX = 16;
/** The part of the box a glyph's lines are drawn in, in px, centred: from 2 to 14 in the viewBox. */
export const GLYPH_DRAWN = 12;
/** The stroke every glyph is drawn at, in the box's units. */
export const GLYPH_STROKE = 1.75;

export type GlyphProps = Omit<ComponentPropsWithRef<"svg">, "viewBox" | "width" | "height"> & {
  /** The glyph's shapes (paths, circles) in a 16 by 16 viewBox, within 2 to 14; stroked unless a shape says otherwise. */
  children: ReactNode;
};

/** Draws a glyph on the one grid: a 16 px SVG box, stroked at 1.75 with round caps in the current colour. */
export function Glyph({ children, className, ...rest }: GlyphProps) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth={GLYPH_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
      className={className === undefined ? "pb-glyph" : `pb-glyph ${className}`}
      viewBox={`0 0 ${String(GLYPH_BOX)} ${String(GLYPH_BOX)}`}
      width={GLYPH_BOX}
      height={GLYPH_BOX}
    >
      {children}
    </svg>
  );
}
