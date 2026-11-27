// The layout of a graph-editing app (docs/components.md#appshell): a top bar of slots, the canvas, an inspector at the
// inline end and a drawer along the bottom, filling the screen (100dvh) inside the safe-area insets. It keeps no data:
// the inspector's width, the drawer's height and whether each is open are the app's props, drawn within the shell's
// bounds (bounds.ts) and changed through callbacks. Below 760 px the inspector is a Sheet over the canvas's inline
// end, below 600 px one rising from the bottom (useMediaBreakpoint's widths). With the inspector's title or actions,
// the shell draws its one header row: a Panel's when wide, the sheet's own when narrow. The inspector's content is drawn
// once, into an element of its own that moves between the region and the sheet, so a draft held in it survives the
// window crossing a width (docs/components.md#appshell). The drawer's body stays mounted while it is closed, so what it
// holds (a draft, a caret, a scroll position) is still there when it opens.
import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useMediaBreakpoint } from "../../hooks";
import { IconButton, Panel, Sheet, Splitter } from "../../primitives";
import { clampDrawerHeight, clampInspectorWidth, drawerBounds, drawerMaxHeight, inspectorBounds } from "./bounds";
import "./AppShell.css";

/**
 * The top bar's slots, drawn in reading order (left to right in left-to-right text): the brand, a status, the app's
 * controls, and controls at the far end.
 */
export type AppShellTopBar = {
  /** The app's mark or name, first. */
  brand?: ReactNode;
  /** A short state after the brand (a connection's Pill). */
  status?: ReactNode;
  /** The app's controls, taking the free width. */
  start?: ReactNode;
  /** Controls at the far end (a theme switch, a menu). */
  end?: ReactNode;
};

export type AppShellInspector = {
  /**
   * The inspector's heading (the selection's name). With it, or with `actions`, the shell draws the inspector's one
   * header row itself: a Panel's on a wide window, the sheet's own beside its close button on a narrow one, and
   * `content` is the body under it. Without either, `content` is drawn as given (usually a Panel).
   */
  title?: ReactNode;
  /** Slot at the far end of the inspector's header row (buttons, a count), before the sheet's close button. */
  actions?: ReactNode;
  /** What the inspector shows: its body under `title` and `actions`, or without them usually a Panel. */
  content: ReactNode;
  /** Whether it is shown; the app holds it. */
  open: boolean;
  /** Asked for with false when the person closes the narrow window's sheet (its close button, or Escape inside it). */
  onOpen: (open: boolean) => void;
  /** Its width in px, drawn within 280–560 px (`inspectorBounds`); a narrow window's sheet takes it too. */
  width: number;
  /** A new width from its splitter, in whole px within the bounds. */
  onWidth: (px: number) => void;
};

export type AppShellDrawer = {
  /** The drawer's header, beside its show and hide button; shown while it is closed too. */
  header: ReactNode;
  /** The drawer's body, mounted while it is closed. */
  content: ReactNode;
  /** Whether its body is shown; the app holds it. */
  open: boolean;
  /** Asked for by its show and hide button. */
  onOpen: (open: boolean) => void;
  /** Its height in px while open, header included, drawn within 120 px and 70 % of the window (`drawerBounds`). */
  height: number;
  /** A new height from its splitter, in whole px within the bounds. */
  onHeight: (px: number) => void;
};

/** The shell's own words, each replaceable. */
export interface AppShellLabels {
  /** The inspector's name, as a region and as a sheet: "Inspector". */
  inspector: string;
  /** The drawer's name as a region: "Drawer". */
  drawer: string;
  /** The inspector's splitter: "Resize the inspector". */
  resizeInspector: string;
  /** The drawer's splitter: "Resize the drawer". */
  resizeDrawer: string;
  /** The drawer's button while it is closed: "Show the drawer". */
  showDrawer: string;
  /** The drawer's button while it is open: "Hide the drawer". */
  hideDrawer: string;
  /** The inspector sheet's close button: "Close". */
  close: string;
}

export const defaultAppShellLabels: AppShellLabels = {
  inspector: "Inspector",
  drawer: "Drawer",
  resizeInspector: "Resize the inspector",
  resizeDrawer: "Resize the drawer",
  showDrawer: "Show the drawer",
  hideDrawer: "Hide the drawer",
  close: "Close",
};

export type AppShellProps = {
  /** The top bar's slots; without them there is no bar. */
  topBar?: AppShellTopBar;
  /** The inspector; without it there is none. */
  inspector?: AppShellInspector;
  /** The drawer; without it there is none. */
  drawer?: AppShellDrawer;
  /** The canvas, filling the workspace. */
  children: ReactNode;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<AppShellLabels>;
  /** A class added to the shell. */
  className?: string;
};

function subscribeToResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
  };
}

/** The window's height in px, kept current as it resizes; 0 with no window (the drawer then holds to its least). */
function useWindowHeight(): number {
  return useSyncExternalStore(
    subscribeToResize,
    () => window.innerHeight,
    () => 0,
  );
}

/** A chevron pointing up (show) or down (hide), in the current text colour. */
function DrawerGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d={open ? "M3 6l5 5 5-5" : "M3 10l5-5 5 5"} fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/** The element focused inside a content's holder as it left one slot, focused again in the next. */
const focusedIn = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Where the inspector's content shows: it moves the content's own element (the `holder`) in here while mounted, and out
 * again when it goes. A focus inside the content is kept across the move, as a moved element loses it.
 */
