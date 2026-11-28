// EmptyCanvasHint on React Flow's own canvas: its words while it holds no nodes, gone with the first, the app's words
// in their place, the gestures only with the app's key or command, the touch gesture on a touch screen, `empty` and
// `add` winning, and its stylesheet.
import { render, screen } from "@testing-library/react";
import { type Node, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mediaQueries } from "../../hooks";
import { installFlowMeasuring } from "../../test/flow";
import { defaultEmptyCanvasHintLabels, EmptyCanvasHint } from "./EmptyCanvasHint";
import css from "./EmptyCanvasHint.css?raw";

beforeAll(installFlowMeasuring);

afterEach(() => {
  vi.unstubAllGlobals();
});

const one: Node[] = [{ id: "a", position: { x: 0, y: 0 }, data: { label: "a" }, width: 100, height: 40 }];

function Canvas({ nodes = [], children }: { nodes?: Node[]; children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: "800px", height: "600px" }}>
        <ReactFlow nodes={nodes}>{children}</ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

describe("EmptyCanvasHint", () => {
  it("says the canvas is empty while it has no nodes, and goes with the first", () => {
    const { container, rerender } = render(
      <Canvas>
        <EmptyCanvasHint />
      </Canvas>,
    );
    const panel = container.querySelector(".pb-empty-canvas");
    expect(panel).toHaveClass("react-flow__panel", "top", "center");
    // No key and no command: no gesture is said, so its words never name a pointer alone.
    expect(panel).toHaveTextContent(/^This graph has no nodes yet\.$/);
    expect(panel).not.toHaveAttribute("role");
    rerender(
      <Canvas nodes={one}>
        <EmptyCanvasHint />
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toBeNull();
  });

  it("says the gestures with the app's add command when it has no key", () => {
    render(
      <Canvas>
        <EmptyCanvasHint command="Add node" />
      </Canvas>,
    );
    expect(screen.getByText("This graph has no nodes yet.")).toBeInTheDocument();
    expect(screen.getByText("Double-click to add a node, or use “Add node”")).toBeInTheDocument();
  });

  it("draws the app's words in place of its own, above the gestures, with its key written for the platform", () => {
    render(
      <Canvas>
        <EmptyCanvasHint keys="Mod+N" platform="apple" className="mine">
          <p>Nothing here yet</p>
        </EmptyCanvasHint>
      </Canvas>,
    );
    const words = screen.getByText("Nothing here yet");
    const add = screen.getByText("Double-click to add a node, or press ⌘N");
    expect(words.parentElement?.nextElementSibling).toBe(add);
    expect(screen.queryByText("This graph has no nodes yet.")).toBeNull();
    expect(add.closest(".pb-empty-canvas")).toHaveClass("mine");
  });

  it("says the touch gesture on a touch screen", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === mediaQueries.touch,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <Canvas>
        <EmptyCanvasHint keys="A" />
      </Canvas>,
    );
    expect(screen.getByText("Double-tap to add a node, or press A")).toBeInTheDocument();
  });

  it("follows the app's empty over React Flow's count, and leaves the gestures out while adding is off", () => {
    const { container, rerender } = render(
      <Canvas nodes={one}>
        <EmptyCanvasHint empty>
          <p>Nothing here yet</p>
        </EmptyCanvasHint>
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toHaveTextContent("Nothing here yet");
    rerender(
      <Canvas>
        <EmptyCanvasHint empty={false} />
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toBeNull();
    rerender(
      <Canvas>
        <EmptyCanvasHint add={false}>
          <p>Read only</p>
        </EmptyCanvasHint>
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toHaveTextContent(/^Read only$/);
    rerender(
      <Canvas>
        <EmptyCanvasHint add={false} keys="A" />
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toHaveTextContent(/^This graph has no nodes yet\.$/);
  });

  it("takes its words through labels", () => {
    render(
      <Canvas>
        <EmptyCanvasHint
          keys="A"
          labels={{ noNodes: "Leer", add: (gesture, keys, command) => `${gesture} ${keys ?? ""} ${command ?? "-"}` }}
        />
      </Canvas>,
    );
    expect(screen.getByText("Leer")).toBeInTheDocument();
    expect(screen.getByText("pointer A -")).toBeInTheDocument();
    expect(defaultEmptyCanvasHintLabels.add("pointer", "A", undefined)).toBe("Double-click to add a node, or press A");
    expect(defaultEmptyCanvasHintLabels.add("touch", undefined, "Add node")).toBe(
      "Double-tap to add a node, or use “Add node”",
    );
  });

  it("takes no pointer events, and keeps its edge under forced colours", () => {
    expect(css).toMatch(/\.react-flow__panel\.pb-empty-canvas \{[^}]*pointer-events: none;/);
    expect(css).toMatch(/@media \(forced-colors: active\)[^@]*CanvasText/);
  });
});
