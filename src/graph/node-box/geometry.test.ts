// The node geometry: each --pb-node-* token in tokens.css equal to its exported constant (layout code reads the
// constants, the components size themselves from the tokens), the touch screen's larger hit area, and nodeBoxSize's
// one formula.
import { describe, expect, it } from "vitest";
import tokensCss from "../../tokens/tokens.css?raw";
import {
  HANDLE_HIT,
  HANDLE_SIZE,
  NODE_FOOTER,
  NODE_HEADER,
  NODE_LINE,
  NODE_PAD,
  NODE_ROW,
  NODE_WIDTH,
  nodeBoxSize,
} from "./geometry";

const css = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the first `:root { … }` block after `from` in tokens.css. */
function rootBlock(from: number): Map<string, string> {
  const match = /:root\s*\{([^}]*)\}/.exec(css.slice(from));
  const found = new Map<string, string>();
  for (const declaration of (match?.[1] ?? "").split(";")) {
    const colon = declaration.indexOf(":");
    if (colon > 0) found.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
  }
  return found;
}

const constants = {
  "--pb-node-width": NODE_WIDTH,
  "--pb-node-header": NODE_HEADER,
  "--pb-node-line": NODE_LINE,
  "--pb-node-row": NODE_ROW,
  "--pb-node-pad": NODE_PAD,
  "--pb-node-footer": NODE_FOOTER,
  "--pb-node-handle": HANDLE_SIZE,
  "--pb-node-handle-hit": HANDLE_HIT,
};

describe("the node geometry", () => {
  const light = rootBlock(0);

  it.each(Object.entries(constants))("holds %s equal to its constant", (token, value) => {
    expect(light.get(token)).toBe(`${value}px`);
  });

  it("has a constant for every --pb-node-* token", () => {
    const tokens = [...light.keys()].filter((name) => name.startsWith("--pb-node-"));
    expect(tokens.sort()).toEqual(Object.keys(constants).sort());
  });

  it("grows a handle's hit area to 32 px on a touch screen, and nothing else of the geometry", () => {
    const touch = rootBlock(css.indexOf("@media (hover: none) and (pointer: coarse)"));
    expect([...touch].filter(([name]) => name.startsWith("--pb-node-"))).toEqual([["--pb-node-handle-hit", "32px"]]);
  });
});

describe("nodeBoxSize", () => {
  const none = { inputs: 0, outputs: 0, ports: "stacked", line: false, footer: false } as const;

  it("is the header alone for a box with no ports, line or footer", () => {
    expect(nodeBoxSize(none)).toEqual({ width: NODE_WIDTH, height: NODE_HEADER });
  });

  it("stacks the inputs' rows and the outputs', padded above and below", () => {
    expect(nodeBoxSize({ ...none, inputs: 1, outputs: 2 }).height).toBe(46 + 2 * 8 + 3 * 22);
  });

  it("puts the larger of the two side by side", () => {
    expect(nodeBoxSize({ ...none, inputs: 2, outputs: 1, ports: "side-by-side" }).height).toBe(46 + 2 * 8 + 2 * 22);
  });

  it("counts a layout it does not know as stacked", () => {
    expect(nodeBoxSize({ ...none, inputs: 2, outputs: 1, ports: "diagonal" })).toEqual(
      nodeBoxSize({ ...none, inputs: 2, outputs: 1 }),
    );
  });

  it("adds the line and the footer when there are", () => {
    expect(nodeBoxSize({ ...none, outputs: 2, line: true, footer: true }).height).toBe(46 + 22 + 2 * 8 + 2 * 22 + 28);
  });

  it("takes its width, or NODE_WIDTH", () => {
    expect(nodeBoxSize({ ...none, width: 300 }).width).toBe(300);
    expect(nodeBoxSize(none).width).toBe(240);
  });

  it("counts no rows for negative counts", () => {
    expect(nodeBoxSize({ ...none, inputs: -1, outputs: -3 }).height).toBe(NODE_HEADER);
  });
});
