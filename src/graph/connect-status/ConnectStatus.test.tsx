// ConnectStatus on React Flow's own canvas: one polite live region there from the start with no words, why the port
// under the drag refuses (from the rule's verdict, through useConnectHints' value), a refused drop's verdict once the
// drag is over, nothing over an accepting port or the origin's side, its words through labels, and its stylesheet.
import { act, render, screen } from "@testing-library/react";
import { type Node, Position, ReactFlow, ReactFlowProvider, useStoreApi } from "@xyflow/react";
import { type ReactNode, useLayoutEffect } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import type { ConnectHintsValue, ConnectRefusal } from "../connect-hints";
import { ConnectStatus, connectStatusWords, defaultConnectStatusLabels } from "./ConnectStatus";
import css from "./ConnectStatus.css?raw";

beforeAll(installFlowMeasuring);

const nodes: Node[] = [{ id: "a", position: { x: 0, y: 0 }, data: { label: "a" }, width: 100, height: 40 }];

/** A drag from a's output: b's "in" accepts, "side" refuses with a reason, "other" plainly. */
const dragging: ConnectHintsValue = {
  origin: { nodeId: "a", handleId: "out", side: "output" },
  hintFor: (port, side) => {
    if (side === "output") return { hint: port.handleId === "out" ? "origin" : null };
    if (port.handleId === "in") return { hint: "ok" };
    if (port.handleId === "side") return { hint: "no", reason: "Takes control, not audio" };
    return { hint: "no" };
  },
};

type Store = ReturnType<typeof useStoreApi>;

function Grab({ seen }: { seen: { current: Store | null } }) {
  const store = useStoreApi();
  useLayoutEffect(() => {
    hand(seen, store);
  });
  return null;
}

function hand(seen: { current: Store | null }, store: Store) {
  seen.current = store;
}

function Canvas({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: "800px", height: "600px" }}>
        <ReactFlow defaultNodes={nodes}>{children}</ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

/** Puts the drag over one of b's inputs, as React Flow's connection state says while the pointer is within reach. */
const over = (store: Store | null, handleId: string | null, type: "source" | "target" = "target") => {
  act(() => {
    const state = store?.getState();
    store?.setState({
      connection: {
        inProgress: true,
        isValid: null,
        from: { x: 100, y: 20 },
        fromHandle: {
          nodeId: "a",
          id: "out",
          type: "source",
          x: 0,
          y: 0,
          position: Position.Right,
          width: 10,
          height: 10,
        },
        fromNode: state?.nodeLookup.get("a"),
        fromPosition: Position.Right,
        to: { x: 300, y: 20 },
        toNode: null,
        toPosition: Position.Left,
        pointer: { x: 300, y: 20 },
        toHandle:
          handleId === null
            ? null
            : { nodeId: "b", id: handleId, type, x: 0, y: 0, position: Position.Left, width: 10, height: 10 },
      } as never,
    });
  });
};

const status = () => screen.getByRole("status");

describe("ConnectStatus", () => {
  it("is a status region there from the start, with no words, in the bottom-centre panel", () => {
    const { container } = render(
      <Canvas>
        <ConnectStatus value={null} refused={null} />
      </Canvas>,
    );
    expect(status()).toBeEmptyDOMElement();
    expect(container.querySelector(".react-flow__panel.pb-connect-status.bottom.center")).not.toBeNull();
  });

  it("says why the port under the drag refuses, and nothing over one that accepts or over none", () => {
    const seen: { current: Store | null } = { current: null };
    render(
      <Canvas>
        <ConnectStatus value={dragging} refused={null} />
        <Grab seen={seen} />
      </Canvas>,
    );
    over(seen.current, "side");
    expect(status()).toHaveTextContent("Takes control, not audio");
    over(seen.current, "other");
    expect(status()).toHaveTextContent("This port refuses the wire");
    over(seen.current, "in");
    expect(status()).toBeEmptyDOMElement();
    over(seen.current, "out", "source");
    expect(status()).toBeEmptyDOMElement();
    over(seen.current, null);
    expect(status()).toBeEmptyDOMElement();
  });

  it("says a refused drop's verdict once the drag is over", () => {
    const refused: ConnectRefusal = {
      port: { nodeId: "b", handleId: "side", side: "input" },
      reason: "Takes control, not audio",
    };
    const { rerender } = render(
      <Canvas>
        <ConnectStatus value={null} refused={refused} />
      </Canvas>,
    );
    expect(status()).toHaveTextContent("Not connected: Takes control, not audio");
    rerender(
      <Canvas>
        <ConnectStatus value={null} refused={{ port: refused.port }} />
      </Canvas>,
    );
    expect(status()).toHaveTextContent("Not connected: that port refuses the wire");
  });

  it("takes the app's words, and its class beside its own", () => {
    const { container } = render(
      <Canvas>
        <ConnectStatus
          value={null}
          refused={{ port: { nodeId: "b", handleId: "x", side: "input" } }}
          labels={{ notConnected: (reason) => `Nicht verbunden${reason === undefined ? "" : `: ${reason}`}` }}
          className="mine"
          position="top-right"
        />
      </Canvas>,
    );
    expect(status()).toHaveTextContent("Nicht verbunden");
    expect(container.querySelector(".pb-connect-status.mine.top.right")).not.toBeNull();
  });

  it("puts the words together from the value, the refusal and the port under the drag", () => {
    const port = { nodeId: "b", handleId: "side", side: "input" as const };
    expect(connectStatusWords(dragging, null, port)).toBe("Takes control, not audio");
    // While a wire is dragged, a refusal from the last drag is not said.
    expect(connectStatusWords(dragging, { port }, null)).toBe("");
    expect(connectStatusWords(null, { port, reason: "No" }, null)).toBe("Not connected: No");
    expect(connectStatusWords(null, null, null)).toBe("");
    expect(defaultConnectStatusLabels.refuses(undefined)).toBe("This port refuses the wire");
  });

  it("takes no pointer events, draws its box only with words, and keeps its edge under forced colours", () => {
    expect(css).toMatch(/\.pb-connect-status \{\s*pointer-events: none;/);
    expect(css).toMatch(/\.pb-connect-status-text:empty \{[^}]*border: 0;/);
    expect(css).toMatch(/@media \(forced-colors: active\)[^@]*CanvasText/);
  });
});