function InspectorSlot({ holder }: { holder: HTMLElement }) {
  const slot = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const here = slot.current;
    if (here === null) return;
    here.appendChild(holder);
    const back = focusedIn.get(holder);
    focusedIn.delete(holder);
    if (back !== undefined && holder.contains(back) && document.activeElement !== back)
      back.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && holder.contains(active)) focusedIn.set(holder, active);
      if (holder.parentNode === here) here.removeChild(holder);
    };
  }, [holder]);
  return <div ref={slot} className="pb-shell-inspector-slot" />;
}

function TopBar({ brand, status, start, end }: AppShellTopBar) {
  return (
    <header className="pb-shell-bar">
      {brand !== undefined && <div className="pb-shell-brand">{brand}</div>}
      {status !== undefined && <div className="pb-shell-status">{status}</div>}
      <div className="pb-shell-start">{start}</div>
      {end !== undefined && <div className="pb-shell-end">{end}</div>}
    </header>
  );
}

function Drawer({ drawer, words }: { drawer: AppShellDrawer; words: AppShellLabels }) {
  const bodyId = useId();
  const windowHeight = useWindowHeight();
  const height = clampDrawerHeight(drawer.height, windowHeight);
  return (
    <section
      className="pb-shell-drawer"
      aria-label={words.drawer}
      data-open={drawer.open ? "" : undefined}
      style={drawer.open ? { height: `${height}px` } : undefined}
    >
      {drawer.open && (
        <Splitter
          orientation="horizontal"
          edge="start"
          value={height}
          min={drawerBounds.min}
          max={drawerMaxHeight(windowHeight)}
          onChange={drawer.onHeight}
          label={words.resizeDrawer}
        />
      )}
      <div className="pb-shell-drawer-head">
        <div className="pb-shell-drawer-header">{drawer.header}</div>
        <IconButton
          className="pb-shell-drawer-toggle"
          label={drawer.open ? words.hideDrawer : words.showDrawer}
          aria-expanded={drawer.open}
          aria-controls={bodyId}
          onClick={() => {
            drawer.onOpen(!drawer.open);
          }}
        >
          <DrawerGlyph open={drawer.open} />
        </IconButton>
      </div>
      <div className="pb-shell-drawer-body" id={bodyId} hidden={!drawer.open}>
        {drawer.content}
      </div>
    </section>
  );
}

/** Lays out a graph editor: top bar, canvas, inspector and drawer, with a sheet for the inspector on narrow windows. */
export function AppShell({ topBar, inspector, drawer, children, labels, className }: AppShellProps) {
  const words = { ...defaultAppShellLabels, ...labels };
  const { width: layout } = useMediaBreakpoint();
  const width = inspector === undefined ? 0 : clampInspectorWidth(inspector.width);
  const wide = layout === "wide";
  const headed = inspector !== undefined && (inspector.title !== undefined || inspector.actions !== undefined);
  // The content's own element, made once (none without a document, where the content is drawn in place).
  const [holder] = useState(() => {
    if (typeof document === "undefined") return null;
    const element = document.createElement("div");
    element.className = "pb-shell-inspector-content";
    return element;
  });
  const shown = inspector?.open === true;
  const body = inspector === undefined ? null : holder === null ? inspector.content : <InspectorSlot holder={holder} />;
  // The content's events reach React through the shell, not the sheet around it, so the sheet's Escape is taken here:
  // the press is the sheet's when the window is narrow and not already handled (docs/ux-rules.md#escape, U14, U19).
  const onContentKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (wide || inspector === undefined) return;
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    inspector.onOpen(false);
  };
  return (
    <div
      className={className === undefined ? "pb-shell" : `pb-shell ${className}`}
      data-layout={layout}
      data-bar={topBar === undefined ? undefined : ""}
      data-drawer={drawer === undefined ? undefined : ""}
    >
      {topBar !== undefined && <TopBar {...topBar} />}
      <div className="pb-shell-main">
        <main className="pb-shell-workspace">
          {children}
          {inspector !== undefined && !wide && (
            <Sheet
              open={inspector.open}
              onClose={() => {
                inspector.onOpen(false);
              }}
              side={layout === "phone" ? "bottom" : "end"}
              title={inspector.title}
              label={words.inspector}
              actions={inspector.actions}
              width={width}
              labels={{ close: words.close }}
            >
              {body}
            </Sheet>
          )}
        </main>
        {inspector !== undefined && wide && inspector.open && (
          <aside className="pb-shell-inspector" aria-label={words.inspector} style={{ width: `${width}px` }}>
            <Splitter
              orientation="vertical"
              edge="start"
              value={width}
              min={inspectorBounds.min}
              max={inspectorBounds.max}
              onChange={inspector.onWidth}
              label={words.resizeInspector}
            />
            <div className="pb-shell-inspector-body">
              {headed ? (
                <Panel className="pb-shell-inspector-panel" title={inspector.title} actions={inspector.actions}>
                  {body}
                </Panel>
              ) : (
                body
              )}
            </div>
          </aside>
        )}
      </div>
      {drawer !== undefined && <Drawer drawer={drawer} words={words} />}
      {inspector !== undefined &&
        holder !== null &&
        shown &&
        createPortal(
          // A wrapper with no box of its own (display: contents), for the sheet's Escape.
          <div className="pb-shell-inspector-events" onKeyDown={onContentKeyDown}>
            {inspector.content}
          </div>,
          holder,
        )}
    </div>
  );
}
