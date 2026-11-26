// mergeFlowProps: handlers given by several objects all run in order, isValidConnection accepts only when each does,
// other props are the last object's, and undefined gives nothing.
import { describe, expect, it, vi } from "vitest";
import { mergeFlowProps } from "./mergeFlowProps";

describe("mergeFlowProps", () => {
  it("calls each object's handler in order", () => {
    const calls: string[] = [];
    const merged = mergeFlowProps(
      { onConnectEnd: (value: number) => calls.push(`first ${value}`) },
      { onConnectEnd: (value: number) => calls.push(`second ${value}`) },
    );
    merged.onConnectEnd(7);
    expect(calls).toEqual(["first 7", "second 7"]);
  });

  it("keeps a handler only one object gives as it is", () => {
    const onMoveStart = vi.fn();
    const merged = mergeFlowProps({ onMoveStart }, { onConnectEnd: vi.fn() });
    expect(merged.onMoveStart).toBe(onMoveStart);
  });

  it("accepts a connection only when each check does, stopping at the first refusal", () => {
    const later = vi.fn(() => true);
    const refusing = mergeFlowProps({ isValidConnection: () => false }, { isValidConnection: later });
    expect(refusing.isValidConnection()).toBe(false);
    expect(later).not.toHaveBeenCalled();
    const accepting = mergeFlowProps({ isValidConnection: () => true }, { isValidConnection: later });
    expect(accepting.isValidConnection()).toBe(true);
  });

  it("takes any other prop from the last object that gives it", () => {
    const merged = mergeFlowProps({ zoomOnDoubleClick: true, snapToGrid: true }, { zoomOnDoubleClick: false });
    expect(merged).toEqual({ zoomOnDoubleClick: false, snapToGrid: true });
  });

  it("skips undefined objects and props", () => {
    const onConnectStart = vi.fn();
    const merged = mergeFlowProps(
      undefined,
      { onConnectStart },
      { onConnectStart: undefined as (() => void) | undefined },
    );
    expect(merged.onConnectStart).toBe(onConnectStart);
  });
});
