// An empty canvas says what to do (docs/graph.md#emptycanvashint): the app's words (or its own, "This graph has no
// nodes yet."), and the add gestures with the app's add key or command, drawn on the canvas itself in React Flow's
// <Panel>, and gone with the first node (docs/ux-rules.md#states, U35). The gestures are said only beside a key or a
// command, so its words never name a pointer alone (U25). It reads
// React Flow's node count unless the app says whether the graph is empty. Its words are not a live region: the canvas
// says them while it is empty, and a node arriving is news the canvas shows. It takes no pointer events, so a
// double-click on it still reaches the canvas and adds.
import { Panel, type PanelPosition, type ReactFlowState, useStore } from "@xyflow/react";
import type { ReactNode } from "react";
import { keyLabel, type Platform, useMediaBreakpoint } from "../../hooks";
import "./EmptyCanvasHint.css";

/** The hint's own words, each replaceable. */
export interface EmptyCanvasHintLabels {
  /** What it says when the app gives no words of its own: "This graph has no nodes yet." */
  noNodes: string;
  /**
   * The add gestures with the app's other way to add: "Double-click to add a node" with a pointer, "Double-tap to add
   * a node" on a touch screen, then ", or press A" with the app's add key as people read it, or, with no key,
   * ", or use “Add node”" with its add command. Called only when the app names one of the two.
   */
  add: (gesture: "pointer" | "touch", keys: string | undefined, command: string | undefined) => string;
}

export const defaultEmptyCanvasHintLabels: EmptyCanvasHintLabels = {
  noNodes: "This graph has no nodes yet.",
  add: (gesture, keys, command) =>
    `${gesture === "touch" ? "Double-tap" : "Double-click"} to add a node, or ${keys === undefined ? `use “${command ?? ""}”` : `press ${keys}`}`,
};

export type EmptyCanvasHintProps = {
  /** The app's own words above the gestures; `labels.noNodes` ("This graph has no nodes yet.") by default. */
  children?: ReactNode;
  /** Whether the graph is empty; without it, while React Flow holds no nodes. An app drawing a ghost node passes it. */
  empty?: boolean;
  /** Whether adding is on, so the gestures are said (`useAddAt`'s `enabled`); true by default. */
  add?: boolean;
  /**
   * The app's add key (a key string, `"A"`), drawn through `keyLabel` after the gestures; the hint binds nothing.
   * Without it or `command` the gestures are not said.
   */
  keys?: string;
  /** The name of the app's add command, as its palette shows it ("Add node"), said when it has no `keys`. */
  command?: string;
  /** The platform the key is written for; the browser's by default. */
  platform?: Platform;
  /** Where it sits on the canvas, React Flow's `PanelPosition`: "top-center" by default. */
  position?: PanelPosition | (string & {});
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<EmptyCanvasHintLabels>;
  /** Added to the panel's own `pb-empty-canvas` class. */
  className?: string;
};

const noNodes = (state: ReactFlowState): boolean => state.nodes.length === 0;

/** Says, on an empty canvas, that it is empty and how to add; draws nothing once the graph has a node. */
export function EmptyCanvasHint({
  children,
  empty,
  add = true,
  keys,
  command,
  platform,
  position = "top-center",
  labels,
  className,
}: EmptyCanvasHintProps) {
  const words = { ...defaultEmptyCanvasHintLabels, ...labels };
  const none = useStore(noNodes);
  const { touch } = useMediaBreakpoint();
  if (!(empty ?? none)) return null;
  const gestures =
    add && (keys !== undefined || command !== undefined)
      ? words.add(touch ? "touch" : "pointer", keys === undefined ? undefined : keyLabel(keys, { platform }), command)
      : null;
  return (
    <Panel
      position={position as PanelPosition}
      className={className === undefined ? "pb-empty-canvas" : `pb-empty-canvas ${className}`}
    >
      <div className="pb-empty-canvas-words">{children ?? <p>{words.noNodes}</p>}</div>
      {gestures !== null && <p className="pb-empty-canvas-add">{gestures}</p>}
    </Panel>
  );
}
