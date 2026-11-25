// A panel: a region of the page with an optional header (its title, and actions at the far end) over a body that
// scrolls on its own, as an inspector or a side panel. It draws no outer border: the layout that places it (a docked
// side, a sheet, a card) draws its edges. Its title names the region for screen readers. While its body overflows, the
// body is a tab stop, so the keyboard can scroll it.
import { useId, useRef, type ComponentPropsWithRef, type ReactNode } from "react";
import { useScrollFocus } from "./scroll-focus";
import "./Panel.css";

export type PanelProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  /** The panel's heading; it also names the region. Without one, name it with aria-label. */
  title?: ReactNode;
  /** Slot at the header's far end: buttons, a count, a close button. */
  actions?: ReactNode;
  /** The title's heading level, h1 to h6; h2 by default. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
};

/** Draws a titled region with its actions and a body that scrolls. */
export function Panel({ title, actions, level = 2, className, children, ...rest }: PanelProps) {
  const titleId = useId();
  const body = useRef<HTMLDivElement>(null);
  useScrollFocus(body);
  const Heading = `h${String(level)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const header = title !== undefined || actions !== undefined;
  return (
    <section
      {...rest}
      aria-labelledby={
        rest["aria-labelledby"] ?? (title !== undefined && rest["aria-label"] === undefined ? titleId : undefined)
      }
      className={className === undefined ? "pb-panel" : `pb-panel ${className}`}
    >
      {header && (
        <header className="pb-panel-header">
          {title !== undefined && (
            <Heading id={titleId} className="pb-panel-title">
              {title}
            </Heading>
          )}
          {actions !== undefined && <div className="pb-panel-actions">{actions}</div>}
        </header>
      )}
      <div ref={body} className="pb-panel-body">
        {children}
      </div>
    </section>
  );
}
