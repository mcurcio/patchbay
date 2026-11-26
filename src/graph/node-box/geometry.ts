// A node box's geometry (docs/graph.md#geometry). An app sizes its nodes before they render (dagre and ELK take
// sizes), so the sizes are fixed: these constants are what layout code reads, and tokens.css holds the same values as
// --pb-node-* tokens, which NodeBox and PortRow size themselves from. geometry.test.ts holds each token equal to its
// constant, and tokens.test.ts fails on a brand that sets one.

/** The default width of a node box, in px; `NodeBox`'s `width` overrides it per node (`--pb-node-width`). */
export const NODE_WIDTH = 240;
/** The header (title and subtitle), with or without a subtitle, in px (`--pb-node-header`). */
export const NODE_HEADER = 46;
/** The `line` row, when there is one, in px (`--pb-node-line`). */
export const NODE_LINE = 22;
/** One port row, in px (`--pb-node-row`). */
export const NODE_ROW = 22;
/** The space above the first port row and below the last, in px (`--pb-node-pad`). */
export const NODE_PAD = 8;
/** The footer, when there is one, in px (`--pb-node-footer`). */
export const NODE_FOOTER = 28;
/** A handle's dot, in px (`--pb-node-handle`). */
export const HANDLE_SIZE = 10;
/** A handle's hit area, centred on the dot, in px (`--pb-node-handle-hit`); 32 px on a touch screen. */
export const HANDLE_HIT = 20;

/**
 * How a node box lays out its ports: `stacked` (the inputs' rows, then the outputs') or `side-by-side` (two columns,
 * row n of each on one line). An open enum; one it does not know is stacked.
 */
export type NodePorts = "stacked" | "side-by-side" | (string & {});

/** What decides a node box's size: its port counts, their layout, and whether it has a line and a footer. */
export type NodeBoxShape = {
  /** How many input ports. */
  inputs: number;
  /** How many output ports. */
  outputs: number;
  /** How the ports are laid out. */
  ports: NodePorts;
  /** Whether it has a `line` row. */
  line: boolean;
  /** Whether it has a footer. */
  footer: boolean;
  /** Its width in px; `NODE_WIDTH` by default. */
  width?: number;
};

/** How many port rows a box draws: inputs plus outputs stacked, the larger of the two side by side. */
export function nodePortRows(inputs: number, outputs: number, ports: NodePorts): number {
  return ports === "side-by-side" ? Math.max(inputs, outputs) : inputs + outputs;
}

/**
 * A node box's size in px, the one formula layout code sizes nodes with: the header, the line when there is one, the
 * port rows and the padding above and below them when there are ports, and the footer when there is one. The box's
 * 1 px border is inside it; the selection ring is outside.
 */
export function nodeBoxSize({ inputs, outputs, ports, line, footer, width = NODE_WIDTH }: NodeBoxShape): {
  width: number;
  height: number;
} {
  const rows = nodePortRows(Math.max(0, inputs), Math.max(0, outputs), ports);
  const height =
    NODE_HEADER + (line ? NODE_LINE : 0) + (rows > 0 ? 2 * NODE_PAD + rows * NODE_ROW : 0) + (footer ? NODE_FOOTER : 0);
  return { width, height };
}
