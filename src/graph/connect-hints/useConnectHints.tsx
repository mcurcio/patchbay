// One rule for which ports may be joined (docs/graph.md#useconnecthints), used both for the hints every PortRow shows
// while a wire is dragged and for React Flow's own check on the drop. The state changes twice per drag, at its start
// and its end, never per pointer move; each candidate handle's verdict is asked of the rule once per drag and kept. A
// drop the rule refused is kept, with its reason, until the next drag begins, for the canvas's status line.
import type { Connection, Edge, OnConnectEnd, OnConnectStart } from "@xyflow/react";
import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PortHint, PortSide } from "../port-row";

/** One handle: its node's id and its handle id (`null` for a handle without one). */
export type PortRef = { nodeId: string; handleId: string | null };

/**
 * Whether a wire may join `from` (always the output) to `to` (always the input), whichever end the drag began at:
 * `true` accepts, `false` refuses, a string refuses and is the reason.
 */
export type CanConnect = (from: PortRef, to: PortRef) => boolean | string;

/** What one handle shows while a wire is dragged, and why when it refuses. */
export type PortHintOf = { hint: PortHint; reason?: string };

/** The drag in progress, as `<ConnectHints>` hands it to every `PortRow`; `null` while no wire is dragged. */
export type ConnectHintsValue = {
  /** The handle the drag began at, and its side. */
  origin: PortRef & { side: PortSide };
  /** The hint for one handle: `origin`, `ok` or `no` (with its reason) on the other side, `null` on the origin's. */
  hintFor: (port: PortRef, side: PortSide) => PortHintOf;
} | null;

/** A drop on a handle the rule refused: that handle, its side, and the rule's reason when it gave one. */
export type ConnectRefusal = { port: PortRef & { side: PortSide }; reason?: string };

/** The handlers `useConnectHints` gives `<ReactFlow>`. */
export type ConnectHintsFlowProps = {
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  isValidConnection: (connection: Edge | Connection) => boolean;
};

const ConnectHintsContext = createContext<ConnectHintsValue>(null);

/** Hands a drag's hints to every `PortRow` inside it. */
export function ConnectHints({ value, children }: { value: ConnectHintsValue; children?: ReactNode }) {
  return <ConnectHintsContext value={value}>{children}</ConnectHintsContext>;
}

/** The drag's hints from the nearest `<ConnectHints>`, or `null` outside one or while no wire is dragged. */
export function useConnectHintsValue(): ConnectHintsValue {
  return useContext(ConnectHintsContext);
}

const verdictKey = (from: PortRef, to: PortRef) => JSON.stringify([from.nodeId, from.handleId, to.nodeId, to.handleId]);

const samePort = (a: PortRef, b: PortRef) => a.nodeId === b.nodeId && a.handleId === b.handleId;

/**
 * Tracks a wire's drag from React Flow's connect start to its end and judges each candidate handle by `canConnect`.
 * `flowProps` goes to `<ReactFlow>` (through `mergeFlowProps` with others), `value` to `<ConnectHints>`.
 */
export function useConnectHints(canConnect: CanConnect): {
  value: ConnectHintsValue;
  /** The last drop the rule refused, until the next drag begins; `null` when the last drag ended otherwise. */
  refused: ConnectRefusal | null;
  flowProps: ConnectHintsFlowProps;
} {
  const rule = useRef(canConnect);
  useLayoutEffect(() => {
    rule.current = canConnect;
  });
  // The verdicts of the drag in progress, so each candidate is judged once per drag; none outside a drag.
  const verdicts = useRef<Map<string, boolean | string> | null>(null);
  const [origin, setOrigin] = useState<(PortRef & { side: PortSide }) | null>(null);
  const [refused, setRefused] = useState<ConnectRefusal | null>(null);

  const judge = useMemo(
    () =>
      (from: PortRef, to: PortRef): boolean | string => {
        const kept = verdicts.current;
        if (kept === null) return rule.current(from, to);
        const key = verdictKey(from, to);
        const known = kept.get(key);
        if (known !== undefined) return known;
        const verdict = rule.current(from, to);
        kept.set(key, verdict);
        return verdict;
      },
    [],
  );

  const flowProps = useMemo<ConnectHintsFlowProps>(
    () => ({
      onConnectStart: (_event, { nodeId, handleId, handleType }) => {
        if (nodeId === null) return;
        verdicts.current = new Map();
        setOrigin({ nodeId, handleId, side: handleType === "target" ? "input" : "output" });
        setRefused(null);
      },
      onConnectEnd: (_event, connection) => {
        // A drop on a handle of the other side that the rule refused; a drop on empty canvas, or on the origin's own
        // side (not a candidate), is no refusal.
        const { fromHandle, toHandle } = connection;
        let refusal: ConnectRefusal | null = null;
        if (fromHandle !== null && toHandle !== null && fromHandle.type !== toHandle.type) {
          const from: PortRef = { nodeId: fromHandle.nodeId, handleId: fromHandle.id ?? null };
          const to: PortRef = { nodeId: toHandle.nodeId, handleId: toHandle.id ?? null };
          const toInput = toHandle.type === "target";
          const verdict = toInput ? judge(from, to) : judge(to, from);
          if (verdict !== true) {
            const port = { ...to, side: toInput ? ("input" as const) : ("output" as const) };
            refusal = typeof verdict === "string" ? { port, reason: verdict } : { port };
          }
        }
        verdicts.current = null;
        setOrigin(null);
        setRefused(refusal);
      },
      isValidConnection: (connection) =>
        judge(
          { nodeId: connection.source, handleId: connection.sourceHandle ?? null },
          { nodeId: connection.target, handleId: connection.targetHandle ?? null },
        ) === true,
    }),
    [judge],
  );

  const value = useMemo<ConnectHintsValue>(() => {
    if (origin === null) return null;
    return {
      origin,
      hintFor: (port, side) => {
        if (side === origin.side) return { hint: samePort(port, origin) ? "origin" : null };
        const at: PortRef = { nodeId: origin.nodeId, handleId: origin.handleId };
        const verdict = side === "input" ? judge(at, port) : judge(port, at);
        if (verdict === true) return { hint: "ok" };
        return typeof verdict === "string" ? { hint: "no", reason: verdict } : { hint: "no" };
      },
    };
  }, [origin, judge]);

  return { value, refused, flowProps };
}
