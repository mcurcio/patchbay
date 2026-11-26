// PortRow inside a React Flow node: the handle's id, type and side as React Flow reads them, its classes kept, the
// words and their tooltips, the open hint, the problem's mark, the trailing slot, connectable, and the stylesheet's
// rules (the hit area, touch, reduced motion and forced colours).
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { Flow, installFlowMeasuring } from "../../test/flow";
import { PortRow } from "./PortRow";
import css from "./PortRow.css?raw";

beforeAll(installFlowMeasuring);

const handle = (container: HTMLElement) => {
  const found = container.querySelector<HTMLElement>(".pb-port-handle");
  if (found === null) throw new Error("no handle");
  return found;
};
const row = (container: HTMLElement) => {
  const found = container.querySelector<HTMLElement>(".pb-port-row");
  if (found === null) throw new Error("no row");
  return found;
};

describe("PortRow", () => {
  it("draws an input as a target handle on the left, with the app's id unchanged", () => {
    const { container } = render(
      <Flow id="mix">
        <PortRow id="in:left" side="input" label="left" />
      </Flow>,
    );
    const dot = handle(container);
    expect(dot).toHaveAttribute("data-handleid", "in:left");
    expect(dot).toHaveAttribute("data-nodeid", "mix");
    expect(dot).toHaveClass("react-flow__handle", "target", "react-flow__handle-left", "connectable", "pb-port-handle");
    expect(row(container)).toHaveAttribute("data-side", "input");
  });

  it("draws an output as a source handle on the right", () => {
    const { container } = render(
      <Flow>
        <PortRow id="out" side="output" label="out" />
      </Flow>,
    );
    expect(handle(container)).toHaveClass("source", "react-flow__handle-right");
    expect(row(container)).toHaveAttribute("data-side", "output");
  });

  it("shows the label and type, and a string label as the row's tooltip", () => {
    const { container } = render(
      <Flow>
        <PortRow id="in" side="input" label="side" typeLabel="control" />
      </Flow>,
    );
    expect(screen.getByText("side")).toBeInTheDocument();
    expect(screen.getByText("control").tagName).toBe("CODE");
    expect(row(container)).toHaveAttribute("title", "side");
  });

  it("gives a node label no tooltip", () => {
    const { container } = render(
      <Flow>
        <PortRow id="in" side="input" label={<b>side</b>} />
      </Flow>,
    );
    expect(row(container)).not.toHaveAttribute("title");
  });

  it.each(["ok", "no", "origin"])("marks the %s hint on the row and the handle", (hint) => {
    const { container } = render(
      <Flow>
        <PortRow id="in" side="input" label="in" hint={hint} />
      </Flow>,
    );
    expect(handle(container)).toHaveAttribute("data-hint", hint);
    expect(row(container)).toHaveAttribute("data-hint", hint);
  });

  it.each([null, "maybe"])("draws the hint %s as no drag", (hint) => {
    const { container } = render(
      <Flow>
        <PortRow id="in" side="input" label="in" hint={hint} reason="busy" />
      </Flow>,
    );
    expect(handle(container)).not.toHaveAttribute("data-hint");
    expect(row(container)).not.toHaveAttribute("data-hint");
    expect(handle(container)).not.toHaveAttribute("title");
    expect(row(container)).toHaveAttribute("title", "in");
  });

  it("makes the reason the handle's and the row's tooltip while the hint is no", () => {
    const { container } = render(
      <Flow>
        <PortRow id="in" side="input" label="in" hint="no" reason="Types differ" />
      </Flow>,
    );
    expect(handle(container)).toHaveAttribute("title", "Types differ");
    expect(row(container)).toHaveAttribute("title", "Types differ");
  });

  it("marks a problem with a warning mark that reads its words", () => {
    render(
      <Flow>
        <PortRow id="in" side="input" label="in" problem="Nothing is connected" />
      </Flow>,
    );
    expect(screen.getByText("!")).toHaveAttribute("title", "Nothing is connected");
    expect(screen.getByText("Nothing is connected")).toHaveClass("pb-warn-mark-text");
  });

  it("draws the trailing slot", () => {
    render(
      <Flow>
        <PortRow id="out" side="output" label="out" trailing={<span>level</span>} />
      </Flow>,
    );
    expect(screen.getByText("level").parentElement).toHaveClass("pb-port-trailing");
  });

  it("passes connectable to the handle", () => {
    const { container } = render(
      <Flow>
        <PortRow id="in" side="input" label="in" connectable={false} />
      </Flow>,
    );
    expect(handle(container)).not.toHaveClass("connectable");
  });
});

describe("PortRow's stylesheet", () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("sizes the row and the handle from the node geometry tokens", () => {
    expect(plain).toMatch(/\.pb-port-row \{[^}]*height: var\(--pb-node-row\)/);
    expect(plain).toMatch(
      /\.pb-port-handle \{[^}]*width: var\(--pb-node-handle-hit\)[^}]*height: var\(--pb-node-handle-hit\)/,
    );
    expect(plain).toMatch(/\.pb-port-handle::after \{[^}]*width: var\(--pb-node-handle\)/);
  });

  it("moves the hint only at the fast motion, which reduced motion zeroes", () => {
    const durations = [...plain.matchAll(/var\(--pb-motion-(\w+)\)/g)].map((match) => match[1]);
    expect(new Set(durations)).toEqual(new Set(["fast"]));
  });

  it("keeps the hint visible under forced colours", () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(plain)?.[1] ?? "";
    expect(forced).toMatch(/data-hint="ok"\][^{]*\{[^}]*Highlight/);
    expect(forced).toMatch(/data-hint="no"\]::after \{[^}]*GrayText/);
  });
});
