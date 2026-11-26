// useFollowFit on React Flow's own canvas: it fits once every node is measured and calls onFitted after, fits again
// when the key changes or the canvas changes size and not when neither does, waits for new nodes to be measured,
// stops following on the person's own move (one with an event) but not on a move made by code, and fit() fits and
// follows again.
import { act, render, waitFor } from "@testing-library/react";
import { type Node, ReactFlow, ReactFlowProvider, useStoreApi, type Viewport } from "@xyflow/react";
import { useLayoutEffect } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { type FollowFit, useFollowFit } from "./useFollowFit";

beforeAll(installFlowMeasuring);

const sized = (id: string, x: number): Node => ({
  id,
  position: { x, y: 0 },
  data: { label: id },
  style: { width: "100px", height: "40px" },
});

type Seen = { current: FollowFit | null; store?: ReturnType<typeof useStoreApi> };

/** Hands the test what the hook returned and the canvas's store, after each render. */
function report(seen: Seen, follow: FollowFit, store: ReturnType<typeof useStoreApi>) {
  seen.current = follow;
  seen.store = store;
}

function Canvas({
  graphKey,
  nodes,
  onFitted,
  seen,
}: {
  graphKey: unknown;
  nodes: Node[];
  onFitted: (viewport: Viewport) => void;
  seen: Seen;
}) {
  const follow = useFollowFit({ key: graphKey, onFitted, fitOptions: { maxZoom: 1 } });
  const store = useStoreApi();
  useLayoutEffect(() => {
    report(seen, follow, store);
  });
  return (
    <div style={{ width: "800px", height: "600px" }}>
      <ReactFlow nodes={nodes} edges={[]} defaultViewport={{ x: 500, y: 500, zoom: 1 }} {...follow.flowProps} />
    </div>
  );
}

const draw = (graphKey: unknown, nodes: Node[], onFitted: (viewport: Viewport) => void, seen: Seen) => (
  <ReactFlowProvider>
    <Canvas graphKey={graphKey} nodes={nodes} onFitted={onFitted} seen={seen} />
  </ReactFlowProvider>
);

const one = [sized("a", 0)];
const two = [sized("a", 0), sized("b", 300)];

const follow = (seen: Seen) => {
  if (seen.current === null) throw new Error("not rendered");
  return seen.current;
};

