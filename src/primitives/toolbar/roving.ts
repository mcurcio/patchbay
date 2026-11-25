// Roving focus over a toolbar's items, pure DOM: which elements are items, which one holds the toolbar's one tab stop,
// and where an arrow key, Home or End moves the focus. Toolbar.tsx wires it to React.

/** What counts as an item: an enabled control, or anything that says it is a button, checkbox or radio. */
export const itemSelector = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
  '[role="switch"]',
].join(", ");

/** The toolbar's items, in document order, leaving out those of a toolbar nested inside it. */
export function items(toolbar: HTMLElement): HTMLElement[] {
  return [...toolbar.querySelectorAll<HTMLElement>(itemSelector)].filter(
    (item) => item.closest('[role="toolbar"]') === toolbar,
  );
}

/** Gives `current` the one tab stop (0) and every other item -1; with no current, the first item takes it. */
export function setTabStop(all: readonly HTMLElement[], current: HTMLElement | null): HTMLElement | null {
  const stop = current !== null && all.includes(current) ? current : (all[0] ?? null);
  for (const item of all) item.tabIndex = item === stop ? 0 : -1;
  return stop;
}

/**
 * The item a key moves the focus to from `index`, or undefined when the key is not the toolbar's. Horizontal toolbars
 * take the left and right arrows (swapped right to left), vertical ones up and down; both take Home and End. The ends
 * wrap around.
 */
export function moved(
  index: number,
  count: number,
  key: string,
  orientation: "horizontal" | "vertical",
  rtl: boolean,
): number | undefined {
  if (count === 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const [back, forth] =
    orientation === "vertical"
      ? ["ArrowUp", "ArrowDown"]
      : rtl
        ? ["ArrowRight", "ArrowLeft"]
        : ["ArrowLeft", "ArrowRight"];
  if (key === forth) return (index + 1) % count;
  if (key === back) return (index - 1 + count) % count;
  return undefined;
}

/** Whether a key pressed in `element` belongs to the text it edits (arrows, Home and End move its caret). */
export function editsText(element: Element): boolean {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "reset", "submit", "image", "color", "file", "range"].includes(
      element.type,
    );
  }
  return element instanceof HTMLElement && element.isContentEditable;
}
