// GhostWire on a React Flow canvas: React Flow's edge path kept, no hit path, the open tone (pending by default), the
// label, and the stylesheet's rules (no pointer events, dashes, forced colours).
import { render } from "@testing-library/react";
import type { Edge } from "@xyflow/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EdgeFlow, installFlowMeasuring } from "../../test/flow";
import { GhostWire, type GhostWireData } from "./GhostWire";
import css from "./GhostWire.css?raw";

beforeAll(installFlowMeasuring);

const edgeTypes = { ghost: GhostWire };
const draw = (data?: GhostWireData) => {
  const edge: Edge = {
    id: "g",
    source: "a",
    sourceHandle: "out",
    target: "b",
    targetHandle: "in",
    type: "ghost",
    data,
    selectable: false,
    focusable: false,
    deletable: false,
  };
  return render(<EdgeFlow edges={[edge]} edgeTypes={edgeTypes} />);
};
const group = (container: HTMLElement) => container.querySelector(".pb-ghost-wire");

describe("GhostWire", () => {
  it("draws React Flow's edge path and no hit path", () => {
    const { container } = draw();
    expect(container.querySelector(".react-flow__edge-path")).toHaveClass("pb-ghost-wire-path");
    expect(container.querySelector(".react-flow__edge-interaction")).toBeNull();
    expect(group(container)).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    [undefined, "pending"],
    ["pending", "pending"],
    ["refused", "refused"],
    ["maybe", "maybe"],
  ])("draws the tone %s as %s", (tone, drawn) => {
    const { container } = draw(tone === undefined ? undefined : { tone });
    expect(group(container)).toHaveAttribute("data-tone", drawn);
  });

  it("shows a label at the midpoint, in the tone", () => {
    const { container } = draw({ tone: "refused", label: "refused" });
    const label = container.querySelector(".pb-ghost-wire-label");
    expect(label).toHaveTextContent("refused");
    expect(label).toHaveAttribute("data-tone", "refused");
    expect(draw().container.querySelector(".pb-ghost-wire-label")).toBeNull();
  });
});

describe("GhostWire's stylesheet", () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("takes no pointer events and is dashed", () => {
    expect(plain).toMatch(/\.pb-ghost-wire \{[^}]*pointer-events: none/);
    expect(plain).toMatch(/\.pb-ghost-wire-path \{[^}]*stroke-dasharray: 4 4/);
  });

  it("dims a pending one in the quiet tone and draws a refused one in the error tone", () => {
    expect(plain).toMatch(/\[data-tone="pending"\] \{[^}]*--pb-ghost-wire-color: var\(--pb-quiet\)/);
    expect(plain).toMatch(/\[data-tone="refused"\] \{[^}]*--pb-ghost-wire-color: var\(--pb-err\)/);
  });

  it("draws a tone it does not know in the muted stroke, dimmed, its label's edge line-strong", () => {
    expect(plain).toMatch(/\.pb-ghost-wire \{[^}]*--pb-ghost-wire-color: var\(--pb-muted\)[^}]*opacity: 0\.6/);
    expect(plain).toMatch(/\.pb-ghost-wire-label \{[^}]*border: 1px dashed var\(--pb-line-strong\)/);
    expect(plain).toMatch(/\.pb-ghost-wire-label\[data-tone="pending"\] \{\s*border-color: var\(--pb-quiet\)/);
  });

  it("keeps the dashes under forced colours", () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(plain)?.[1] ?? "";
    expect(forced).toMatch(/stroke: GrayText/);
    expect(forced).toMatch(/\[data-tone="refused"\][^{]*\{\s*stroke: CanvasText/);
  });
});
