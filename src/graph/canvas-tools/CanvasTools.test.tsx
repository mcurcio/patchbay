// CanvasTools inside React Flow's own canvas: the tools and their words, the optional tidy and minimap tools, the
// minimap drawn with the app's node class, the fit tool's own fit or the app's, the zoom moving the view over
// --pb-motion-slow (0 ms under reduced motion), the person's view moves through the tools said through onViewMove, the
// open panel position, one tab stop, and the stylesheet's rules.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  type Node,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import { type CSSProperties, type ReactNode, useLayoutEffect } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { installFlowMeasuring } from "../../test/flow";
import { CanvasTools, defaultCanvasToolsLabels } from "./CanvasTools";
import css from "./CanvasTools.css?raw";
import { slowMotionMs } from "./motion";

beforeAll(installFlowMeasuring);

const nodes: Node[] = [
  { id: "a", position: { x: 0, y: 0 }, data: { label: "a", state: "added" }, width: 100, height: 40 },
  { id: "b", position: { x: 300, y: 0 }, data: { label: "b", state: "kept" }, width: 100, height: 40 },
];

function Zoom() {
  const { zoom } = useViewport();
  return <output data-testid="zoom">{zoom}</output>;
}

/** Hands the test React Flow's instance, to move the view by code. */
function Instance({ seen }: { seen: { current: ReactFlowInstance | null } }) {
  const flow = useReactFlow();
  useLayoutEffect(() => {
    hand(seen, flow);
  });
  return null;
}

function hand(seen: { current: ReactFlowInstance | null }, flow: ReactFlowInstance) {
  seen.current = flow;
}

/** The canvas with the tools as its child, the motion token at 0 ms so a zoom lands at once. */
function Canvas({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: "800px", height: "600px" }}>
        <ReactFlow defaultNodes={nodes} style={{ "--pb-motion-slow": "0ms" } as CSSProperties}>
          {children}
          <Zoom />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

