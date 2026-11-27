// The close glyph, a cross in the current text colour, hidden from screen readers: the one look for Close (what the
// person opened) and Dismiss (news that came by itself), always on an IconButton named by the word
// (docs/ux-rules.md#words, U30). It is drawn on the one glyph grid (Glyph).
import { Glyph } from "../glyph";

export function CloseGlyph() {
  return (
    <Glyph className="pb-close-glyph">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </Glyph>
  );
}
