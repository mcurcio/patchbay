import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToolGroup } from "./ToolGroup";
import css from "./ToolGroup.css?raw";

describe("ToolGroup", () => {
  it("is a named toolbar with the group's frame", () => {
    render(
      <ToolGroup label="Canvas" className="mine">
        <button type="button" aria-label="Zoom in">
          +
        </button>
      </ToolGroup>,
    );
    const group = screen.getByRole("toolbar", { name: "Canvas" });
    expect(group).toHaveClass("pb-toolbar", "pb-tool-group", "mine");
    expect(group).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("moves between its tools with the arrows, and presses them", async () => {
    const onFit = vi.fn();
    render(
      <ToolGroup label="Canvas">
        <button type="button" aria-label="Zoom out">
          <span aria-hidden="true">−</span>
        </button>
        <button type="button" aria-label="Fit view" onClick={onFit}>
          <span aria-hidden="true">⤢</span>
        </button>
      </ToolGroup>,
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Zoom out" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onFit).toHaveBeenCalledOnce();
  });

  it("draws a pressed tool in the accent, and its tools 40 px on touch", () => {
    expect(css).toMatch(/button\[aria-pressed="true"\] \{\s*color: var\(--pb-accent\);/);
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(touch).toMatch(/width: 40px;\s*height: 40px;/);
  });
});
