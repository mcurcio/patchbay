// The queued changes in words (docs/components.md#queued-changes): a count in a status line there from the start, a slot
// for the app's Check, Save and Discard, and one row per change, its change Badge, its words, the reason when a check
// refused it, and a Drop button (docs/ux-rules.md#confirmation-and-undo, U50). The queue, and keeping only its net
// change, are the app's: the list draws the changes it is given, in order, and asks to drop one.
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import { Badge, Button } from "../../primitives";
import "./ChangeList.css";

/** What a queued change does; any other word is drawn neutrally, by itself. */
export type ChangeKind = "added" | "removed" | "renamed" | "changed" | (string & {});

/** One queued change. */
export type QueuedChange = {
  /** The app's id for the change, passed to `onDrop`. */
  id: string;
  /** What it does: its Badge's tone and word. */
  change: ChangeKind;
  /** What it changes, in the app's words ("mix-2", "Tone 1: left → mix-2: in"). */
  label: ReactNode;
  /** A second, quieter line: what changes ("gain 0.8 → 1.2", "was tone 1"). */
  detail?: ReactNode;
  /** Why a check refused it, in words; the row is marked until the queue changes. */
  refused?: string;
};

/** The list's own words, each replaceable. */
export interface ChangeListLabels {
  /** The Badge's word for each change it knows: "added", "removed", "renamed", "changed". */
  added: string;
  removed: string;
  renamed: string;
  changed: string;
  /** The count: "No changes", "1 change", "3 changes". */
  count: (count: number) => string;
  /** Each row's drop button: "Drop". It is described by the row's words, so several read apart. */
  drop: string;
  /** A refused row's reason: "Refused: " and the reason. */
  refused: (reason: string) => string;
}

export const defaultChangeListLabels: ChangeListLabels = {
  added: "added",
  removed: "removed",
  renamed: "renamed",
  changed: "changed",
  count: (count) => (count === 0 ? "No changes" : count === 1 ? "1 change" : `${String(count)} changes`),
  drop: "Drop",
  refused: (reason) => `Refused: ${reason}`,
};

export type ChangeListProps = Omit<ComponentPropsWithRef<"section">, "children"> & {
  /** The queued changes, in the order the app holds them (the newest last). */
  changes: readonly QueuedChange[];
  /** Asked for by a row's drop button, with its change's id. Without it, the rows have no drop button. */
  onDrop?: (id: string) => void;
  /** Slot at the header's far end: the app's Check, Save and Discard. */
  actions?: ReactNode;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<ChangeListLabels>;
};

/** The Badge's word: the list's own for a change it knows, and the change itself for one it does not. */
function changeWord(change: ChangeKind, words: ChangeListLabels): string {
  switch (change) {
    case "added":
      return words.added;
    case "removed":
      return words.removed;
    case "renamed":
      return words.renamed;
    case "changed":
      return words.changed;
    default:
      return change;
  }
}

function Row({
  change,
  onDrop,
  words,
}: {
  change: QueuedChange;
  onDrop: ((id: string) => void) | undefined;
  words: ChangeListLabels;
}) {
  const wordsId = useId();
  return (
    <li
      className="pb-change-row"
      data-change={change.change}
      data-refused={change.refused === undefined ? undefined : ""}
    >
      <Badge tone={change.change}>{changeWord(change.change, words)}</Badge>
      <div className="pb-change-words" id={wordsId}>
        <div className="pb-change-label">{change.label}</div>
        {change.detail !== undefined && change.detail !== null && (
          <div className="pb-change-detail">{change.detail}</div>
        )}
        {change.refused !== undefined && <div className="pb-change-refused">{words.refused(change.refused)}</div>}
      </div>
      {onDrop !== undefined && (
        <Button
          size="sm"
          className="pb-change-drop"
          aria-describedby={wordsId}
          onClick={() => {
            onDrop(change.id);
          }}
        >
          {words.drop}
        </Button>
      )}
    </li>
  );
}

/** Lists the queued changes in words, each with its Badge and a drop button, under their count and the app's actions. */
export function ChangeList({ changes, onDrop, actions, labels, className, ...rest }: ChangeListProps) {
  const words = { ...defaultChangeListLabels, ...labels };
  const countId = useId();
  return (
    <section
      {...rest}
      aria-labelledby={rest["aria-labelledby"] ?? (rest["aria-label"] === undefined ? countId : undefined)}
      className={className === undefined ? "pb-change-list" : `pb-change-list ${className}`}
      data-empty={changes.length === 0 ? "" : undefined}
    >
      <div className="pb-change-head">
        <p className="pb-change-count" id={countId} role="status">
          {words.count(changes.length)}
        </p>
        {actions !== undefined && <div className="pb-change-actions">{actions}</div>}
      </div>
      {changes.length > 0 && (
        <ul className="pb-change-rows">
          {changes.map((change) => (
            <Row key={change.id} change={change} onDrop={onDrop} words={words} />
          ))}
        </ul>
      )}
    </section>
  );
}
