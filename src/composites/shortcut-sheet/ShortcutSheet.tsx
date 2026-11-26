// The keys an app binds, listed in a Dialog (docs/components.md#commands-and-keys): one section per group, in the order
// the groups first appear, each a list of what a key does and the key as people read it (keyLabel). The sheet draws
// the list it is given and binds nothing; the app's useShortcuts table is usually where the list comes from.
import { type ReactNode, Fragment, useId } from "react";
import { type Platform, ariaKeyShortcuts, keyLabel } from "../../hooks";
import { Dialog } from "../../primitives";
import "./ShortcutSheet.css";

/** One line of the sheet. */
export type ShortcutLine = {
  /** The key string, or several that do the same ("Mod+K", ["Delete", "Backspace"]). */
  keys: string | readonly string[];
  /** What the key does. */
  label: string;
  /** The heading it is listed under. */
  group: string;
};

export type ShortcutSheetProps = {
  /** Whether the sheet is shown; the app holds it. */
  open: boolean;
  /** Asked for on Escape, the close button and a press on the scrim. */
  onClose: () => void;
  shortcuts: readonly ShortcutLine[];
  /** The dialog's title, "Keyboard shortcuts" by default. */
  title?: ReactNode;
  /** A note under the lists (where the keys do not act, say). */
  children?: ReactNode;
  /** Between two keys that do the same, "or" by default. */
  orLabel?: string;
  /** Shown when there are no shortcuts, "No shortcuts" by default. */
  emptyLabel?: ReactNode;
  /** The close button's name, "Close" by default. */
  closeLabel?: string;
  /** The platform keys are drawn for; the browser's by default. */
  platform?: Platform;
  /** Replaces keyLabel's words for keys and modifiers ("Escape", "Ctrl"). */
  keyNames?: Readonly<Record<string, string>>;
  /** A class added to the dialog's box. */
  className?: string;
};

/** The lines in groups, the groups in the order they first appear and each group's lines in the order given. */
export function groupShortcuts(shortcuts: readonly ShortcutLine[]): { group: string; lines: ShortcutLine[] }[] {
  const groups = new Map<string, ShortcutLine[]>();
  for (const line of shortcuts) {
    const lines = groups.get(line.group);
    if (lines === undefined) groups.set(line.group, [line]);
    else lines.push(line);
  }
  return [...groups.entries()].map(([group, lines]) => ({ group, lines }));
}

export function ShortcutSheet({
  open,
  onClose,
  shortcuts,
  title = "Keyboard shortcuts",
  children,
  orLabel = "or",
  emptyLabel = "No shortcuts",
  closeLabel = "Close",
  platform,
  keyNames,
  className,
}: ShortcutSheetProps) {
  const ids = useId();
  const groups = groupShortcuts(shortcuts);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={closeLabel}
      className={className === undefined ? "pb-shortcut-sheet" : `pb-shortcut-sheet ${className}`}
    >
      {groups.length === 0 && <p className="pb-shortcut-sheet-empty">{emptyLabel}</p>}
      {groups.map(({ group, lines }, index) => {
        const headingId = `${ids}-${index}`;
        return (
          <section key={group} className="pb-shortcut-sheet-group" aria-labelledby={headingId}>
            <h3 id={headingId} className="pb-shortcut-sheet-heading">
              {group}
            </h3>
            <dl className="pb-shortcut-sheet-list">
              {lines.map((line, at) => {
                const keys = typeof line.keys === "string" ? [line.keys] : line.keys;
                return (
                  <div key={`${line.label}-${at}`} className="pb-shortcut-sheet-line">
                    <dt>{line.label}</dt>
                    <dd aria-keyshortcuts={keys.length === 0 ? undefined : ariaKeyShortcuts(keys, platform)}>
                      {keys.map((one, n) => (
                        <Fragment key={one}>
                          {n > 0 && <span className="pb-shortcut-sheet-or"> {orLabel} </span>}
                          <kbd>{keyLabel(one, { platform, names: keyNames })}</kbd>
                        </Fragment>
                      ))}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
      {children !== undefined && <div className="pb-shortcut-sheet-note">{children}</div>}
    </Dialog>
  );
}
