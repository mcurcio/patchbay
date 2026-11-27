// DiagnosticList: each diagnostic in the order given, in CodeEditor's words, marked by its severity; the count in a
// status line there from the start; a row's press putting the editor's caret at its place and calling onGo; its words
// through labels; and its stylesheet's touch and forced-colours rules.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { type CodeDiagnostic, CodeEditor } from "../code-editor";
import { DiagnosticList, defaultDiagnosticListLabels } from "./DiagnosticList";
import css from "./DiagnosticList.css?raw";

const text = "node a {\n\tgain = 2\n\tmode = loud\n}\n";
const diagnostics: CodeDiagnostic[] = [
  { line: 3, column: 9, severity: "error", code: "E2", message: "unknown mode" },
  { line: 2, severity: "warning", message: "gain above 1 clips" },
  { line: 1, column: 6, severity: "hint", message: "a name could say more" },
];

describe("DiagnosticList", () => {
  it("lists each diagnostic in the order given, in the editor's words, marked by its severity", () => {
    render(<DiagnosticList diagnostics={diagnostics} />);
    const list = screen.getByRole("list", { name: "3 problems" });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Line 3, column 9: error E2: unknown mode",
      "Line 2: warning: gain above 1 clips",
      "Line 1, column 6: hint: a name could say more",
    ]);
    expect(rows.map((row) => row.querySelector(".pb-diagnostic-mark")?.getAttribute("data-mark"))).toEqual([
      "error",
      "warning",
      "other",
    ]);
    expect(rows[0]?.querySelector(".pb-diagnostic-mark")).toHaveAttribute("aria-hidden", "true");
  });

  it("says the count in a status line, there while the list is empty too", () => {
    const { rerender } = render(<DiagnosticList diagnostics={[]} className="mine" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No problems");
    expect(screen.queryByRole("list")).toBeNull();
    expect(status.parentElement).toHaveClass("pb-diagnostic-list", "mine");
    rerender(<DiagnosticList diagnostics={diagnostics.slice(0, 1)} />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("1 problem");
  });

  it("puts the editor's caret at a row's place, focused, and calls onGo", async () => {
    const editor = createRef<HTMLTextAreaElement>();
    const onCaret = vi.fn();
    const onGo = vi.fn();
    render(
      <>
        <CodeEditor aria-label="Text" value={text} diagnostics={diagnostics} onCaret={onCaret} ref={editor} />
        <DiagnosticList diagnostics={diagnostics} editor={editor} onGo={onGo} />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: /unknown mode/ }));
    const box = screen.getByRole("textbox", { name: "Text" });
    expect(box).toHaveFocus();
    expect(box).toHaveProperty("selectionStart", text.indexOf("loud"));
    expect(box).toHaveProperty("selectionEnd", text.indexOf("loud"));
    expect(onCaret).toHaveBeenLastCalledWith({ line: 3, column: 9, offset: text.indexOf("loud") });
    expect(onGo).toHaveBeenCalledWith(diagnostics[0]);
    await userEvent.click(screen.getByRole("button", { name: /gain above/ }));
    expect(box).toHaveProperty("selectionStart", text.indexOf("\tgain"));
  });

  it("calls onGo without an editor", async () => {
    const onGo = vi.fn();
    render(<DiagnosticList diagnostics={diagnostics} onGo={onGo} />);
    await userEvent.click(screen.getByRole("button", { name: /hint/ }));
    expect(onGo).toHaveBeenCalledWith(diagnostics[2]);
  });

  it("takes its words through labels, the editor's wording by default", () => {
    render(
      <DiagnosticList
        diagnostics={diagnostics.slice(1, 2)}
        labels={{ count: (n) => `${String(n)} Meldung`, diagnostic: (d) => `Zeile ${String(d.line)}: ${d.message}` }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 Meldung");
    expect(screen.getByRole("button")).toHaveTextContent("Zeile 2: gain above 1 clips");
    expect(defaultDiagnosticListLabels.count(2)).toBe("2 problems");
  });

  it("grows each row to a full target on touch, and keeps the marks under forced colours", () => {
    expect(css).toMatch(
      /@media \(hover: none\) and \(pointer: coarse\) \{\s*\.pb-diagnostic-go \{\s*min-height: 36px;/,
    );
    expect(css).toMatch(/@media \(forced-colors: active\)[^@]*CanvasText/);
    expect(css).toMatch(/-webkit-tap-highlight-color: transparent;/);
  });
});