describe("useFollowFit", () => {
  it("fits once at the start and calls onFitted with the fitted viewport", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    const viewport = onFitted.mock.calls[0]?.[0];
    expect(viewport?.x).not.toBe(500);
    expect(follow(seen).following).toBe(true);
  });

  it("fits again when the key changes, and not on a render that keeps it", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    const { rerender } = render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    rerender(draw(1, [...one], onFitted, seen));
    rerender(draw(2, two, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledTimes(2);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onFitted).toHaveBeenCalledTimes(2);
  });

  it("fits again when the canvas changes size", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      seen.store?.setState({ width: 400, height: 300 });
    });
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledTimes(2);
    });
  });

  it("stops following on the person's move and fits no more on a key change", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    const { rerender } = render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      follow(seen).flowProps.onMoveStart(new MouseEvent("mousedown"), { x: 0, y: 0, zoom: 1 });
      follow(seen).flowProps.onMoveEnd(new MouseEvent("mouseup"), { x: 40, y: 0, zoom: 1 });
    });
    expect(follow(seen).following).toBe(false);
    rerender(draw(2, two, onFitted, seen));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onFitted).toHaveBeenCalledOnce();
  });

  it("keeps following through a press that moves nothing (a click on the pane)", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    const { rerender } = render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      follow(seen).flowProps.onMoveStart(new MouseEvent("mousedown"), { x: 0, y: 0, zoom: 1 });
      follow(seen).flowProps.onMoveEnd(new MouseEvent("mouseup"), { x: 0, y: 0, zoom: 1 });
    });
    expect(follow(seen).following).toBe(true);
    rerender(draw(2, two, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledTimes(2);
    });
  });

  it("stops following when a fit by code lands during the person's move", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      const { onMoveStart, onMoveEnd } = follow(seen).flowProps;
      onMoveStart(new WheelEvent("wheel"), { x: 0, y: 0, zoom: 1 });
      onMoveStart(null, { x: 0, y: 0, zoom: 1 });
      onMoveEnd(null, { x: 10, y: 0, zoom: 1 });
      onMoveEnd(new WheelEvent("wheel"), { x: 10, y: 0, zoom: 1.5 });
    });
    expect(follow(seen).following).toBe(false);
  });

  it("stops following when the person's wheel interrupts a fit by code that was moving", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      const { onMoveStart, onMoveEnd } = follow(seen).flowProps;
      // d3-zoom's order: the fit's transition starts (no event); the wheel interrupts it, ending the fit's move with
      // the wheel as its event, and starts its own; React Flow defers each end a task, so the fit's end, unchanged,
      // comes after the wheel's start, and the wheel's own end, changed, last.
      onMoveStart(null, { x: 0, y: 0, zoom: 1 });
      onMoveStart(new WheelEvent("wheel"), { x: 5, y: 0, zoom: 1 });
      onMoveEnd(new WheelEvent("wheel"), { x: 5, y: 0, zoom: 1 });
      onMoveEnd(new WheelEvent("wheel"), { x: 5, y: 0, zoom: 1.5 });
    });
    expect(follow(seen).following).toBe(false);
  });

  it("stops following when a fit by code folded into the person's wheel brings the view back to where it began", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      const { onMoveStart, onMove, onMoveEnd } = follow(seen).flowProps;
      // d3-zoom folds the fit into the wheel's gesture: the fit's step carries the wheel as its event, and the
      // gesture ends where it began.
      const wheel = new WheelEvent("wheel");
      onMoveStart(wheel, { x: 0, y: 0, zoom: 1 });
      onMove(wheel, { x: -20, y: -10, zoom: 1.7 });
      onMove(wheel, { x: 0, y: 0, zoom: 1 });
      onMoveEnd(wheel, { x: 0, y: 0, zoom: 1 });
    });
    expect(follow(seen).following).toBe(false);
  });

  it("keeps following through a press whose steps move nothing", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      const { onMoveStart, onMove, onMoveEnd } = follow(seen).flowProps;
      onMoveStart(new MouseEvent("mousedown"), { x: 0, y: 0, zoom: 1 });
      onMove(new MouseEvent("mousemove"), { x: 0, y: 0, zoom: 1 });
      onMove(null, { x: 30, y: 0, zoom: 1 });
      onMoveEnd(new MouseEvent("mouseup"), { x: 0, y: 0, zoom: 1 });
    });
    expect(follow(seen).following).toBe(true);
  });

  it("stops following at stop(), as for an app that moves the view itself", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      follow(seen).stop();
    });
    expect(follow(seen).following).toBe(false);
  });

  it("keeps following through a move made by code", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      follow(seen).flowProps.onMoveStart(null, { x: 0, y: 0, zoom: 1 });
      follow(seen).flowProps.onMoveEnd(null, { x: 40, y: 0, zoom: 2 });
    });
    expect(follow(seen).following).toBe(true);
  });

  it("fits at fit() and follows again", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    const { rerender } = render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    act(() => {
      follow(seen).stop();
    });
    act(() => {
      follow(seen).fit();
    });
    expect(follow(seen).following).toBe(true);
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledTimes(2);
    });
    rerender(draw(2, two, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledTimes(3);
    });
  });

  it("waits until every node is measured", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    const { rerender } = render(draw(1, one, onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledOnce();
    });
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    if (original === undefined) throw new Error("no offsetWidth");
    // A node's box has no width until it is laid out, so React Flow cannot measure the new node yet; the rest
    // measure as installFlowMeasuring has them.
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains("react-flow__node") ? 0 : Number.parseFloat(this.style.width) || 1;
      },
    });
    rerender(draw(2, [...one, { id: "c", position: { x: 300, y: 0 }, data: { label: "c" } }], onFitted, seen));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onFitted).toHaveBeenCalledOnce();
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", original);
    rerender(draw(2, [...one, sized("d", 300)], onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledTimes(2);
    });
  });

  it("calls onFitted for an empty graph, with nothing to fit", async () => {
    const onFitted = vi.fn<(viewport: Viewport) => void>();
    const seen: Seen = { current: null };
    render(draw(1, [], onFitted, seen));
    await waitFor(() => {
      expect(onFitted).toHaveBeenCalledWith({ x: 500, y: 500, zoom: 1 });
    });
  });
});
