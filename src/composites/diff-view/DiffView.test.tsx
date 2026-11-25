import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { baseName, diffLineKind, DiffView } from "./DiffView";
import css from "./DiffView.css?raw";

const text = "--- a/x.conf\n+++ b/x.conf\n@@ -1,2 +1,2 @@\n keep\n-old\n+new\n\\ No newline at end of file\n";

function kinds(container: HTMLElement) {
  return [...container.querySelectorAll(".pb-diff-line")].map((line) => [
    line.getAttribute("data-kind"),
    line.textContent,
  ]);
}

describe("DiffView", () => {
  it("draws unified text line by line, each by its kind, without a heading", () => {
    const { container } = render(<DiffView diff={text} className="mine" />);
    expect(container.firstElementChild).toHaveClass("pb-diff", "mine");
    expect(screen.queryByRole("heading")).toBeNull();
    expect(kinds(container)).toEqual([
      ["meta", "--- a/x.conf"],
      ["meta", "+++ b/x.conf"],
      ["hunk", "@@ -1,2 +1,2 @@"],
      ["context", " keep"],
      ["del", "-old"],
      ["add", "+new"],
      ["note", "\\ No newline at end of file"],
    ]);
  });

  it("reads git's header lines as meta, CRLF as LF, and keeps an empty context line", () => {
    expect(diffLineKind("diff --git a/x b/x")).toBe("meta");
    expect(diffLineKind("index 3b18e51..a4c2f09 100644")).toBe("meta");
    expect(diffLineKind("")).toBe("context");
    const { container } = render(<DiffView diff={"@@ -1 +1 @@\r\n-a\r\n\r\n+b\r\n"} />);
    expect(kinds(container)).toEqual([
      ["hunk", "@@ -1 +1 @@"],
      ["del", "-a"],
      ["context", " "],
      ["add", "+b"],
    ]);
  });

  it("labels each file by its base name, with its whole path as the title, under a heading", () => {
    render(
      <DiffView
        files={[
          { path: "config/settings.conf", diff: text },
          { path: "top.txt", diff: text },
        ]}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["settings.conf", "top.txt"]);
    expect(screen.getByRole("button", { name: "settings.conf" })).toHaveAttribute("title", "config/settings.conf");
    expect(baseName("a/b/")).toBe("b");
    expect(baseName("")).toBe("");
  });

  it("takes the headings' level", () => {
    render(<DiffView level={4} files={[{ path: "a.txt", diff: text }]} />);
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("a.txt");
  });

  it("folds and opens a file by its heading button, keeping its own fold when the app holds none", async () => {
    const onToggle = vi.fn();
    render(<DiffView files={[{ path: "dir/a.txt", diff: text }]} onToggle={onToggle} />);
    const toggle = screen.getByRole("button", { name: "a.txt" });
    const body = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(body).toBeVisible();
    await userEvent.click(toggle);
    expect(onToggle).toHaveBeenLastCalledWith("dir/a.txt", false);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).not.toBeVisible();
    toggle.focus();
    await userEvent.keyboard("{Enter}");
    expect(onToggle).toHaveBeenLastCalledWith("dir/a.txt", true);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("follows the app's fold when it holds one, and only asks to change it", async () => {
    const onToggle = vi.fn();
    const files = [{ path: "a.txt", diff: text }];
    const { rerender } = render(<DiffView files={files} collapsed={["a.txt"]} onToggle={onToggle} />);
    const toggle = screen.getByRole("button", { name: "a.txt" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith("a.txt", true);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    rerender(<DiffView files={files} collapsed={[]} onToggle={onToggle} />);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("makes each diff body a tab stop, so a wide one scrolls from the keyboard", () => {
    const { container } = render(<DiffView diff={text} />);
    expect(container.querySelector("pre")).toHaveAttribute("tabindex", "0");
  });

  it("draws nothing for no files", () => {
    const { container } = render(<DiffView files={[]} />);
    expect(container.firstElementChild?.childElementCount).toBe(0);
  });

  it("passes native props and the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<DiffView ref={ref} id="d" aria-label="Changes" diff={text} />);
    expect(ref.current).toHaveAttribute("id", "d");
    expect(ref.current).toHaveAttribute("aria-label", "Changes");
  });

  it("colours lines by the change and code tokens only, in code type", () => {
    expect(css).toMatch(/\[data-kind="add"\]\s*\{[^}]*color: var\(--pb-added\)/);
    expect(css).toMatch(/\[data-kind="del"\]\s*\{[^}]*color: var\(--pb-removed\)/);
    expect(css).toMatch(/\[data-kind="hunk"\]\s*\{[^}]*color: var\(--pb-code-directive\)/);
    expect(css).toMatch(/\.pb-diff-body\s*\{[^}]*font-family: var\(--pb-font-code\)/);
  });

  it("has a heading button at least 36 px tall with 16 px words on a touch screen", () => {
    const touch = /@media \(hover: none\) and \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(touch?.[1]).toMatch(/\.pb-diff-toggle\s*\{[^}]*min-height:\s*36px/);
    expect(touch?.[1]).toMatch(/font-size:\s*16px/);
  });

  it("turns its chevron on the fast motion token only, which reduced motion zeroes", () => {
    const transitions = [...css.matchAll(/transition:([^;]*);/g)].map((match) => match[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) expect(transition).toMatch(/var\(--pb-motion-fast\)/);
    expect(css).not.toMatch(/animation/);
  });
});
