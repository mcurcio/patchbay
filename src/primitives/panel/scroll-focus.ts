// Keeps a scrolling box reachable by keyboard: while its content overflows it is a tab stop (so the arrow keys and Page
// Up and Down scroll it), and while everything fits it is not, so a short panel adds no empty stop to the tab order.
import { useEffect, type RefObject } from "react";

/** Whether `box`'s content is taller or wider than the box. */
export function overflows(box: HTMLElement): boolean {
  return box.scrollHeight > box.clientHeight || box.scrollWidth > box.clientWidth;
}

/** Makes `ref`'s box focusable exactly while it overflows, watching its size and its content. */
export function useScrollFocus(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const box = ref.current;
    if (box === null) return;
    const settle = () => {
      if (overflows(box)) box.tabIndex = 0;
      else box.removeAttribute("tabindex");
    };
    settle();
    // jsdom has no ResizeObserver; the content watch still runs there.
    const sizes = typeof ResizeObserver === "function" ? new ResizeObserver(settle) : null;
    const observeChildren = () => {
      if (sizes === null) return;
      sizes.disconnect();
      sizes.observe(box);
      for (const child of box.children) sizes.observe(child);
    };
    observeChildren();
    const content = new MutationObserver(() => {
      observeChildren();
      settle();
    });
    content.observe(box, { childList: true, subtree: true, characterData: true });
    return () => {
      sizes?.disconnect();
      content.disconnect();
    };
  }, [ref]);
}
