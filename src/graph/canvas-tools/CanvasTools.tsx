// A canvas's tools (docs/graph.md#canvastools), a child of the app's own <ReactFlow>: zoom, fit, and when the app
// gives them, tidy and the minimap, as one ToolGroup in React Flow's <Panel>, and React Flow's <MiniMap> while the
// minimap is on. The layout behind tidy and the minimap's state are the app's; the zoom and fit move the view through
// React Flow over --pb-motion-slow, at once under reduced motion.
import {
  type FitViewOptions,
  MiniMap,
  type Node,
  Panel,
  type PanelPosition,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react";
import type { ReactNode } from "react";
import { IconButton, ToolGroup } from "../../primitives";
import { slowMotionMs } from "./motion";
import "./CanvasTools.css";

/** The tools' words, each replaceable. */
export interface CanvasToolsLabels {
  /** The tool group's accessible name: "Canvas". */
  toolbar: string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  tidy: string;
  minimap: string;
}

export const defaultCanvasToolsLabels: CanvasToolsLabels = {
  toolbar: "Canvas",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fit: "Fit the view",
  tidy: "Tidy the layout",
  minimap: "Minimap",
};

/** The app's own key bindings for the tools, as `aria-keyshortcuts` values: shown, not bound. */
export type CanvasToolsShortcuts = Partial<Record<"zoomIn" | "zoomOut" | "fit" | "tidy" | "minimap", string>>;

export type CanvasToolsProps<NodeType extends Node = Node> = {
  /** Where the panel sits on the canvas, React Flow's `PanelPosition`: "bottom-left" by default. */
  position?: PanelPosition | (string & {});
  /** React Flow's fit options for the fit tool. */
  fitOptions?: FitViewOptions<NodeType>;
  /** Replaces the fit tool's own fit (pass useFollowFit's `fit`, so the tool also resumes following). */
  onFit?: () => void;
  /** The tidy tool, shown only when given: the layout is the app's. */
  onTidy?: () => void;
  /** Whether the minimap is on: the minimap tool is pressed and React Flow's <MiniMap> is drawn. */
  minimap?: boolean;
  /** The minimap tool, shown only when given: called with the state a press asks for. */
  onMinimap?: (next: boolean) => void;
  /** The class of each node's shape in the minimap, so the app colours it by the node's state. */
  minimapNodeClassName?: string | ((node: NodeType) => string);
  keyShortcuts?: CanvasToolsShortcuts;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<CanvasToolsLabels>;
  /** Added to the panel's own `pb-canvas-tools` class. */
  className?: string;
  /** More tools (IconButtons) after patchbay's. */
  children?: ReactNode;
};

const glyph = (path: string) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const glyphs = {
  zoomIn: glyph("M3 8h10M8 3v10"),
  zoomOut: glyph("M3 8h10"),
  fit: glyph("M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"),
  tidy: glyph("M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z"),
  minimap: glyph("M1.5 3h13v10h-13zM8.5 8h4v3h-4z"),
};

export function CanvasTools<NodeType extends Node = Node>({
  position = "bottom-left",
  fitOptions,
  onFit,
  onTidy,
  minimap = false,
  onMinimap,
  minimapNodeClassName,
  keyShortcuts,
  labels,
  className,
  children,
}: CanvasToolsProps<NodeType>) {
  const words = { ...defaultCanvasToolsLabels, ...labels };
  const flow = useReactFlow<NodeType>();
  const store = useStoreApi<NodeType>();
  const duration = () => slowMotionMs(store.getState().domNode);

  const tool = (name: keyof CanvasToolsShortcuts, act: () => void, pressed?: boolean) => {
    const keys = keyShortcuts?.[name];
    return (
      <IconButton
        label={words[name]}
        title={keys === undefined || keys === "" ? words[name] : `${words[name]} (${keys})`}
        aria-keyshortcuts={keys === "" ? undefined : keys}
        aria-pressed={pressed}
        onClick={act}
      >
        {glyphs[name]}
      </IconButton>
    );
  };

  return (
    <>
      <Panel
        position={position as PanelPosition}
        className={className === undefined ? "pb-canvas-tools" : `pb-canvas-tools ${className}`}
      >
        <ToolGroup label={words.toolbar}>
          {tool("zoomIn", () => void flow.zoomIn({ duration: duration() }))}
          {tool("zoomOut", () => void flow.zoomOut({ duration: duration() }))}
          {tool("fit", () => {
            if (onFit !== undefined) onFit();
            else void flow.fitView({ ...fitOptions, duration: duration() });
          })}
          {onTidy !== undefined && tool("tidy", onTidy)}
          {onMinimap !== undefined &&
            tool(
              "minimap",
              () => {
                onMinimap(!minimap);
              },
              minimap,
            )}
          {children}
        </ToolGroup>
      </Panel>
      {minimap && (
        <MiniMap<NodeType>
          className="pb-canvas-minimap"
          ariaLabel={words.minimap}
          nodeClassName={minimapNodeClassName}
        />
      )}
    </>
  );
}
