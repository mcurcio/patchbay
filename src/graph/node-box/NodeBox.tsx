// A node's box (docs/graph.md#nodebox): the body of an app's own React Flow node type, a header (title, subtitle, a
// change's badge and a status slot), a line saying why the node is silent, its ports as PortRows, and a footer. Its
// sizes come from the --pb-node-* tokens, the same values as the geometry constants an app lays its nodes out with
// (nodeBoxSize), so a rendered box is the size the layout made room for.
import { useNodeId, useUpdateNodeInternals } from "@xyflow/react";
import { type ComponentPropsWithoutRef, type CSSProperties, type ReactNode, useEffect, useId, useRef } from "react";
import { Badge } from "../../primitives";
import { PortRow, type PortRowProps } from "../port-row";
import type { NodePorts } from "./geometry";
import "./NodeBox.css";

/** A box's stripe down its start edge: an open enum, and one it does not know is drawn in `--pb-line-strong`. */
export type NodeBoxTone = "ok" | "warn" | "err" | "quiet" | "off" | "accent" | "muted" | (string & {});

/** An edit not yet applied: an open enum, and one it does not know is a plain border with its own string as the word. */
export type NodeBoxChange = "added" | "removed" | "renamed" | "changed" | (string & {});

/** The box's own words, each replaceable: the change badge's word for each known change. */
export interface NodeBoxLabels {
  added: string;
  removed: string;
  renamed: string;
  changed: string;
}

export const defaultNodeBoxLabels: NodeBoxLabels = {
  added: "added",
  removed: "removed",
  renamed: "renamed",
  changed: "changed",
};

/** One port of a box: a `PortRow`'s props without `side`, which `NodeBox` sets. */
export type PortSpec = Omit<PortRowProps, "side">;

export type NodeBoxProps = Omit<ComponentPropsWithoutRef<"div">, "title" | "children" | "role"> & {
  /** The node's name, one line cut with an ellipsis; a string is also the header's tooltip. Names the box's group. */
  title: ReactNode;
  /** The second header line, muted: the node's type. */
  subtitle?: ReactNode;
  /** The stripe down the box's start edge, in the tone's colour; none, or one it does not know, in `--pb-line-strong`. */
  tone?: NodeBoxTone;
  /** A dashed border, the stripe hatched and the words muted. Drawing only: whether its ports connect is the app's. */
  disabled?: boolean;
  /** The border in `--pb-err` and the header on `--pb-err-soft`; the reason goes in `line`. */
  failed?: boolean;
  /** An edit not yet applied: a 2 px border in its tone and a badge with its word; `removed` strikes the title. */
  change?: NodeBoxChange;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<NodeBoxLabels>;
  /** A slot at the header's end (a `Pill`). */
  status?: ReactNode;
  /** One row under the header saying why the node is silent; a string is also its tooltip. */
  line?: ReactNode;
  /** The input ports, keyed by `id`. */
  inputs?: readonly PortSpec[];
  /** The output ports, keyed by `id`. */
  outputs?: readonly PortSpec[];
  /** `stacked` (the default: the inputs' rows, then the outputs') or `side-by-side` (two columns). */
  ports?: NodePorts;
  /** A slot: one row at the foot (badges). */
  footer?: ReactNode;
  /** Selected, from React Flow's `NodeProps`: a 2 px outline in the accent. */
  selected?: boolean;
  /** Its width in px; `NODE_WIDTH` by default. */
  width?: number;
};

const knownChanges: readonly string[] = ["added", "removed", "renamed", "changed"];

/** Draws a node's box; render it inside a React Flow node. */
export function NodeBox({
  title,
  subtitle,
  tone,
  disabled = false,
  failed = false,
  change,
  labels,
  status,
  line,
  inputs = [],
  outputs = [],
  ports = "stacked",
  footer,
  selected = false,
  width,
  className,
  style,
  ...rest
}: NodeBoxProps) {
  const titleId = useId();
  const layout = ports === "side-by-side" ? "side-by-side" : "stacked";
  usePortsMeasured(inputs, outputs, layout);

  const words = { ...defaultNodeBoxLabels, ...labels };
  const changeWord =
    change === undefined ? undefined : knownChanges.includes(change) ? words[change as keyof NodeBoxLabels] : change;
  const hasPorts = inputs.length > 0 || outputs.length > 0;
  const inputRows = inputs.map((port) => <PortRow key={port.id} {...port} side="input" />);
  const outputRows = outputs.map((port) => <PortRow key={port.id} {...port} side="output" />);

  return (
    <div
      {...rest}
      className={className === undefined ? "pb-node-box" : `pb-node-box ${className}`}
      role="group"
      aria-labelledby={titleId}
      data-tone={tone}
      data-change={change}
      data-disabled={disabled ? "" : undefined}
      data-failed={failed ? "" : undefined}
      data-selected={selected ? "" : undefined}
      style={width === undefined ? style : ({ ...style, width: `${width}px` } satisfies CSSProperties)}
    >
      <div className="pb-node-header">
        <div className="pb-node-heading">
          <span id={titleId} className="pb-node-title" title={typeof title === "string" ? title : undefined}>
            {title}
          </span>
          {subtitle !== undefined && <span className="pb-node-subtitle">{subtitle}</span>}
        </div>
        {changeWord !== undefined && (
          <Badge tone={change ?? ""} className="pb-node-change">
            {changeWord}
          </Badge>
        )}
        {status !== undefined && <div className="pb-node-status">{status}</div>}
      </div>
      {line !== undefined && (
        <div className="pb-node-line" title={typeof line === "string" ? line : undefined}>
          {line}
        </div>
      )}
      {hasPorts &&
        (layout === "side-by-side" ? (
          <div className="pb-node-ports" data-ports="side-by-side">
            <div className="pb-node-column" data-side="input">
              {inputRows}
            </div>
            <div className="pb-node-column" data-side="output">
              {outputRows}
            </div>
          </div>
        ) : (
          <div className="pb-node-ports" data-ports="stacked">
            {inputRows}
            {outputRows}
          </div>
        ))}
      {footer !== undefined && <div className="pb-node-footer">{footer}</div>}
    </div>
  );
}

/**
 * Asks React Flow to measure the node's handles again when its ordered port ids or their layout change, so a handle
 * added or moved is where a wire meets it. React Flow measures a node's handles itself when the node first renders.
 */
function usePortsMeasured(inputs: readonly PortSpec[], outputs: readonly PortSpec[], layout: string) {
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();
  const key = JSON.stringify([layout, inputs.map((port) => port.id), outputs.map((port) => port.id)]);
  const measured = useRef(key);
  useEffect(() => {
    if (measured.current === key) return;
    measured.current = key;
    if (nodeId !== null) updateNodeInternals(nodeId);
  }, [key, nodeId, updateNodeInternals]);
}
