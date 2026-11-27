// useConnectHints: the drag's origin and each candidate's verdict from one rule, the rule asked once per candidate per
// drag, from always the output, React Flow's check on the drop, the two state changes per drag, and PortRow reading
// the hints from <ConnectHints> (its own hint prop winning).
import { act, render, renderHook } from "@testing-library/react";
import { type Node, type NodeProps, Position, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { Profiler, type ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { PortRow, type PortRowProps } from "../port-row";
import { type CanConnect, ConnectHints, type ConnectHintsValue, useConnectHints } from "./useConnectHints";

beforeAll(installFlowMeasuring);

const event = new MouseEvent("mousedown");
const start = (
  hints: { current: ReturnType<typeof useConnectHints> },
  nodeId: string,
  handleId: string | null,
  side: "input" | "output",
) => {
  act(() => {
    hints.current.flowProps.onConnectStart(event, {
      nodeId,
      handleId,
      handleType: side === "input" ? "target" : "source",
    });
  });
};
/** A handle as React Flow's final connection state gives it; only its node, id and type are read. */
const handleAt = (nodeId: string, id: string | null, side: "input" | "output") => ({
  nodeId,
  id,
  type: side === "input" ? ("target" as const) : ("source" as const),
  x: 0,
  y: 0,
  position: side === "input" ? Position.Left : Position.Right,
  width: 10,
  height: 10,
});
type At = ReturnType<typeof handleAt>;
/** Ends the drag, dropped on `to` (a handle within reach) or on nothing, as React Flow's final state says. */
const end = (hints: { current: ReturnType<typeof useConnectHints> }, from: At | null = null, to: At | null = null) => {
  act(() => {
    hints.current.flowProps.onConnectEnd(event, { fromHandle: from, toHandle: to } as never);
  });
};
const hintOf = (value: ConnectHintsValue, nodeId: string, handleId: string, side: "input" | "output") =>
  value?.hintFor({ nodeId, handleId }, side);

/** Accepts audio to audio; refuses control with a reason and anything else plainly. */
const rule: CanConnect = (from, to) => {
  if (from.handleId === "out" && to.handleId === "in") return true;
  if (to.handleId === "side") return "Takes control, not audio";
  return false;
};

describe("useConnectHints", () => {
  it("has no hints while no wire is dragged", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    expect(result.current.value).toBeNull();
    expect(result.current.refused).toBeNull();
  });

  it("keeps a drop the rule refused, with its reason, until the next drag begins", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    const out = handleAt("a", "out", "output");
    start(result, "a", "out", "output");
    end(result, out, handleAt("b", "side", "input"));
    expect(result.current.refused).toEqual({
      port: { nodeId: "b", handleId: "side", side: "input" },
      reason: "Takes control, not audio",
    });
    start(result, "a", "out", "output");
    expect(result.current.refused).toBeNull();
    end(result, out, handleAt("b", "other", "input"));
    expect(result.current.refused).toEqual({ port: { nodeId: "b", handleId: "other", side: "input" } });
    // From an input, the rule is asked from the output, and the refusal names the output dropped on.
    start(result, "b", "side", "input");
    end(result, handleAt("b", "side", "input"), handleAt("a", "out", "output"));
    expect(result.current.refused).toEqual({
      port: { nodeId: "a", handleId: "out", side: "output" },
      reason: "Takes control, not audio",
    });
  });

  it("keeps no refusal for an accepted drop, a drop on nothing, or one on the origin's own side", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    const out = handleAt("a", "out", "output");
    for (const to of [handleAt("b", "in", "input"), null, handleAt("b", "out", "output")]) {
      start(result, "a", "out", "output");
      end(result, out, to);
      expect(result.current.refused).toBeNull();
    }
  });

  it("marks the origin, judges the other side and leaves the origin's side out", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    start(result, "a", "out", "output");
    const value = result.current.value;
    expect(value?.origin).toEqual({ nodeId: "a", handleId: "out", side: "output" });
    expect(hintOf(value, "a", "out", "output")).toEqual({ hint: "origin" });
    expect(hintOf(value, "b", "out", "output")).toEqual({ hint: null });
    expect(hintOf(value, "b", "in", "input")).toEqual({ hint: "ok" });
    expect(hintOf(value, "b", "side", "input")).toEqual({ hint: "no", reason: "Takes control, not audio" });
    expect(hintOf(value, "b", "other", "input")).toEqual({ hint: "no" });
  });

  it("asks the rule with the output first when the drag began at an input", () => {
    const canConnect = vi.fn<CanConnect>(() => true);
    const { result } = renderHook(() => useConnectHints(canConnect));
    start(result, "b", "in", "input");
    expect(hintOf(result.current.value, "a", "out", "output")).toEqual({ hint: "ok" });
    expect(canConnect).toHaveBeenCalledWith({ nodeId: "a", handleId: "out" }, { nodeId: "b", handleId: "in" });
  });

  it("asks the rule once per candidate per drag, hints and drop check together", () => {
    const canConnect = vi.fn<CanConnect>(() => true);
    const { result } = renderHook(() => useConnectHints(canConnect));
    start(result, "a", "out", "output");
    hintOf(result.current.value, "b", "in", "input");
    hintOf(result.current.value, "b", "in", "input");
    result.current.flowProps.isValidConnection({
      source: "a",
      sourceHandle: "out",
      target: "b",
      targetHandle: "in",
    });
    expect(canConnect).toHaveBeenCalledTimes(1);
    end(result);
    start(result, "a", "out", "output");
    hintOf(result.current.value, "b", "in", "input");
    expect(canConnect).toHaveBeenCalledTimes(2);
  });

  it("accepts React Flow's connection only when the rule says true", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    const check = result.current.flowProps.isValidConnection;
    expect(check({ source: "a", sourceHandle: "out", target: "b", targetHandle: "in" })).toBe(true);
    expect(check({ source: "a", sourceHandle: "out", target: "b", targetHandle: "side" })).toBe(false);
    expect(check({ source: "a", sourceHandle: "out", target: "b", targetHandle: "other" })).toBe(false);
  });

  it("reads a handle without an id as null", () => {
    const canConnect = vi.fn<CanConnect>(() => true);
    const { result } = renderHook(() => useConnectHints(canConnect));
    result.current.flowProps.isValidConnection({ source: "a", sourceHandle: null, target: "b", targetHandle: null });
    expect(canConnect).toHaveBeenCalledWith({ nodeId: "a", handleId: null }, { nodeId: "b", handleId: null });
  });

  it("clears the hints when the drag ends", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    start(result, "a", "out", "output");
    end(result);
    expect(result.current.value).toBeNull();
  });

  it("ignores a connect start without a node", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    act(() => {
      result.current.flowProps.onConnectStart(event, { nodeId: null, handleId: null, handleType: null });
    });
    expect(result.current.value).toBeNull();
  });

  it("keeps its flow props across renders and uses the newest rule", () => {
    const { result, rerender } = renderHook(({ canConnect }) => useConnectHints(canConnect), {
      initialProps: { canConnect: (): boolean | string => false },
    });
    const first = result.current.flowProps;
    rerender({ canConnect: () => true });
    expect(result.current.flowProps).toBe(first);
    expect(first.isValidConnection({ source: "a", sourceHandle: "out", target: "b", targetHandle: "in" })).toBe(true);
  });

  it("renders twice per drag, at its start and its end", () => {
    let renders = 0;
    const { result } = renderHook(() => useConnectHints(rule), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <Profiler id="hints" onRender={() => (renders += 1)}>
          {children}
        </Profiler>
      ),
    });
    const before = renders;
    start(result, "a", "out", "output");
    result.current.flowProps.isValidConnection({ source: "a", sourceHandle: "out", target: "b", targetHandle: "in" });
    end(result);
    expect(renders - before).toBe(2);
  });
});

