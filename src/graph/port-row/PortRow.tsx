// One port of a node (docs/graph.md#portrow): its React Flow handle at the box's edge and its words. NodeBox draws its
// rows with it; an app drawing a box of its own may use it alone, inside a React Flow node. React Flow's own handle
// classes stay on the handle, so its connection logic and connectionRadius work as on any handle.
import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import { WarnMark } from "../../primitives";
import "./PortRow.css";

/** Which side of the box a port is on: an input is a target handle on the left edge, an output a source on the right. */
export type PortSide = "input" | "output";

/**
 * What a port shows while a wire is dragged: `origin` the handle the drag began at, `ok` a handle that accepts it,
 * `no` one that refuses it, `null` no drag. An open enum; one it does not know is drawn as `null`.
 */
export type PortHint = "ok" | "no" | "origin" | null | (string & {});

export type PortRowProps = {
  /** The handle id, passed to React Flow's `<Handle id>` unchanged (the app's own scheme). */
  id: string;
  /** `input` (a target handle on the left edge) or `output` (a source handle on the right edge). */
  side: PortSide;
  /** The port's name; a string is also its tooltip. */
  label: ReactNode;
  /** After the label in the muted code face: the port's type. */
  typeLabel?: ReactNode;
  /** While a wire is dragged: `origin`, `ok`, `no`, or `null` for no drag. */
  hint?: PortHint;
  /** Why the port refuses the wire: the handle's and the row's tooltip while `hint` is `no`. */
  reason?: string;
  /** A problem with the port: a warning mark beside the label, with these as its words. */
  problem?: string;
  /** A slot at the row's inner end, toward the box's centre (a `Meter`). */
  trailing?: ReactNode;
  /** Whether a wire may start or end here; true by default (`<Handle isConnectable>`). */
  connectable?: boolean;
};

const knownHints: readonly string[] = ["ok", "no", "origin"];

/** Draws one port: its handle at the edge, its label and type, a problem's mark and a trailing slot. */
export function PortRow({
  id,
  side,
  label,
  typeLabel,
  hint = null,
  reason,
  problem,
  trailing,
  connectable = true,
}: PortRowProps) {
  const shown = hint !== null && knownHints.includes(hint) ? hint : undefined;
  const isInput = side !== "output";
  const refused = shown === "no" && reason !== undefined ? reason : undefined;
  return (
    <div
      className="pb-port-row"
      data-side={isInput ? "input" : "output"}
      data-hint={shown}
      title={refused ?? (typeof label === "string" ? label : undefined)}
    >
      <Handle
        id={id}
        type={isInput ? "target" : "source"}
        position={isInput ? Position.Left : Position.Right}
        isConnectable={connectable}
        className="pb-port-handle"
        data-hint={shown}
        title={refused}
      />
      <span className="pb-port-words">
        <span className="pb-port-label">{label}</span>
        {typeLabel !== undefined && <code className="pb-port-type">{typeLabel}</code>}
        {problem !== undefined && <WarnMark label={problem} title={problem} />}
      </span>
      {trailing !== undefined && <span className="pb-port-trailing">{trailing}</span>}
    </div>
  );
}
