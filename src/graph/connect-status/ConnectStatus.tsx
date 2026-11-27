// The canvas's status line for connecting (docs/graph.md#connectstatus): while a wire is dragged it says why the port
// under the pointer (or the finger) refuses it, and after a drop the rule refused, the verdict, until the next drag
// begins (docs/ux-rules.md#live-pending-queued-refused, U59). Its words come from useConnectHints, the same rule as
// the ports' hints and the drop check, so it never says what they do not. It is one polite live region, there from
// the first render with no words (U42), in React Flow's <Panel>, and takes no pointer events.
import { Panel, type PanelPosition, type ReactFlowState, useStore } from "@xyflow/react";
import type { ConnectHintsValue, ConnectRefusal } from "../connect-hints";
import "./ConnectStatus.css";

/** The status line's words, each replaceable. */
export interface ConnectStatusLabels {
  /** Over a port that refuses the wire: the rule's reason, or "This port refuses the wire" when it gave none. */
  refuses: (reason: string | undefined) => string;
  /** After a drop the rule refused: "Not connected: " and the reason, or "Not connected: that port refuses the wire". */
  notConnected: (reason: string | undefined) => string;
}

export const defaultConnectStatusLabels: ConnectStatusLabels = {
  refuses: (reason) => reason ?? "This port refuses the wire",
  notConnected: (reason) => `Not connected: ${reason ?? "that port refuses the wire"}`,
};

export type ConnectStatusProps = {
  /** `useConnectHints`'s `value`: the drag in progress, or `null`. */
  value: ConnectHintsValue;
  /** `useConnectHints`'s `refused`: the last drop the rule refused, or `null`. */
  refused: ConnectRefusal | null;
  /** Where the line sits on the canvas, React Flow's `PanelPosition`: "bottom-center" by default. */
  position?: PanelPosition | (string & {});
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<ConnectStatusLabels>;
  /** Added to the panel's own `pb-connect-status` class. */
  className?: string;
};

/** The handle the drag is over (within React Flow's connection radius), as one string so a move within it is still. */
const overHandle = (state: ReactFlowState): string | null => {
  const connection = state.connection;
  if (!connection.inProgress || connection.toHandle === null) return null;
  const { nodeId, id, type } = connection.toHandle;
  return JSON.stringify([nodeId, id ?? null, type]);
};

/** What the line says now: why the port under the drag refuses, else a refused drop's verdict, else nothing. */
export function connectStatusWords(
  value: ConnectHintsValue,
  refused: ConnectRefusal | null,
  over: { nodeId: string; handleId: string | null; side: "input" | "output" } | null,
  labels: ConnectStatusLabels = defaultConnectStatusLabels,
): string {
  if (value !== null) {
    if (over === null) return "";
    const { hint, reason } = value.hintFor({ nodeId: over.nodeId, handleId: over.handleId }, over.side);
    return hint === "no" ? labels.refuses(reason) : "";
  }
  return refused === null ? "" : labels.notConnected(refused.reason);
}

export function ConnectStatus({ value, refused, position = "bottom-center", labels, className }: ConnectStatusProps) {
  const words = { ...defaultConnectStatusLabels, ...labels };
  const key = useStore(overHandle);
  let over: { nodeId: string; handleId: string | null; side: "input" | "output" } | null = null;
  if (key !== null) {
    const [nodeId, handleId, type] = JSON.parse(key) as [string, string | null, string];
    over = { nodeId, handleId, side: type === "target" ? "input" : "output" };
  }
  const text = connectStatusWords(value, refused, over, words);
  return (
    <Panel
      position={position as PanelPosition}
      className={className === undefined ? "pb-connect-status" : `pb-connect-status ${className}`}
    >
      <p className="pb-connect-status-text" role="status">
        {text}
      </p>
    </Panel>
  );
}
