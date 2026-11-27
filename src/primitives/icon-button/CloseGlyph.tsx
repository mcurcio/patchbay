// The close glyph, a cross in the current text colour, hidden from screen readers: the one look for Close (what the
// person opened) and Dismiss (news that came by itself), always on an IconButton named by the word
// (docs/ux-rules.md#words, U30).
export function CloseGlyph() {
  return (
    <svg className="pb-close-glyph" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}
