// Wire on a React Flow canvas: React Flow's edge classes and hit path kept, the open tone, the level as a clamped CSS
// variable that restyles without rebuilding the path, dashes, flow, the arrow facing the handle, the label and the
// tooltip, selection, and the stylesheet's rules (reduced motion, forced colours).
import { render } from "@testing-library/react";
import { type Edge, getBezierPath } from "@xyflow/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EdgeFlow, installFlowMeasuring } from "../../test/flow";
import { Wire, type WireData } from "./Wire";
import css from "./Wire.css?raw";

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return { ...actual, getBezierPath: vi.fn(actual.getBezierPath) };
});

beforeAll(installFlowMeasuring);

const edgeTypes = { wire: Wire };
const wire = (data: WireData | undefined, more: Partial<Edge> = {}): Edge => ({
  id: "e",
  source: "a",
  sourceHandle: "out",
  target: "b",
  targetHandle: "in",
  type: "wire",
  data,
  ...more,
});
const draw = (data?: WireData, more?: Partial<Edge>) =>
  render(<EdgeFlow edges={[wire(data, more)]} edgeTypes={edgeTypes} />);
const group = (container: HTMLElement) => {
  const found = container.querySelector<SVGGElement>(".pb-wire");
  if (found === null) throw new Error("no wire");
  return found;
};
const emphasis = (container: HTMLElement) => group(container).style.getPropertyValue("--pb-wire-emphasis");

describe("Wire", () => {
  it("keeps React Flow's edge path and hit path", () => {
    const { container } = draw();
    const path = container.querySelector(".react-flow__edge-path");
    expect(path).toHaveClass("pb-wire-path");
    expect(path?.getAttribute("d")).toMatch(/^M/);
    const hit = container.querySelector(".react-flow__edge-interaction");
    expect(hit).toHaveAttribute("stroke-width", "20");
    expect(hit?.getAttribute("d")).toBe(path?.getAttribute("d"));
    expect(container.querySelector(".react-flow__edge")).toHaveClass("selectable");
  });

  it("takes the edge's interaction width, and draws no hit path at 0", () => {
    const { container } = draw(undefined, { interactionWidth: 30 });
    expect(container.querySelector(".react-flow__edge-interaction")).toHaveAttribute("stroke-width", "30");
    const none = draw(undefined, { interactionWidth: 0 });
    expect(none.container.querySelector(".react-flow__edge-interaction")).toBeNull();
  });

  it.each(["ok", "refused", "added", "renamed", "maybe"])("marks the tone %s for the stylesheet", (tone) => {
    const { container } = draw({ tone });
    expect(group(container)).toHaveAttribute("data-tone", tone);
  });

  it("draws the plain wire without a level", () => {
    const { container } = draw({});
    expect(group(container)).not.toHaveAttribute("data-emphasis");
    expect(emphasis(container)).toBe("");
  });

  it.each([
    [0.5, "0.5"],
    [2, "1"],
    [-1, "0"],
    [Number.NaN, "0"],
    ["loud" as unknown as number, "0"],
  ])("sets the level %s as --pb-wire-emphasis %s", (value, set) => {
    const { container } = draw({ emphasis: value });
    expect(group(container)).toHaveAttribute("data-emphasis");
    expect(emphasis(container)).toBe(set);
  });

  it("restyles a change of level without rebuilding the path", () => {
    const { container, rerender } = draw({ emphasis: 0.1 });
    const path = container.querySelector(".pb-wire-path");
    const built = vi.mocked(getBezierPath).mock.calls.length;
    for (const level of [0.3, 0.6, 0.9]) {
      rerender(<EdgeFlow edges={[wire({ emphasis: level })]} edgeTypes={edgeTypes} />);
    }
    expect(emphasis(container)).toBe("0.9");
    expect(vi.mocked(getBezierPath).mock.calls.length).toBe(built);
    expect(container.querySelector(".pb-wire-path")).toBe(path);
  });

  it("marks dashes and a selected wire", () => {
    const { container } = draw({ dashed: true }, { selected: true });
    expect(group(container)).toHaveAttribute("data-dashed");
    expect(group(container)).toHaveAttribute("data-selected");
    const plain = draw({});
    expect(group(plain.container)).not.toHaveAttribute("data-dashed");
    expect(group(plain.container)).not.toHaveAttribute("data-selected");
  });

  it("draws the flow along the same path only when asked", () => {
    const { container } = draw({ flow: true });
    const flow = container.querySelector(".pb-wire-flow");
    expect(flow?.getAttribute("d")).toBe(container.querySelector(".pb-wire-path")?.getAttribute("d"));
    expect(flow).toHaveAttribute("aria-hidden", "true");
    expect(draw({}).container.querySelector(".pb-wire-flow")).toBeNull();
  });

  it("draws the arrow with its tip on the input handle, pointing into the node from the left", () => {
    const { container } = draw({ arrow: true });
    const path = container.querySelector(".pb-wire-path")?.getAttribute("d") ?? "";
    const end = /(-?[\d.]+),(-?[\d.]+)$/.exec(path);
    const tip = /^M (\S+) (\S+) L (\S+) (\S+) L (\S+) (\S+) Z$/.exec(
      container.querySelector(".pb-wire-arrow")?.getAttribute("d") ?? "",
    );
    expect(tip).not.toBeNull();
    expect(Number(tip?.[1])).toBe(Number(end?.[1]));
    expect(Number(tip?.[2])).toBe(Number(end?.[2]));
    // The base is 8 px to the left of the tip, 4 px either side of the wire.
    expect(Number(tip?.[3])).toBe(Number(end?.[1]) - 8);
    expect(Math.abs(Number(tip?.[4]) - Number(tip?.[6]))).toBe(8);
    expect(draw({}).container.querySelector(".pb-wire-arrow")).toBeNull();
  });

  it("shows the label at the midpoint and the title on the hit path", () => {
    const { container } = draw({ label: "x 2", title: "out to in" });
    const label = container.querySelector(".pb-wire-label");
    expect(label).toHaveTextContent("x 2");
    expect(label?.parentElement).toHaveClass("react-flow__edgelabel-renderer");
    expect(container.querySelector(".react-flow__edge-interaction title")).toHaveTextContent("out to in");
    const bare = draw({});
    expect(bare.container.querySelector(".pb-wire-label")).toBeNull();
    expect(bare.container.querySelector("title")).toBeNull();
  });
});