type RowsNode = Node<{ rows: PortRowProps[] }, "rows">;
const nodeTypes = {
  rows: ({ data }: NodeProps<RowsNode>) => (
    <>
      {data.rows.map((row) => (
        <PortRow key={row.id} {...row} />
      ))}
    </>
  ),
};

/** Two nodes, `a` with an output and `b` with two inputs, inside the hints of a drag. */
function Canvas({ value, rows }: { value: ConnectHintsValue; rows?: PortRowProps[] }) {
  const nodes: RowsNode[] = [
    { id: "a", type: "rows", position: { x: 0, y: 0 }, data: { rows: [{ id: "out", side: "output", label: "out" }] } },
    {
      id: "b",
      type: "rows",
      position: { x: 300, y: 0 },
      data: {
        rows: rows ?? [
          { id: "in", side: "input", label: "in" },
          { id: "side", side: "input", label: "side" },
        ],
      },
    },
  ];
  return (
    <ConnectHints value={value}>
      <ReactFlowProvider>
        <div style={{ width: "800px", height: "600px" }}>
          <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
        </div>
      </ReactFlowProvider>
    </ConnectHints>
  );
}

const handleOf = (container: HTMLElement, nodeId: string, handleId: string) => {
  const found = container.querySelector<HTMLElement>(`[data-nodeid="${nodeId}"][data-handleid="${handleId}"]`);
  if (found === null) throw new Error(`no handle ${nodeId}/${handleId}`);
  return found;
};

describe("PortRow inside <ConnectHints>", () => {
  it("shows the drag's hints and a refusal's reason", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    start(result, "a", "out", "output");
    const { container } = render(<Canvas value={result.current.value} />);
    expect(handleOf(container, "a", "out")).toHaveAttribute("data-hint", "origin");
    expect(handleOf(container, "b", "in")).toHaveAttribute("data-hint", "ok");
    expect(handleOf(container, "b", "side")).toHaveAttribute("data-hint", "no");
    expect(handleOf(container, "b", "side")).toHaveAttribute("title", "Takes control, not audio");
  });

  it("shows no hint while no wire is dragged", () => {
    const { container } = render(<Canvas value={null} />);
    expect(handleOf(container, "b", "in")).not.toHaveAttribute("data-hint");
  });

  it("keeps a row's own hint over the drag's", () => {
    const { result } = renderHook(() => useConnectHints(rule));
    start(result, "a", "out", "output");
    const { container } = render(
      <Canvas
        value={result.current.value}
        rows={[
          { id: "in", side: "input", label: "in", hint: "no", reason: "Locked" },
          { id: "side", side: "input", label: "side", hint: null },
        ]}
      />,
    );
    expect(handleOf(container, "b", "in")).toHaveAttribute("data-hint", "no");
    expect(handleOf(container, "b", "in")).toHaveAttribute("title", "Locked");
    expect(handleOf(container, "b", "side")).not.toHaveAttribute("data-hint");
  });
});
