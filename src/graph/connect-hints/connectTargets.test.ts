import { describe, expect, it, vi } from "vitest";
import { type ConnectCandidate, connectTargets } from "./connectTargets";
import type { CanConnect } from "./useConnectHints";

const port = (nodeId: string, handleId: string | null, side: ConnectCandidate["side"], label = handleId ?? "") => ({
  nodeId,
  handleId,
  side,
  label,
});

const candidates = [
  port("src", "left", "output"),
  port("src", "gate", "output"),
  port("mix", "in", "input"),
  port("mix", "side", "input"),
  port("mix", null, "input", "plain"),
];

/** Joins ports of one name kind: audio to in, control to side; refuses others with a reason, a handle without an id plainly. */
const canConnect: CanConnect = (from, to) => {
  if (to.handleId === null || from.handleId === null) return false;
  const audio = from.handleId === "left" || from.handleId === "out";
  return audio === (to.handleId === "in") || `Takes ${to.handleId}, not ${from.handleId}`;
};

describe("connectTargets", () => {
  it("lists an output's accepted inputs in order, and the refused with their reasons", () => {
    const targets = connectTargets({ nodeId: "src", handleId: "left" }, "output", candidates, canConnect);
    expect(targets.accepted.map((p) => p.label)).toEqual(["in"]);
    expect(targets.refused).toEqual([{ port: candidates[3], reason: "Takes side, not left" }, { port: candidates[4] }]);
  });

  it("asks the rule with the output first for an input, as a drag from the input would", () => {
    const rule = vi.fn<CanConnect>(() => true);
    const into = { nodeId: "mix", handleId: "in" };
    const targets = connectTargets(into, "input", candidates, rule);
    expect(rule.mock.calls).toEqual([
      [{ nodeId: "src", handleId: "left" }, into],
      [{ nodeId: "src", handleId: "gate" }, into],
    ]);
    expect(targets.accepted).toEqual([candidates[0], candidates[1]]);
    expect(targets.refused).toEqual([]);
  });

  it("leaves the port's own side out of both lists, and asks each pair once", () => {
    const rule = vi.fn<CanConnect>(() => false);
    const targets = connectTargets({ nodeId: "src", handleId: "gate" }, "output", candidates, rule);
    expect(rule).toHaveBeenCalledTimes(3);
    expect(targets.accepted).toEqual([]);
    expect(targets.refused.map((r) => r.port.label)).toEqual(["in", "side", "plain"]);
  });

  it("accepts only true, as the drop check does", () => {
    const rule: CanConnect = () => "";
    expect(connectTargets({ nodeId: "src", handleId: "left" }, "output", candidates, rule).accepted).toEqual([]);
  });
});
