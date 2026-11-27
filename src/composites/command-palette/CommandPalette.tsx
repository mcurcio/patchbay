// A command palette (docs/components.md#commands-and-keys): a search field over a list of the app's commands, drawn in a
// portal on <body>, centred near the top of the window or anchored at a point and kept inside it. Typing ranks the
// commands by their labels (rank.ts), the matched letters in <mark>; the arrows, Page Up and Page Down, Home and End
// move the active command and Enter runs it. The field is a combobox and the list a listbox, so the focus stays in the
// field the whole time. Escape, Tab, a press outside and the focus leaving ask the app to close it; closing gives the
// focus back to what had it before.
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { type Platform, ariaKeyShortcuts, keyLabel } from "../../hooks";
import { markRuns, rankCommands } from "./rank";
import "./CommandPalette.css";

/** One command in the palette. */
export type Command = {
  /** Unique among the commands; the active command is kept by it while the list changes. */
  id: string;
  /** What the command is called; the query is matched against it. */
  label: string;
  /** The heading it is listed under; groups are shown in the order they first appear. */
  group: string;
  /** Its key string, or several, shown through keyLabel ("Mod+K"); the palette does not bind them. */
  keys?: string | readonly string[];
  /** A second, quieter line: what it does, or what it acts on. Not matched. */
  hint?: string;
  /** Runs the command; the palette asks to close first. */
  run: () => void;
  /** Shown but skipped by the keys, and does nothing when pressed. */
  disabled?: boolean;
};

/** A point in the window's coordinates (client px), such as where a press happened. */
export type PalettePoint = { x: number; y: number };

export type CommandPaletteProps = {
  /** Whether the palette is shown; the app holds it. */
  open: boolean;
  /** Asked for on Escape, Tab, a press outside, the focus leaving, and before a command runs. */
  onClose: () => void;
  commands: readonly Command[];
  /** Anchors the palette's top-left corner at this point, kept inside the window; centred near the top without it. */
  at?: PalettePoint;
  /** The platform keys are drawn for; the browser's by default. */
  platform?: Platform;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<CommandPaletteLabels>;
  /** A class added to the palette's box. */
  className?: string;
};

/** The palette's own words, each replaceable. */
export interface CommandPaletteLabels {
  /** The palette's name for screen readers: "Commands". */
  palette: string;
  /** The field's placeholder: "Type a command". */
  placeholder: string;
  /** Shown when there are no commands at all: "No commands". */
  empty: ReactNode;
  /** Shown when the query matches none: "No command matches “query”". */
  noMatch: (query: string) => ReactNode;
  /** Replaces keyLabel's words for keys and modifiers ("Escape", "Ctrl"); none by default, keyLabel's own. */
  keyNames: Readonly<Record<string, string>>;
}

export const defaultCommandPaletteLabels: CommandPaletteLabels = {
  palette: "Commands",
  placeholder: "Type a command",
  empty: "No commands",
  noMatch: (query) => `No command matches “${query}”`,
  keyNames: {},
};

/** The anchored palette's size, held inside the window less the gutter. */
export const PALETTE_WIDTH = 320;
export const PALETTE_HEIGHT = 360;
/** How far the anchored palette stays from the window's edges. */
export const PALETTE_GUTTER = 8;

/**
 * Where an anchored palette goes: its top-left corner at the point, moved back inside the window (less the gutter)
 * where it would cross an edge, and made smaller when the window is smaller than the palette. The height is the
 * most it may take; a short list takes less.
 */
export function placePalette(
  at: PalettePoint,
  window: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  const width = Math.max(0, Math.min(PALETTE_WIDTH, window.width - 2 * PALETTE_GUTTER));
  const height = Math.max(0, Math.min(PALETTE_HEIGHT, window.height - 2 * PALETTE_GUTTER));
  const clamp = (value: number, size: number, room: number) =>
    Math.min(Math.max(value, PALETTE_GUTTER), Math.max(PALETTE_GUTTER, room - size - PALETTE_GUTTER));
  return { left: clamp(at.x, width, window.width), top: clamp(at.y, height, window.height), width, height };
}

/** How many rows Page Up and Page Down move when the list's rows cannot be measured. */
const fallbackPage = 8;

function useWindowSize(watch: boolean) {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (!watch) return undefined;
    const onResize = () => {
      setSize(read());
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [watch]);
  return size;
}

