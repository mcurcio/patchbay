// A canvas's tools (docs/graph.md#canvastools), a child of the app's own <ReactFlow>: zoom, fit, and when the app
// gives them, tidy and the minimap, as one ToolGroup in React Flow's <Panel>, and React Flow's <MiniMap> while the
// minimap is on. The layout behind tidy and the minimap's state are the app's; the zoom and fit move the view through
// React Flow over --pb-motion-slow, at once under reduced motion. The minimap can be dragged and wheeled, as React
// Flow's own pannable and zoomable minimap; every view move the person makes through the tools (a zoom tool, the
// minimap) is said through onViewMove, so useFollowFit's stop() can stop following (docs/ux-rules.md#the-view-and-the-canvas,
// U63): those moves are made by code, and React Flow gives them no event.
import {
  type FitViewOptions,
  MiniMap,
  type Node,
  Panel,
  type PanelPosition,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { Glyph, IconButton, ToolGroup } from "../../primitives";
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
  /**
   * The person moved the view through the tools: a press of a zoom tool, or a drag or wheel on the minimap that moved
   * it. Pass useFollowFit's `stop`, so these moves stop following as a pan or a wheel on the canvas does.
   */
  onViewMove?: () => void;
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
  <Glyph>
    <path d={path} />
  </Glyph>
);

const glyphs = {
  zoomIn: glyph("M3 8h10M8 3v10"),
  zoomOut: glyph("M3 8h10"),
  fit: glyph("M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"),
  tidy: glyph("M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z"),
  minimap: glyph("M2 3.5h12v9H2zM8.5 8h3.5v2.5H8.5z"),
};

export function CanvasTools<NodeType extends Node = Node>({
  position = "bottom-left",
  fitOptions,
  onFit,
  onViewMove,
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
  const onViewMoveRef = useRef(onViewMove);
  useLayoutEffect(() => {
    onViewMoveRef.current = onViewMove;
  });

  // A drag or wheel on the minimap moves the view by code (React Flow's minimap sets the viewport itself), so the canvas
  // gives that move no event. While a press on the minimap is down, or during a wheel on it, a change of the viewport
  // is the person's.
  useEffect(() => {
    if (!minimap) return;
    const element = store.getState().domNode?.querySelector<HTMLElement>(".pb-canvas-minimap");
    if (element === null || element === undefined) return;
    let pressed = false;
    let wheel: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      pressed = false;
    };
    const press = () => {
      pressed = true;
      window.addEventListener("pointerup", release, { once: true, capture: true });
      window.addEventListener("pointercancel", release, { once: true, capture: true });
    };
    const wheeled = () => {
      // React Flow's minimap zooms within the wheel's own dispatch; the next task is after it.
      clearTimeout(wheel);
      wheel = setTimeout(() => {
        wheel = undefined;
      }, 0);
    };
    element.addEventListener("pointerdown", press, true);
    element.addEventListener("wheel", wheeled, { capture: true, passive: true });
    const unsubscribe = store.subscribe((state, previous) => {
      if (!pressed && wheel === undefined) return;
      const [x, y, zoom] = state.transform;
      const [px, py, pzoom] = previous.transform;
      if (x !== px || y !== py || zoom !== pzoom) onViewMoveRef.current?.();
    });
    return () => {
      unsubscribe();
      clearTimeout(wheel);
      element.removeEventListener("pointerdown", press, true);
      element.removeEventListener("wheel", wheeled, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
    };
  }, [minimap, store]);

  const zoom = (move: "zoomIn" | "zoomOut") => {
    onViewMove?.();
    void flow[move]({ duration: duration() });
  };

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
          {tool("zoomIn", () => {
            zoom("zoomIn");
          })}
          {tool("zoomOut", () => {
            zoom("zoomOut");
          })}
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
          pannable
          zoomable
        />
      )}
    </>
  );
}
