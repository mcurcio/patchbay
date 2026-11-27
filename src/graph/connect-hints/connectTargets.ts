// The keyboard's path for connecting (docs/graph.md#connecttargets): the ports one port may be joined to, judged by the
// same rule and the same verdicts as the hints and the drop (useConnectHints), so the inspector's "Connect to" choice
// never offers what a drag would refuse (docs/ux-rules.md#live-pending-queued-refused, U56).
import type { PortSide } from "../port-row";
import type { CanConnect, PortRef } from "./useConnectHints";

/** A port that might be joined: its handle and its side. The app may carry more (a label, a type) on it. */
export type ConnectCandidate = PortRef & { side: PortSide };

/** The candidates the rule accepts for one port, and those it refuses with its reason when it gave one. */
export type ConnectTargets<T extends ConnectCandidate> = {
  /** The accepted candidates, in the order given: what a "Connect to" choice lists. */
  accepted: T[];
  /** The refused candidates on the other side, in the order given, each with the rule's string when it gave one. */
  refused: { port: T; reason?: string }[];
};

/**
 * Judges each candidate on the other side of `port` by `canConnect`, the output always first, as a drag would:
 * `true` accepts; `false` or a string refuses, the string being the reason. Candidates on `port`'s own side are not
 * candidates (React Flow's strict connection mode), and are in neither list. Each pair is asked of the rule once.
 */
export function connectTargets<T extends ConnectCandidate>(
  port: PortRef,
  side: PortSide,
  candidates: readonly T[],
  canConnect: CanConnect,
): ConnectTargets<T> {
  const accepted: T[] = [];
  const refused: { port: T; reason?: string }[] = [];
  const at: PortRef = { nodeId: port.nodeId, handleId: port.handleId };
  for (const candidate of candidates) {
    if (candidate.side === side) continue;
    const other: PortRef = { nodeId: candidate.nodeId, handleId: candidate.handleId };
    const verdict = side === "output" ? canConnect(at, other) : canConnect(other, at);
    if (verdict === true) accepted.push(candidate);
    else refused.push(typeof verdict === "string" ? { port: candidate, reason: verdict } : { port: candidate });
  }
  return { accepted, refused };
}
