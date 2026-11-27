// A WAI-ARIA toolbar: a row (or column) of controls that is one tab stop, the arrow keys, Home and End moving the focus
// between its items (roving tabindex). The items are whatever controls its children render; the toolbar sets their
// tabIndex itself, so an item's own tabIndex is overwritten. The item last focused keeps the tab stop, and a text field
// inside keeps its own arrow keys. roving.ts holds the rules.
import { useEffect, useRef, type ComponentPropsWithRef, type FocusEvent, type KeyboardEvent } from "react";
import { editsText, items, moved, setTabStop } from "./roving";
import "./Toolbar.css";

export type ToolbarOrientation = "horizontal" | "vertical";

export type ToolbarProps = Omit<ComponentPropsWithRef<"div">, "role" | "aria-orientation"> & {
  /** The toolbar's accessible name, such as "Canvas". */
  label: string;
  /** horizontal (the default) moves with the left and right arrows; vertical with up and down. */
  orientation?: ToolbarOrientation;
};

/** Draws a group of controls as one tab stop, with the arrow keys moving between them. */
export function Toolbar({
  label,
  orientation = "horizontal",
  className,
  ref,
  onKeyDown,
  onFocus,
  children,
  ...rest
}: ToolbarProps) {
  const own = useRef<HTMLDivElement | null>(null);
  const current = useRef<HTMLElement | null>(null);

  // After every render, and whenever an item comes, goes or is enabled or disabled, one item holds the tab stop.
  useEffect(() => {
    const toolbar = own.current;
    if (toolbar === null) return;
    const settle = () => {
      current.current = setTabStop(items(toolbar), current.current);
    };
    settle();
    const watch = new MutationObserver(settle);
    watch.observe(toolbar, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "href"] });
    return () => {
      watch.disconnect();
    };
  });

  function focus(event: FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    const toolbar = own.current;
    if (toolbar === null) return;
    const all = items(toolbar);
    if (event.target instanceof HTMLElement && all.includes(event.target)) {
      current.current = setTabStop(all, event.target);
    }
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    const toolbar = own.current;
    if (event.defaultPrevented || toolbar === null || event.altKey || event.ctrlKey || event.metaKey) return;
    // A press inside an input method's composition is the input method's (docs/ux-rules.md#focus-and-keyboard, U14).
    if (event.nativeEvent.isComposing || event.key === "Process") return;
    if (editsText(event.target as Element)) return;
    const all = items(toolbar);
    const index = all.indexOf(event.target as HTMLElement);
    if (index === -1) return;
    const rtl = getComputedStyle(toolbar).direction === "rtl";
    const next = moved(index, all.length, event.key, orientation, rtl);
    if (next === undefined) return;
    event.preventDefault();
    all[next]?.focus();
  }

  return (
    <div
      {...rest}
      ref={(element) => {
        own.current = element;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
        return undefined;
      }}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      className={className === undefined ? "pb-toolbar" : `pb-toolbar ${className}`}
      onKeyDown={key}
      onFocus={focus}
    >
      {children}
    </div>
  );
}