describe("Wire's stylesheet", () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("draws a tone it does not know in React Flow's edge stroke", () => {
    expect(plain).toMatch(/\.pb-wire \{\s*--pb-wire-color: var\(--xy-edge-stroke\);/);
    expect(plain).not.toMatch(/data-tone="maybe"/);
  });

  it("draws the level as width and brightness from the variable", () => {
    expect(plain).toMatch(/stroke-width: calc\(1\.5px \+ 2px \* var\(--pb-wire-emphasis\)\)/);
    expect(plain).toMatch(/stroke-opacity: calc\(0\.45 \+ 0\.55 \* var\(--pb-wire-emphasis\)\)/);
  });

  it("draws the seven state tones, the four change tones and refused", () => {
    const tones = new Set([...plain.matchAll(/data-tone="([^"]+)"/g)].map((match) => match[1]));
    expect([...tones].sort()).toEqual([
      "accent",
      "added",
      "changed",
      "err",
      "muted",
      "off",
      "ok",
      "quiet",
      "refused",
      "removed",
      "renamed",
      "warn",
    ]);
  });

  it("has no pending tone: a request on its way is GhostWire's, and a queued wire a change tone", () => {
    expect(plain).not.toMatch(/data-tone="pending"/);
  });

  it("puts the selected rule after the tones", () => {
    expect(plain.indexOf("[data-selected] {")).toBeGreaterThan(plain.lastIndexOf('[data-tone="removed"]'));
  });

  it("stops the flow under reduced motion by not drawing it", () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(plain)?.[1] ?? "";
    expect(reduced).toMatch(/\.pb-wire-flow \{\s*display: none;/);
  });

  it("keeps the stroke and the arrow under forced colours", () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(plain)?.[1] ?? "";
    expect(forced).toMatch(/\.pb-wire-path \{\s*stroke: CanvasText;/);
    expect(forced).toMatch(/\[data-selected\] \.react-flow__edge-path\.pb-wire-path \{\s*stroke: Highlight;/);
    expect(forced).toMatch(/\.pb-wire-arrow \{\s*fill: CanvasText;/);
  });
});
