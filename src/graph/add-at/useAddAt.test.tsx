// useAddAt on React Flow's own canvas: a double-click on the empty pane adds at its point in flow coordinates and not
// on a node, a wire dropped on the pane where no handle took it adds with the port it came from (a touch drop read
// from changedTouches and the element under its end), a drop on a handle or off the pane adds nothing, `enabled`
// switches it off, and React Flow's zoom on double-click is off while adding is on and left to React Flow while off.
import { fireEvent, render, renderHook } from "@testing-library/react";
import { type FinalConnectionState, type Node, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { type OnAddAt, useAddAt } from "./useAddAt";

beforeAll(installFlowMeasuring);

afterEach(() => {
  vi.restoreAllMocks();
});

const nodes: Node[] = [{ id: "a", position: { x: 0, y: 0 }, data: { label: "a" }, width: 100, height: 40 }];

function Canvas({ onAddAt, enabled }: { onAddAt: OnAddAt; enabled?: boolean }) {
  const { flowProps } = useAddAt(onAddAt, { enabled });
  return (
    <div style={{ width: "800px", height: "600px" }}>
      <ReactFlow defaultNodes={nodes} defaultViewport={{ x: 100, y: 50, zoom: 2 }} {...flowProps} />
    </div>
  );
}

const inProvider = ({ children }: { children: ReactNode }) => <ReactFlowProvider>{children}</ReactFlowProvider>;

const pane = () => {
  const element = document.createElement("div");
  element.className = "react-flow__pane";
  document.body.append(element);
  return element;
};

/** A mouse up dispatched on `target`, as React Flow hands it to onConnectEnd. */
const mouseUpOn = (target: Element, clientX: number, clientY: number) => {
  let caught: MouseEvent | undefined;
  target.addEventListener("mouseup", (event) => (caught = event as MouseEvent), { once: true });
  target.dispatchEvent(new MouseEvent("mouseup", { clientX, clientY, bubbles: true }));
  if (caught === undefined) throw new Error("no event");
  return caught;
};

const dropped = { toHandle: null } as unknown as FinalConnectionState;
const onHandle = { toHandle: { id: "in", nodeId: "b", type: "target" } } as unknown as FinalConnectionState;

const startAt = (
  flowProps: ReturnType<typeof useAddAt>["flowProps"],
  nodeId: string,
  handleId: string | null,
  handleType: "source" | "target",
) => {
  flowProps.onConnectStart(new MouseEvent("mousedown"), { nodeId, handleId, handleType });
};

describe("useAddAt", () => {
  it("adds at a double-click on the empty pane, in flow coordinates, with no port", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { container } = render(
      <ReactFlowProvider>
        <Canvas onAddAt={onAddAt} />
      </ReactFlowProvider>,
    );
    const target = container.querySelector(".react-flow__pane");
    if (target === null) throw new Error("no pane");
    fireEvent.doubleClick(target, { clientX: 300, clientY: 250 });
    expect(onAddAt).toHaveBeenCalledExactlyOnceWith({ x: 100, y: 100 });
  });

  it("does not add at a double-click on a node", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { container } = render(
      <ReactFlowProvider>
        <Canvas onAddAt={onAddAt} />
      </ReactFlowProvider>,
    );
    const node = container.querySelector(".react-flow__node");
    if (node === null) throw new Error("no node");
    fireEvent.doubleClick(node, { clientX: 120, clientY: 60 });
    expect(onAddAt).not.toHaveBeenCalled();
  });

  it("adds nothing while switched off", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { container } = render(
      <ReactFlowProvider>
        <Canvas onAddAt={onAddAt} enabled={false} />
      </ReactFlowProvider>,
    );
    const target = container.querySelector(".react-flow__pane");
    if (target === null) throw new Error("no pane");
    fireEvent.doubleClick(target, { clientX: 300, clientY: 250 });
    expect(onAddAt).not.toHaveBeenCalled();
  });

  it("turns React Flow's zoom on double-click off", () => {
    const { result } = renderHook(() => useAddAt(vi.fn()), { wrapper: inProvider });
    expect(result.current.flowProps.zoomOnDoubleClick).toBe(false);
  });

  it("leaves the zoom on double-click to React Flow while switched off, and takes it again when on", () => {
    const { result, rerender } = renderHook(({ enabled }) => useAddAt(vi.fn(), { enabled }), {
      wrapper: inProvider,
      initialProps: { enabled: false },
    });
    expect("zoomOnDoubleClick" in result.current.flowProps).toBe(false);
    const off = result.current.flowProps;
    rerender({ enabled: true });
    expect(result.current.flowProps.zoomOnDoubleClick).toBe(false);
    expect(result.current.flowProps.onDoubleClick).toBe(off.onDoubleClick);
  });

  it("adds where a wire from an output is dropped on the pane, with its port", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { result } = renderHook(() => useAddAt(onAddAt), { wrapper: inProvider });
    startAt(result.current.flowProps, "a", "out", "source");
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 40, 30), dropped);
    expect(onAddAt).toHaveBeenCalledExactlyOnceWith({ x: 40, y: 30 }, { nodeId: "a", handleId: "out", side: "output" });
  });

  it("says the side of a wire dragged from an input", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { result } = renderHook(() => useAddAt(onAddAt), { wrapper: inProvider });
    startAt(result.current.flowProps, "b", null, "target");
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 5, 6), dropped);
    expect(onAddAt).toHaveBeenCalledWith({ x: 5, y: 6 }, { nodeId: "b", handleId: null, side: "input" });
  });

  it("adds nothing when a handle took the drop, or the drop is off the pane", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { result } = renderHook(() => useAddAt(onAddAt), { wrapper: inProvider });
    startAt(result.current.flowProps, "a", "out", "source");
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 40, 30), onHandle);
    const node = document.createElement("div");
    node.className = "react-flow__node";
    document.body.append(node);
    startAt(result.current.flowProps, "a", "out", "source");
    result.current.flowProps.onConnectEnd(mouseUpOn(node, 40, 30), dropped);
    expect(onAddAt).not.toHaveBeenCalled();
  });

  it("adds nothing for an end with no start, and forgets the start after each end", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { result } = renderHook(() => useAddAt(onAddAt), { wrapper: inProvider });
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 1, 1), dropped);
    startAt(result.current.flowProps, "a", "out", "source");
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 1, 1), dropped);
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 1, 1), dropped);
    expect(onAddAt).toHaveBeenCalledOnce();
  });

  it("reads a touch drop's end from changedTouches and the element under it", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const target = pane();
    const elementFromPoint = vi.fn(() => target);
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: elementFromPoint });
    const { result } = renderHook(() => useAddAt(onAddAt), { wrapper: inProvider });
    startAt(result.current.flowProps, "a", "out", "source");
    // A touch's end is on the element the touch began on (here a handle), so only the page can say what is under it.
    const touch = { changedTouches: [{ clientX: 70, clientY: 80 }], target: document.createElement("div") };
    result.current.flowProps.onConnectEnd(touch as unknown as TouchEvent, dropped);
    expect(elementFromPoint).toHaveBeenCalledWith(70, 80);
    expect(onAddAt).toHaveBeenCalledWith({ x: 70, y: 80 }, { nodeId: "a", handleId: "out", side: "output" });
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("adds no dropped wire while switched off", () => {
    const onAddAt = vi.fn<OnAddAt>();
    const { result } = renderHook(() => useAddAt(onAddAt, { enabled: false }), { wrapper: inProvider });
    startAt(result.current.flowProps, "a", "out", "source");
    result.current.flowProps.onConnectEnd(mouseUpOn(pane(), 40, 30), dropped);
    expect(onAddAt).not.toHaveBeenCalled();
  });

  it("keeps the same props across renders and calls the newest onAddAt", () => {
    const first = vi.fn<OnAddAt>();
    const second = vi.fn<OnAddAt>();
    const { result, rerender } = renderHook(({ add }) => useAddAt(add), {
      wrapper: inProvider,
      initialProps: { add: first },
    });
    const props = result.current.flowProps;
    rerender({ add: second });
    expect(result.current.flowProps).toBe(props);
    startAt(props, "a", "out", "source");
    props.onConnectEnd(mouseUpOn(pane(), 1, 2), dropped);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