describe("CanvasTools", () => {
  it("draws zoom in, zoom out and fit in a tool group named Canvas, in the bottom-left panel", () => {
    const { container } = render(
      <Canvas>
        <CanvasTools />
      </Canvas>,
    );
    const group = screen.getByRole("toolbar", { name: "Canvas" });
    expect([...group.querySelectorAll("button")].map((each) => each.getAttribute("aria-label"))).toEqual([
      "Zoom in",
      "Zoom out",
      "Fit the view",
    ]);
    const panel = container.querySelector(".react-flow__panel.pb-canvas-tools");
    expect(panel).toHaveClass("bottom", "left");
    expect(container.querySelector(".react-flow__minimap")).toBeNull();
  });

  it("exports its English words", () => {
    expect(defaultCanvasToolsLabels).toEqual({
      toolbar: "Canvas",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      fit: "Fit the view",
      tidy: "Tidy the layout",
      minimap: "Minimap",
    });
  });

  it("takes the app's words, keeping the rest", () => {
    render(
      <Canvas>
        <CanvasTools labels={{ toolbar: "View", fit: "Show all" }} onTidy={vi.fn()} />
      </Canvas>,
    );
    expect(screen.getByRole("toolbar", { name: "View" })).toBeInTheDocument();
    expect(button("Show all")).toBeInTheDocument();
    expect(button("Tidy the layout")).toBeInTheDocument();
  });

  it("shows the app's key bindings in aria-keyshortcuts and the tooltip, binding none", () => {
    const onTidy = vi.fn();
    render(
      <Canvas>
        <CanvasTools onTidy={onTidy} keyShortcuts={{ fit: "F", tidy: "Shift+L" }} />
      </Canvas>,
    );
    expect(button("Fit the view")).toHaveAttribute("aria-keyshortcuts", "F");
    expect(button("Fit the view")).toHaveAttribute("title", "Fit the view (F)");
    expect(button("Zoom in")).not.toHaveAttribute("aria-keyshortcuts");
    expect(button("Zoom in")).toHaveAttribute("title", "Zoom in");
    fireEvent.keyDown(document.body, { key: "L", shiftKey: true });
    expect(onTidy).not.toHaveBeenCalled();
  });

  it("shows the tidy tool only when given, and calls it", () => {
    const onTidy = vi.fn();
    render(
      <Canvas>
        <CanvasTools onTidy={onTidy} />
      </Canvas>,
    );
    fireEvent.click(button("Tidy the layout"));
    expect(onTidy).toHaveBeenCalledOnce();
  });

  it("shows the minimap tool only with onMinimap, pressed while on, asking for the other state", () => {
    const onMinimap = vi.fn();
    const { container, rerender } = render(
      <Canvas>
        <CanvasTools onMinimap={onMinimap} />
      </Canvas>,
    );
    expect(button("Minimap")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button("Minimap"));
    expect(onMinimap).toHaveBeenLastCalledWith(true);
    expect(container.querySelector(".react-flow__minimap")).toBeNull();
    rerender(
      <Canvas>
        <CanvasTools minimap onMinimap={onMinimap} />
      </Canvas>,
    );
    expect(screen.getByRole("button", { name: "Minimap" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Minimap" }));
    expect(onMinimap).toHaveBeenLastCalledWith(false);
  });

  it("draws React Flow's minimap while on, named by its word, with the app's node class", async () => {
    const { container } = render(
      <Canvas>
        <CanvasTools minimap onMinimap={vi.fn()} minimapNodeClassName={(node) => `state-${String(node.data.state)}`} />
      </Canvas>,
    );
    const minimap = container.querySelector(".react-flow__minimap.pb-canvas-minimap");
    expect(minimap).not.toBeNull();
    expect(minimap?.querySelector("svg")).toHaveAttribute("aria-labelledby");
    expect(container.querySelector(".react-flow__minimap title")).toHaveTextContent("Minimap");
    await waitFor(() => {
      expect(container.querySelector(".react-flow__minimap-node.state-added")).not.toBeNull();
    });
    expect(container.querySelector(".react-flow__minimap-node.state-kept")).not.toBeNull();
  });

  it("takes a string as the minimap's node class", async () => {
    const { container } = render(
      <Canvas>
        <CanvasTools minimap minimapNodeClassName="shape" />
      </Canvas>,
    );
    await waitFor(() => {
      expect(container.querySelectorAll(".react-flow__minimap-node.shape")).toHaveLength(2);
    });
  });

  it("calls the app's fit instead of its own", () => {
    const onFit = vi.fn();
    render(
      <Canvas>
        <CanvasTools onFit={onFit} />
      </Canvas>,
    );
    fireEvent.click(button("Fit the view"));
    expect(onFit).toHaveBeenCalledOnce();
  });

  it("zooms the view in and out", async () => {
    render(
      <Canvas>
        <CanvasTools />
      </Canvas>,
    );
    const zoom = () => Number(screen.getByTestId("zoom").textContent);
    expect(zoom()).toBe(1);
    await act(async () => {
      fireEvent.click(button("Zoom in"));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(zoom()).toBeCloseTo(1.2);
    });
    await act(async () => {
      fireEvent.click(button("Zoom out"));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(zoom()).toBeCloseTo(1);
    });
  });

  it("says a zoom tool's press as the person's view move, before it zooms", () => {
    const onViewMove = vi.fn();
    render(
      <Canvas>
        <CanvasTools onViewMove={onViewMove} />
      </Canvas>,
    );
    fireEvent.click(button("Zoom in"));
    fireEvent.click(button("Zoom out"));
    expect(onViewMove).toHaveBeenCalledTimes(2);
    fireEvent.click(button("Fit the view"));
    expect(onViewMove).toHaveBeenCalledTimes(2);
  });

  it("says a move of the view during a press or a wheel on the minimap, and no other move by code", async () => {
    const onViewMove = vi.fn();
    const seen: { current: ReactFlowInstance | null } = { current: null };
    const { container } = render(
      <Canvas>
        <CanvasTools minimap onViewMove={onViewMove} />
        <Instance seen={seen} />
      </Canvas>,
    );
    const minimap = container.querySelector(".pb-canvas-minimap");
    if (minimap === null) throw new Error("no minimap");
    const move = async (x: number) => {
      await act(async () => {
        await seen.current?.setViewport({ x, y: 0, zoom: 1 });
      });
    };
    await move(10);
    expect(onViewMove).not.toHaveBeenCalled();
    fireEvent.pointerDown(minimap);
    await move(20);
    expect(onViewMove).toHaveBeenCalledOnce();
    fireEvent.pointerUp(window);
    await move(30);
    expect(onViewMove).toHaveBeenCalledOnce();
    fireEvent.wheel(minimap);
    await move(40);
    expect(onViewMove).toHaveBeenCalledTimes(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await move(50);
    expect(onViewMove).toHaveBeenCalledTimes(2);
  });

  it("draws the tools whatever the position, one it does not know too", () => {
    render(
      <Canvas>
        <CanvasTools position="somewhere" />
      </Canvas>,
    );
    expect(screen.getByRole("toolbar", { name: "Canvas" })).toBeInTheDocument();
  });

  it("puts the app's tools after its own, the group one tab stop", () => {
    render(
      <Canvas>
        <CanvasTools onTidy={vi.fn()}>
          <button type="button" aria-label="Lock">
            L
          </button>
        </CanvasTools>
      </Canvas>,
    );
    const buttons = [...screen.getByRole("toolbar").querySelectorAll("button")];
    expect(buttons.at(-1)).toHaveAccessibleName("Lock");
    expect(buttons.filter((each) => each.tabIndex === 0)).toHaveLength(1);
  });

  it("adds the app's class to the panel's own", () => {
    const { container } = render(
      <Canvas>
        <CanvasTools className="mine" />
      </Canvas>,
    );
    expect(container.querySelector(".react-flow__panel.pb-canvas-tools.mine")).not.toBeNull();
  });

  it("keeps the minimap's frame in forced colours", () => {
    expect(css).toMatch(/@media \(forced-colors: active\)\s*\{\s*\.pb-canvas-minimap\s*\{\s*border-color: CanvasText;/);
  });
});

describe("slowMotionMs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const withToken = (value: string) => {
    const element = document.createElement("div");
    element.style.setProperty("--pb-motion-slow", value);
    document.body.append(element);
    return element;
  };

  it("reads --pb-motion-slow in ms or s", () => {
    expect(slowMotionMs(withToken("0ms"))).toBe(0);
    expect(slowMotionMs(withToken("180ms"))).toBe(180);
    expect(slowMotionMs(withToken("0.25s"))).toBe(250);
  });

  it("is 180 ms without the token, 0 under reduced motion", () => {
    expect(slowMotionMs(null)).toBe(180);
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    expect(slowMotionMs(document.createElement("div"))).toBe(0);
  });
});
