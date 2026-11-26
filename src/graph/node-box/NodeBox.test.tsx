// NodeBox inside a React Flow node: the group named by its title, the header's words and tooltips, the open tone and
// change, the change's words, disabled, failed and selected, the line, the ports stacked and side by side, the
// footer, no tab stop of its own, React Flow asked to measure again when the ports change, and the stylesheet's rules.
import { render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Flow, installFlowMeasuring } from "../../test/flow";
import { defaultNodeBoxLabels, NodeBox, type PortSpec } from "./NodeBox";
import css from "./NodeBox.css?raw";

const updateNodeInternals = vi.fn();
vi.mock("@xyflow/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xyflow/react")>()),
  useUpdateNodeInternals: () => updateNodeInternals,
}));

beforeAll(installFlowMeasuring);
beforeEach(() => {
  updateNodeInternals.mockClear();
});

const box = () => {
  const found = document.querySelector<HTMLElement>(".pb-node-box");
  if (found === null) throw new Error("no box");
  return found;
};
const inputs: PortSpec[] = [{ id: "in", label: "in", typeLabel: "audio" }];
const outputs: PortSpec[] = [
  { id: "left", label: "left" },
  { id: "right", label: "right" },
];

describe("NodeBox", () => {
  it("is a group named by its title, the title also the header's tooltip", () => {
    render(
      <Flow>
        <NodeBox title="Tone 1" subtitle="oscillator" />
      </Flow>,
    );
    expect(screen.getByRole("group", { name: "Tone 1" })).toHaveClass("pb-node-box");
    expect(screen.getByText("Tone 1")).toHaveAttribute("title", "Tone 1");
    expect(screen.getByText("oscillator")).toHaveClass("pb-node-subtitle");
  });

  it.each(["ok", "warn", "err", "quiet", "off", "accent", "muted", "sparkly"])("sets the %s tone", (tone) => {
    render(
      <Flow>
        <NodeBox title="n" tone={tone} />
      </Flow>,
    );
    expect(box()).toHaveAttribute("data-tone", tone);
  });

  it.each([
    ["added", "added"],
    ["removed", "removed"],
    ["renamed", "renamed"],
    ["changed", "changed"],
    ["moved", "moved"],
  ])("marks the %s change with a badge saying %s", (change, word) => {
    render(
      <Flow>
        <NodeBox title="n" change={change} />
      </Flow>,
    );
    expect(box()).toHaveAttribute("data-change", change);
    const badge = within(box()).getByText(word);
    expect(badge).toHaveClass("pb-badge", "pb-node-change");
    expect(badge).toHaveAttribute("data-tone", change);
  });

  it("takes the change's words through labels, English for the rest", () => {
    const { rerender } = render(
      <Flow>
        <NodeBox title="n" change="added" labels={{ added: "new" }} />
      </Flow>,
    );
    expect(within(box()).getByText("new")).toHaveClass("pb-badge");
    rerender(
      <Flow>
        <NodeBox title="n" change="removed" labels={{ added: "new" }} />
      </Flow>,
    );
    expect(within(box()).getByText(defaultNodeBoxLabels.removed)).toHaveClass("pb-badge");
  });

  it("draws no badge without a change", () => {
    render(
      <Flow>
        <NodeBox title="n" />
      </Flow>,
    );
    expect(box().querySelector(".pb-badge")).toBeNull();
    expect(box()).not.toHaveAttribute("data-change");
  });

  it("marks disabled, failed and selected", () => {
    render(
      <Flow>
        <NodeBox title="n" disabled failed selected />
      </Flow>,
    );
    expect(box()).toHaveAttribute("data-disabled");
    expect(box()).toHaveAttribute("data-failed");
    expect(box()).toHaveAttribute("data-selected");
  });

  it("draws the status slot, the line with its tooltip, and the footer", () => {
    render(
      <Flow>
        <NodeBox title="n" status={<span>running</span>} line="No input" footer={<span>48 kHz</span>} />
      </Flow>,
    );
    expect(screen.getByText("running").parentElement).toHaveClass("pb-node-status");
    expect(screen.getByText("No input")).toHaveAttribute("title", "No input");
    expect(screen.getByText("48 kHz").parentElement).toHaveClass("pb-node-footer");
  });

  it("stacks the inputs' rows, then the outputs'", () => {
    const { container } = render(
      <Flow>
        <NodeBox title="n" inputs={inputs} outputs={outputs} />
      </Flow>,
    );
    const ports = container.querySelector(".pb-node-ports");
    expect(ports).toHaveAttribute("data-ports", "stacked");
    const rows = [...container.querySelectorAll(".pb-port-row")].map((row) => [
      row.getAttribute("data-side"),
      row.textContent,
    ]);
    expect(rows).toEqual([
      ["input", "inaudio"],
      ["output", "left"],
      ["output", "right"],
    ]);
  });

  it("puts the inputs and outputs side by side in two columns", () => {
    const { container } = render(
      <Flow>
        <NodeBox title="n" inputs={inputs} outputs={outputs} ports="side-by-side" />
      </Flow>,
    );
    const columns = container.querySelectorAll(".pb-node-column");
    expect([...columns].map((column) => [column.getAttribute("data-side"), column.children.length])).toEqual([
      ["input", 1],
      ["output", 2],
    ]);
  });

  it("stacks a layout it does not know", () => {
    const { container } = render(
      <Flow>
        <NodeBox title="n" inputs={inputs} outputs={outputs} ports="diagonal" />
      </Flow>,
    );
    expect(container.querySelector(".pb-node-ports")).toHaveAttribute("data-ports", "stacked");
  });

  it("draws no ports section without ports", () => {
    const { container } = render(
      <Flow>
        <NodeBox title="n" />
      </Flow>,
    );
    expect(container.querySelector(".pb-node-ports")).toBeNull();
  });

  it("sets its width when given one and passes native props through", () => {
    render(
      <Flow>
        <NodeBox title="n" width={300} className="mine" data-kind="source" />
      </Flow>,
    );
    expect(box()).toHaveStyle({ width: "300px" });
    expect(box()).toHaveClass("pb-node-box", "mine");
    expect(box()).toHaveAttribute("data-kind", "source");
  });

  it("adds no tab stop of its own", () => {
    render(
      <Flow>
        <NodeBox title="n" inputs={inputs} outputs={outputs} />
      </Flow>,
    );
    expect(box().querySelectorAll("[tabindex], a, button, input, select, textarea")).toHaveLength(0);
  });

  it("asks React Flow to measure its node again when its ports or their layout change, and not otherwise", () => {
    const { rerender } = render(
      <Flow id="mix">
        <NodeBox title="n" inputs={inputs} outputs={outputs} />
      </Flow>,
    );
    expect(updateNodeInternals).not.toHaveBeenCalled();
    rerender(
      <Flow id="mix">
        <NodeBox title="renamed" inputs={[...inputs]} outputs={outputs} />
      </Flow>,
    );
    expect(updateNodeInternals).not.toHaveBeenCalled();
    rerender(
      <Flow id="mix">
        <NodeBox title="n" inputs={inputs} outputs={[...outputs].reverse()} />
      </Flow>,
    );
    expect(updateNodeInternals).toHaveBeenLastCalledWith("mix");
    rerender(
      <Flow id="mix">
        <NodeBox title="n" inputs={inputs} outputs={[...outputs].reverse()} ports="side-by-side" />
      </Flow>,
    );
    expect(updateNodeInternals).toHaveBeenCalledTimes(2);
  });
});

describe("NodeBox's stylesheet", () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it.each([
    ["pb-node-box", "width: var(--pb-node-width)"],
    ["pb-node-header", "height: var(--pb-node-header)"],
    ["pb-node-line", "height: var(--pb-node-line)"],
    ["pb-node-ports", "padding-block: var(--pb-node-pad)"],
    ["pb-node-footer", "height: var(--pb-node-footer)"],
  ])("sizes .%s from the geometry tokens", (name, rule) => {
    expect(plain).toMatch(new RegExp(`\\.${name} \\{[^}]*${rule.replace(/[()]/g, "\\$&")}`));
  });

  it("moves only the selection's colour, at the fast motion", () => {
    expect([...plain.matchAll(/transition: ([^;]+);/g)].map((match) => match[1])).toEqual([
      "outline-color var(--pb-motion-fast)",
    ]);
  });

  it("keeps the stripe and the change visible under forced colours", () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(plain)?.[1] ?? "";
    expect(forced).toMatch(/\.pb-node-box::before \{[^}]*CanvasText/);
    expect(forced).toMatch(/\[data-change\]::after[^{]*\{[^}]*CanvasText/);
    expect(forced).toMatch(/\[data-selected\] \{[^}]*Highlight/);
  });
});