function OpenPalette({ onClose, commands, at, platform, labels, className }: Omit<CommandPaletteProps, "open">) {
  const words = { ...defaultCommandPaletteLabels, ...labels };
  const ids = useId();
  const listId = `${ids}-list`;
  const [query, setQuery] = useState("");
  const groups = useMemo(() => rankCommands(commands, query), [commands, query]);
  const flat = useMemo(() => groups.flatMap((group) => group.items.map((item) => item.command)), [groups]);
  const enabled = useMemo(() => flat.filter((command) => command.disabled !== true), [flat]);

  // The active command, by id; when it is gone (filtered out, disabled) the first enabled one takes its place.
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [queried, setQueried] = useState(query);
  if (queried !== query) {
    setQueried(query);
    setChosen(undefined);
  }
  const active = enabled.find((command) => command.id === chosen) ?? enabled[0];
  const optionId = (command: Command) => `${ids}-option-${flat.indexOf(command)}`;

  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus the field on opening; give the focus back on closing, unless it already went somewhere else on purpose.
  useLayoutEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    field.current?.focus();
    const owned = box.current;
    return () => {
      const now = document.activeElement;
      const lost = now === null || now === document.body || (owned?.contains(now) ?? false) || !now.isConnected;
      if (lost && before?.isConnected === true) before.focus();
    };
  }, []);

  useEffect(() => {
    if (active === undefined) return;
    const option = document.getElementById(optionId(active));
    // jsdom has no scrollIntoView.
    if (typeof option?.scrollIntoView === "function") option.scrollIntoView({ block: "nearest" });
    // optionId reads the list, which changes with active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const run = (command: Command) => {
    if (command.disabled === true) return;
    onCloseRef.current();
    command.run();
  };

  const pageSize = () => {
    // A resting row: the active one is written out whole, so it may be taller.
    const option =
      list.current?.querySelector<HTMLElement>('[role="option"]:not([aria-selected="true"])') ??
      list.current?.querySelector<HTMLElement>('[role="option"]');
    const rows =
      option && option.offsetHeight > 0 ? Math.floor((list.current?.clientHeight ?? 0) / option.offsetHeight) : 0;
    return Math.max(1, rows || fallbackPage);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const modified = event.altKey || event.ctrlKey || event.metaKey;
    const at = active === undefined ? -1 : enabled.indexOf(active);
    const last = enabled.length - 1;
    const move = (to: number) => {
      event.preventDefault();
      const next = enabled[Math.min(Math.max(to, 0), last)];
      if (next !== undefined) setChosen(next.id);
    };
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      case "Tab":
        // A combobox's popup closes on Tab; the focus goes back to where it came from.
        event.preventDefault();
        onCloseRef.current();
        return;
      case "Enter":
        if (modified) return;
        event.preventDefault();
        if (active !== undefined) run(active);
        return;
      case "ArrowDown":
        if (modified) return;
        move(at >= last ? 0 : at + 1);
        return;
      case "ArrowUp":
        if (modified) return;
        move(at <= 0 ? last : at - 1);
        return;
      case "PageDown":
        if (modified) return;
        move(at + pageSize());
        return;
      case "PageUp":
        if (modified) return;
        move(at - pageSize());
        return;
      case "Home":
        // Shift+Home and Shift+End stay with the field, to select its text.
        if (modified || event.shiftKey) return;
        move(0);
        return;
      case "End":
        if (modified || event.shiftKey) return;
        move(last);
        return;
      default:
        return;
    }
  };

  const windowSize = useWindowSize(at !== undefined);
  const placed = at === undefined ? undefined : placePalette(at, windowSize);
  const anchored = placed !== undefined;

  let body: ReactNode;
  if (commands.length === 0) body = words.empty;
  else if (flat.length === 0) body = words.noMatch(query.trim());

  return (
    <div
      className="pb-palette-layer"
      data-anchored={anchored ? "" : undefined}
      onMouseDown={(event) => {
        // Only a press that starts outside the palette.
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={box}
        className={className === undefined ? "pb-palette" : `pb-palette ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={words.palette}
        style={
          placed === undefined
            ? undefined
            : { position: "fixed", left: placed.left, top: placed.top, width: placed.width, maxHeight: placed.height }
        }
        onBlur={(event) => {
          const to = event.relatedTarget;
          if (to instanceof Node && !event.currentTarget.contains(to)) onCloseRef.current();
        }}
      >
        <input
          ref={field}
          className="pb-palette-field"
          type="text"
          role="combobox"
          aria-label={words.palette}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active === undefined ? undefined : optionId(active)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={words.placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <div
          ref={list}
          className="pb-palette-list"
          id={listId}
          role="listbox"
          aria-label={words.palette}
          hidden={flat.length === 0}
        >
          {groups.map((group, index) => {
            const headingId = `${ids}-group-${index}`;
            return (
              <div key={group.group} role="group" aria-labelledby={headingId} className="pb-palette-group">
                <div id={headingId} className="pb-palette-heading" role="presentation">
                  {group.group}
                </div>
                {group.items.map(({ command, indices }) => {
                  const id = optionId(command);
                  const keys =
                    command.keys === undefined ? [] : typeof command.keys === "string" ? [command.keys] : command.keys;
                  const selected = command === active;
                  return (
                    <div
                      key={command.id}
                      id={id}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={command.disabled === true ? true : undefined}
                      aria-keyshortcuts={keys.length === 0 ? undefined : ariaKeyShortcuts(keys, platform)}
                      className="pb-palette-option"
                      data-command-id={command.id}
                      onMouseDown={(event) => {
                        // Keep the focus in the field.
                        event.preventDefault();
                      }}
                      onPointerMove={() => {
                        if (command.disabled !== true && !selected) setChosen(command.id);
                      }}
                      onClick={() => {
                        run(command);
                      }}
                    >
                      <span className="pb-palette-text">
                        <span className="pb-palette-label">
                          {markRuns(command.label, indices).map((part, at) =>
                            part.marked ? <mark key={at}>{part.text}</mark> : part.text,
                          )}
                        </span>
                        {command.hint !== undefined && <span className="pb-palette-hint">{command.hint}</span>}
                      </span>
                      {keys.length > 0 && (
                        <span className="pb-palette-keys">
                          {keys.map((one) => (
                            <kbd key={one}>{keyLabel(one, { platform, names: words.keyNames })}</kbd>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* There from the start, so a screen reader hears the words when the list empties. */}
        <p className="pb-palette-empty" role="status">
          {body}
        </p>
      </div>
    </div>
  );
}

export function CommandPalette({ open, ...rest }: CommandPaletteProps) {
  if (!open) return null;
  return createPortal(<OpenPalette {...rest} />, document.body);
}
