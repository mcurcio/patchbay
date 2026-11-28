// EmptyCanvas on React Flow's own canvas: the app's empty state while the graph has no nodes, gone with the first,
// `empty` winning over React Flow's count, EmptyCanvasHint's default without children, and its stylesheet.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Node, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { EmptyCanvas } from "./EmptyCanvas";
import css from "./EmptyCanvas.css?raw";

beforeAll(installFlowMeasuring);

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

describe("EmptyCanvas", () => {
  it("draws the app's empty state while the canvas has no nodes, and nothing with the first", () => {
    const { container, rerender } = render(
      <Canvas>
        <EmptyCanvas className="mine">
          <p>Start from a template</p>
        </EmptyCanvas>
      </Canvas>,
    );
    const panel = container.querySelector(".pb-empty-canvas-slot");
    expect(panel).toHaveClass("react-flow__panel", "top", "center", "mine");
    expect(panel).toHaveTextContent(/^Start from a template$/);
    expect(container.querySelector(".pb-empty-canvas")).toBeNull();
    rerender(
      <Canvas nodes={one}>
        <EmptyCanvas>
          <p>Start from a template</p>
        </EmptyCanvas>
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas-slot")).toBeNull();
  });

  it("lets its controls be pressed", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <Canvas>
        <EmptyCanvas>
          <button type="button" onClick={onAdd}>
            Add a node
          </button>
        </EmptyCanvas>
      </Canvas>,
    );
    await user.click(screen.getByRole("button", { name: "Add a node" }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(css).not.toMatch(/pointer-events/);
  });

  it("follows the app's empty over React Flow's count, and takes its place", () => {
    const { container, rerender } = render(
      <Canvas nodes={one}>
        <EmptyCanvas empty position="bottom-left">
          <p>Only a ghost</p>
        </EmptyCanvas>
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas-slot")).toHaveClass("bottom", "left");
    rerender(
      <Canvas>
        <EmptyCanvas empty={false}>
          <p>Only a ghost</p>
        </EmptyCanvas>
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas-slot")).toBeNull();
  });

  it("draws EmptyCanvasHint's default without children, under the same rules", () => {
    const { container, rerender } = render(
      <Canvas>
        <EmptyCanvas />
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toHaveTextContent(/^This graph has no nodes yet\.$/);
    expect(container.querySelector(".pb-empty-canvas-slot")).toBeNull();
    rerender(
      <Canvas nodes={one}>
        <EmptyCanvas />
      </Canvas>,
    );
    expect(container.querySelector(".pb-empty-canvas")).toBeNull();
  });
});
