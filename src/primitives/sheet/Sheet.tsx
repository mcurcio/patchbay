// A sheet: a panel drawn over its container's right edge or rising from its bottom, as an inspector is on a narrow
// window or a phone. It is not modal: the page around it stays live, and opening it does not take the focus (a
// selection on the canvas opens it while the person is still working there). Escape inside it and its close button
// ask the app to close it; if the focus was inside when it closes, it goes back to where it came from. The sheet is
// placed absolutely, so its container (the app's workspace) is positioned; the app holds open, and chooses the side
// (the right edge below 760 px, the bottom below 600 px).
import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type CSSProperties,
  useEffect,
  useId,
  useRef,
} from "react";
import { CloseGlyph } from "../dialog/CloseGlyph";
import { IconButton } from "../icon-button";
import "./Sheet.css";

export type SheetSide = "right" | "bottom";

/** The sheet's own words, each replaceable. */
export interface SheetLabels {
  /** The close button's name: "Close". */
  close: string;
}

export const defaultSheetLabels: SheetLabels = {
  close: "Close",
};

export type SheetProps = {
  /** Whether the sheet is shown; the app holds it. */
  open: boolean;
  /** Asked for on Escape inside the sheet and on its close button. */
  onClose: () => void;
  /** The edge it is drawn from: the right edge (the default) or the bottom. */
  side?: SheetSide;
  /** The sheet's title, which also names it for screen readers; without one, name it with `label`. */
  title?: ReactNode;
  /** The sheet's name for screen readers when it has no title. */
  label?: string;
  children: ReactNode;
  /** A right sheet's width in px, held to 280–560 px and to 48 px short of its container. */
  width?: number;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<SheetLabels>;
  /** A class added to the sheet. */
  className?: string;
};

function OpenSheet({
  onClose,
  side = "right",
  title,
  label,
  children,
  width,
  labels,
  className,
}: Omit<SheetProps, "open">) {
  const words = { ...defaultSheetLabels, ...labels };
  const sheetRef = useRef<HTMLElement>(null);
  const titleId = useId();
  /** Where the focus came from when it entered the sheet: it goes back there if the sheet closes holding it. */
  const cameFrom = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    return () => {
      const back = cameFrom.current;
      const active = document.activeElement;
      const held = active === null || active === document.body || (sheet?.contains(active) ?? false);
      if (held && back?.isConnected === true) back.focus();
    };
  }, []);

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) cameFrom.current = from;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const style = width === undefined ? undefined : ({ "--pb-sheet-width": `${width}px` } as CSSProperties);

  return (
    <section
      ref={sheetRef}
      className={className === undefined ? "pb-sheet" : `pb-sheet ${className}`}
      data-side={side}
      role="dialog"
      aria-labelledby={title === undefined ? undefined : titleId}
      aria-label={title === undefined ? label : undefined}
      style={style}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      <div className="pb-sheet-head">
        {title === undefined ? (
          <span className="pb-sheet-title" />
        ) : (
          <h2 className="pb-sheet-title" id={titleId}>
            {title}
          </h2>
        )}
        <IconButton className="pb-sheet-close" label={words.close} onClick={onClose}>
          <CloseGlyph />
        </IconButton>
      </div>
      {/* Focusable, so a body that scrolls can be scrolled from the keyboard. */}
      <div className="pb-sheet-body" tabIndex={0}>
        {children}
      </div>
    </section>
  );
}

export function Sheet({ open, ...rest }: SheetProps) {
  if (!open) return null;
  return <OpenSheet {...rest} />;
}
