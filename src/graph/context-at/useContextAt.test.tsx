// useContextAt on React Flow's own canvas: a right-click on the pane and on a node, a long-press on touch (timed by the
// hook, cancelled by a move past the slop, a second finger or a lift), Android's contextmenu during the press taken as
// that same long-press, the click after it swallowed, presses on a handle left alone, and switched off.
import { act, fireEvent, render } from "@testing-library/react";
import { Handle, type Node, type NodeProps, Position, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { mergeFlowProps } from "../connect-hints";
import { type ContextAtOptions, LONG_PRESS_MS, LONG_PRESS_SLOP, type OnContextAt, useContextAt } from "./useContextAt";

beforeAll(installFlowMeasuring);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function Box() {
  return (
    <div style={{ width: "100px", height: "40px" }}>
      <Handle type="source" id="out" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { box: Box as (props: NodeProps) => React.JSX.Element };
const nodes: Node[] = [{ id: "a", type: "box", position: { x: 0, y: 0 }, data: {}, width: 100, height: 40 }];

function Canvas({
  onContextAt,
  options,
  onPaneClick,
}: {
  onContextAt: OnContextAt;
  options?: ContextAtOptions;
  onPaneClick?: () => void;
}) {
  const { flowProps } = useContextAt(onContextAt, options);
  return (
    <div style={{ width: "800px", height: "600px" }}>
      <ReactFlow nodes={nodes} nodeTypes={nodeTypes} {...mergeFlowProps(flowProps, { onPaneClick })} />
    </div>
  );
}

const draw = (props: Parameters<typeof Canvas>[0]) => {
  const view = render(
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>,
  );
  const pane = view.container.querySelector<HTMLElement>(".react-flow__pane");
  const node = view.container.querySelector<HTMLElement>(".react-flow__node");
  const handle = view.container.querySelector<HTMLElement>(".react-flow__handle");
  if (pane === null || node === null || handle === null) throw new Error("no canvas");
  return { ...view, pane, node, handle };
};

const touch = (pointerId = 1, x = 200, y = 120, isPrimary = true) => ({
  pointerId,
  pointerType: "touch",
  isPrimary,
  clientX: x,
  clientY: y,
});

describe("useContextAt", () => {
  it("asks on a right-click on empty canvas, with the point, and prevents the browser's menu", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { pane } = draw({ onContextAt });
    const shown = fireEvent.contextMenu(pane, { clientX: 210, clientY: 130 });
    expect(shown).toBe(false);
    expect(onContextAt).toHaveBeenCalledTimes(1);
    const context = onContextAt.mock.calls[0]?.[0];
    expect(context?.at).toEqual({ x: 210, y: 130 });
    expect(context?.point).toEqual({ x: 210, y: 130 });
    expect(context?.by).toBe("contextmenu");
    expect(context).not.toHaveProperty("node");
  });

  it("gives the node a right-click was on", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { node } = draw({ onContextAt });
    fireEvent.contextMenu(node, { clientX: 20, clientY: 10 });
    expect(onContextAt.mock.calls[0]?.[0].node?.id).toBe("a");
  });

  it("asks once for a touch held still, at where it began, and swallows the click its lift makes", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const onPaneClick = vi.fn();
    const { pane } = draw({ onContextAt, onPaneClick });
    fireEvent.pointerDown(pane, touch());
    fireEvent.pointerMove(pane, touch(1, 200 + LONG_PRESS_SLOP - 2, 120));
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    });
    expect(onContextAt).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onContextAt).toHaveBeenCalledTimes(1);
    expect(onContextAt.mock.calls[0]?.[0]).toMatchObject({ at: { x: 200, y: 120 }, by: "long-press" });
    fireEvent.pointerUp(pane, touch());
    fireEvent.click(pane);
    expect(onPaneClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(pane, { ...touch(2), pointerType: "mouse" });
    fireEvent.click(pane);
    expect(onPaneClick).toHaveBeenCalledTimes(1);
  });

  it("swallows no click after a press elsewhere, when the long-press's lift made none", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { pane } = draw({ onContextAt });
    const outside = document.createElement("button");
    const onOutsideClick = vi.fn();
    outside.addEventListener("click", onOutsideClick);
    document.body.append(outside);
    fireEvent.pointerDown(pane, touch());
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onContextAt).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(pane, touch());
    fireEvent.pointerDown(outside, touch(2));
    fireEvent.click(outside);
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it("takes a contextmenu during the press as that long-press, asking once", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { node } = draw({ onContextAt });
    fireEvent.pointerDown(node, touch(1, 30, 20));
    fireEvent.contextMenu(node, { clientX: 31, clientY: 21 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onContextAt).toHaveBeenCalledTimes(1);
    expect(onContextAt.mock.calls[0]?.[0]).toMatchObject({ at: { x: 30, y: 20 }, by: "long-press" });
    expect(onContextAt.mock.calls[0]?.[0].node?.id).toBe("a");
  });

  it("does not ask for a touch that moves, lifts early, or gains a second finger", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { pane } = draw({ onContextAt });
    fireEvent.pointerDown(pane, touch());
    fireEvent.pointerMove(pane, touch(1, 200 + LONG_PRESS_SLOP + 1, 120));
    fireEvent.pointerDown(pane, touch(2));
    fireEvent.pointerUp(pane, touch(2));
    fireEvent.pointerUp(pane, touch(2));
    fireEvent.pointerDown(pane, touch(3));
    fireEvent.pointerDown(pane, touch(4, 300, 200, false));
    fireEvent.pointerDown(pane, touch(5));
    fireEvent.pointerCancel(pane, touch(5));
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    });
    expect(onContextAt).not.toHaveBeenCalled();
  });

  it("leaves a press on a handle alone, and a mouse's press to its right-click", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { handle, pane } = draw({ onContextAt });
    fireEvent.pointerDown(handle, touch());
    fireEvent.pointerUp(handle, touch());
    fireEvent.pointerDown(pane, { ...touch(), pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onContextAt).not.toHaveBeenCalled();
  });

  it("switched off, leaves the browser's menu and asks for nothing", () => {
    const onContextAt = vi.fn<OnContextAt>();
    const { pane } = draw({ onContextAt, options: { enabled: false } });
    expect(fireEvent.contextMenu(pane)).toBe(true);
    fireEvent.pointerDown(pane, touch());
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onContextAt).not.toHaveBeenCalled();
  });
});
