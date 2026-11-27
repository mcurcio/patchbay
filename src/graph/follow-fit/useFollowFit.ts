// Keeping the whole graph in view until the person takes the view over (docs/graph.md#usefollowfit). While following,
// the view fits again when the app's key changes or the canvas changes size, each time once every node is measured;
// a move the person makes (once it changes the viewport, not a press that moves nothing) stops it, as does stop(),
// and fit() fits and follows again. onFitted comes in the frame after each fit lands.
import {
  type FitViewOptions,
  type Node,
  type OnMove,
  type ReactFlowState,
  type Viewport,
  useReactFlow,
  useStore,
  useStoreApi,
} from "@xyflow/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { slowMotionMs } from "../canvas-tools/motion";

export type FollowFitOptions<NodeType extends Node = Node> = {
  /** The app's value that changes when nodes are added, removed or laid out; a change fits again while following. */
  key: unknown;
  /** React Flow's fit options, for every fit. */
  fitOptions?: FitViewOptions<NodeType>;
  /** Called with the viewport after each fit has landed, in the frame after the viewport is set. */
  onFitted?: (viewport: Viewport) => void;
};

/** The props `useFollowFit` gives `<ReactFlow>`. */
export type FollowFitFlowProps = { onMoveStart: OnMove; onMove: OnMove; onMoveEnd: OnMove };

export type FollowFit = {
  /** Whether the view fits again on its own: true from the start, false once the person moves the view. */
  following: boolean;
  /** Fits now, moving as the fit tool does, and follows again. */
  fit: () => void;
  /** Stops following, as the person's own move does: for an app that moves the view itself (going to a node). */
  stop: () => void;
  flowProps: FollowFitFlowProps;
};

/** Whether every node React Flow shows has been measured (none counts as all). */
const allMeasured = (state: ReactFlowState) => {
  for (const node of state.nodeLookup.values()) {
    if (node.hidden !== true && (node.measured.width === undefined || node.measured.height === undefined)) return false;
  }
  return true;
};

type Fitted = { key: unknown; width: number; height: number };

export function useFollowFit<NodeType extends Node = Node>({
  key,
  fitOptions,
  onFitted,
}: FollowFitOptions<NodeType>): FollowFit {
  const flow = useReactFlow<NodeType>();
  const store = useStoreApi();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const measured = useStore(allMeasured);
  const [following, setFollowing] = useState(true);
  const latest = useRef({ key, width, height, fitOptions, onFitted });
  useLayoutEffect(() => {
    latest.current = { key, width, height, fitOptions, onFitted };
  });
  // What the last fit was for, so a render that changes none of it does not fit again.
  const fittedFor = useRef<Fitted | null>(null);

  const land = useCallback(
    async (duration: number) => {
      // With no node there is nothing to fit, and the view stays; onFitted still says the layout is ready.
      if (store.getState().nodeLookup.size > 0) await flow.fitView({ ...latest.current.fitOptions, duration });
      requestAnimationFrame(() => {
        latest.current.onFitted?.(flow.getViewport());
      });
    },
    [flow, store],
  );

  useEffect(() => {
    if (!following || width === 0 || height === 0) return;
    // The store, not this render's `measured`, which only wakes the effect: nodes React Flow took in this commit (its
    // effects run before this one) are in the store but not yet measured, while this render still says all were.
    if (!allMeasured(store.getState())) return;
    const last = fittedFor.current;
    if (last !== null && Object.is(last.key, key) && last.width === width && last.height === height) return;
    fittedFor.current = { key, width, height };
    void land(0);
  }, [following, key, width, height, measured, store, land]);

  const fit = useCallback(() => {
    const now = latest.current;
    fittedFor.current = { key: now.key, width: now.width, height: now.height };
    setFollowing(true);
    void land(slowMotionMs(store.getState().domNode));
  }, [land, store]);

  const stop = useCallback(() => {
    setFollowing(false);
  }, []);

  // Where the person's move began. React Flow starts a move on every press on the pane, also one that moves nothing (a
  // click to deselect, a double-click to add), so following stops only once the person's move has changed the view.
  // Each step of the move counts, not only its end: d3-zoom folds a move by code that lands during the person's (a
  // fit landing mid-wheel) into the person's gesture, so the gesture can end where it began, the person's zoom undone
  // by the fit. A step or an end that changed nothing leaves the start in place: when the wheel interrupts a fit's
  // transition, d3-zoom ends the fit's move with the wheel as its event, after the wheel's own start (React Flow defers
  // each end a task). Each start with an event sets it afresh.
  const movedFrom = useRef<Viewport | null>(null);
  const flowProps = useMemo<FollowFitFlowProps>(() => {
    // A move made by code (a fit, a zoom from a tool, a minimap drag) has no event, so it does not count here; the
    // tools' moves the person asked for reach stop() through CanvasTools' onViewMove.
    const moved: OnMove = (event, viewport) => {
      const from = movedFrom.current;
      if (event === null || from === null) return;
      if (from.x === viewport.x && from.y === viewport.y && from.zoom === viewport.zoom) return;
      movedFrom.current = null;
      setFollowing(false);
    };
    return {
      onMoveStart: (event, viewport) => {
        if (event !== null) movedFrom.current = viewport;
      },
      onMove: moved,
      onMoveEnd: moved,
    };
  }, []);

  return { following, fit, stop, flowProps };
}
