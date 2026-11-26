import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Field } from "../../primitives";
import { CodeEditor, type CodeEditorProps, defaultCodeEditorLabels, tabEdit } from "./CodeEditor";
import css from "./CodeEditor.css?raw";
import { type CodeDiagnostic, loadKnobly } from "./highlight";

/** The editor holding its own text, as an app does. */
function Held(props: Partial<CodeEditorProps> & { initial?: string; onText?: (text: string) => void }) {
  const { initial = "", onText, ...rest } = props;
  const [text, setText] = useState(initial);
  return (
    <CodeEditor
      aria-label="Config"
      {...rest}
      value={text}
      onChange={(next) => {
        setText(next);
        onText?.(next);
      }}
    />
  );
}

const area = () => screen.getByRole<HTMLTextAreaElement>("textbox");

function layerText(container: HTMLElement) {
  return container.querySelector(".pb-code-layer")?.textContent;
}

describe("CodeEditor", () => {
  it("shows the value in a textarea over a copy that draws it, CRLF as LF, with a last line kept", () => {
    const { container } = render(<CodeEditor aria-label="Config" value={"a\r\nb\n"} className="mine" />);
    expect(container.firstElementChild).toHaveClass("pb-code-editor", "mine");
    expect(area()).toHaveValue("a\nb\n");
    expect(area()).toHaveAttribute("spellcheck", "false");
    expect(area()).toHaveAttribute("wrap", "off");
    expect(layerText(container)).toBe("a\nb\n\n");
    expect(container.querySelector(".pb-code-layer")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives every edit to onChange", async () => {
    const onText = vi.fn();
    render(<Held onText={onText} />);
    await userEvent.type(area(), "ab");
    expect(onText).toHaveBeenLastCalledWith("ab");
  });

  it("numbers each line in a gutter hidden from screen readers, and drops it on request", () => {
    const { container, rerender } = render(<CodeEditor aria-label="Config" value={"a\nb\nc"} />);
    const gutter = container.querySelector(".pb-code-gutter");
    expect(gutter).toHaveAttribute("aria-hidden", "true");
    expect(gutter?.textContent).toBe("1\n2\n3\n");
    expect((gutter as HTMLElement).style.getPropertyValue("--pb-code-gutter-digits")).toBe("1");
    rerender(<CodeEditor aria-label="Config" value={"x\n".repeat(12)} />);
    expect(
      (container.querySelector(".pb-code-gutter") as HTMLElement).style.getPropertyValue("--pb-code-gutter-digits"),
    ).toBe("2");
    rerender(<CodeEditor aria-label="Config" value="x" lineNumbers={false} />);
    expect(container.querySelector(".pb-code-gutter")).toBeNull();
  });

  it("highlights with the app's highlighter, which wins over a language", () => {
    const highlight = vi.fn((text: string) => [{ start: 0, end: text.indexOf(" "), class: "keyword" }]);
    const { container } = render(
      <CodeEditor aria-label="Config" value="on off" language="knobly" highlight={highlight} />,
    );
    expect(highlight).toHaveBeenCalledWith("on off");
    const run = container.querySelector(".pb-code-run");
    expect(run).toHaveAttribute("data-class", "keyword");
    expect(run).toHaveTextContent("on");
  });

  it("highlights knobly once the peer is loaded, and draws an unknown language plainly", async () => {
    await loadKnobly();
    const { container, rerender } = render(<CodeEditor aria-label="Config" value="@set a 1;" language="knobly" />);
    expect(container.querySelector('[data-class="keyword"]')).toHaveTextContent("@set");
    rerender(<CodeEditor aria-label="Config" value="@set a 1;" language="cobol" />);
    expect(container.querySelector(".pb-code-run")).toBeNull();
    expect(layerText(container)).toBe("@set a 1;\n");
  });

  it("marks diagnostics in the gutter and the text, and reads them as the textarea's description", () => {
    const diagnostics: CodeDiagnostic[] = [
      { line: 2, column: 1, severity: "error", message: "unknown word", code: "E1" },
      { line: 2, severity: "warning", message: "long line" },
      { line: 1, severity: "hint", message: "a note" },
    ];
    const { container } = render(
      <CodeEditor aria-label="Config" aria-describedby="mine" value={"one\ntwo three"} diagnostics={diagnostics} />,
    );
    const marks = [...container.querySelectorAll(".pb-code-gutter-mark")];
    expect(marks.map((mark) => mark.getAttribute("data-mark"))).toEqual(["other", "error"]);
    expect(marks[1]).toHaveAttribute("title", "Line 2, column 1: error E1: unknown word\nLine 2: warning: long line");
    expect(container.querySelector('.pb-code-run[data-mark="error"]')).toHaveTextContent("two");
    expect(area().getAttribute("aria-describedby")?.startsWith("mine ")).toBe(true);
    expect(area()).toHaveAccessibleDescription(
      "Tab indents. Press Escape, then Tab, to move on. Line 2, column 1: error E1: unknown word Line 2: warning: long line Line 1: hint: a note",
    );
  });

  it("takes its words through labels", () => {
    render(
      <CodeEditor
        aria-label="Config"
        value="x"
        diagnostics={[{ line: 1, severity: "error", message: "bad" }]}
        labels={{ diagnostic: (d) => `L${String(d.line)} ${d.message}`, tabKey: "Tab: indent" }}
      />,
    );
    expect(area()).toHaveAccessibleDescription("Tab: indent L1 bad");
    expect(defaultCodeEditorLabels.diagnostic({ line: 3, column: 5, severity: "warning", message: "m" })).toBe(
      "Line 3, column 5: warning: m",
    );
  });

  it("puts the caret on a diagnostic's line when its gutter mark is pressed", async () => {
    const onCaret = vi.fn();
    const { container } = render(
      <CodeEditor
        aria-label="Config"
        value={"one\ntwo three"}
        diagnostics={[{ line: 2, column: 5, severity: "error", message: "m" }]}
        onCaret={onCaret}
      />,
    );
    const mark = container.querySelector('.pb-code-gutter-mark[data-mark="error"]');
    if (mark === null) throw new Error("no error mark");
    await userEvent.click(mark);
    expect(area()).toHaveFocus();
    expect(area().selectionStart).toBe(8);
    expect(onCaret).toHaveBeenLastCalledWith({ line: 2, column: 5, offset: 8 });
  });

  it("reports the caret as it moves, once per place", async () => {
    const onCaret = vi.fn();
    render(<Held initial={"ab\ncd"} onCaret={onCaret} />);
    await userEvent.click(area());
    area().setSelectionRange(4, 4);
    fireEvent.select(area());
    expect(onCaret).toHaveBeenLastCalledWith({ line: 2, column: 2, offset: 4 });
    const calls = onCaret.mock.calls.length;
    fireEvent.select(area());
    expect(onCaret).toHaveBeenCalledTimes(calls);
  });

  it("indents with Tab and outdents with Shift+Tab, keeping the focus", async () => {
    const onText = vi.fn();
    render(<Held initial={"a\nb"} onText={onText} />);
    area().focus();
    area().setSelectionRange(0, 0);
    await userEvent.keyboard("{Tab}");
    expect(area()).toHaveValue("\ta\nb");
    expect(area()).toHaveFocus();
    expect(area().selectionStart).toBe(1);
    area().setSelectionRange(0, 4);
    await userEvent.keyboard("{Tab}");
    expect(area()).toHaveValue("\t\ta\n\tb");
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    expect(area()).toHaveValue("\ta\nb");
    expect(area()).toHaveFocus();
  });

  it("lets Tab move on after Escape, and never traps it when read-only", async () => {
    render(
      <>
        <Held initial="a" />
        <button type="button">After</button>
      </>,
    );
    area().focus();
    await userEvent.keyboard("{Escape}{Tab}");
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(area()).toHaveValue("a");
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    expect(area()).toHaveFocus();
    // Escape counts for the next key only.
    await userEvent.keyboard("{Escape}a{Tab}");
    expect(area()).toHaveFocus();
  });

  it("is read-only on request: no edits, Tab moves on, and no Tab words", async () => {
    render(
      <>
        <CodeEditor aria-label="Config" value="a" readOnly />
        <button type="button">After</button>
      </>,
    );
    expect(area()).toHaveAttribute("readonly");
    expect(area()).not.toHaveAccessibleDescription();
    area().focus();
    await userEvent.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("works inside a Field, which names and describes it, and forwards its ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(
      <Field label="Settings" hint="Saved on Enter" error="Two errors">
        <CodeEditor ref={ref} value="x" rows={4} />
      </Field>,
    );
    const box = screen.getByRole("textbox", { name: "Settings" });
    expect(ref.current).toBe(box);
    expect(box).toHaveAttribute("rows", "4");
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription(/^Saved on Enter Two errors Tab indents/);
  });

  it("keeps the copy and gutter where the textarea is scrolled", () => {
    const { container } = render(<CodeEditor aria-label="Config" value={"x\n".repeat(40)} />);
    area().scrollTop = 30;
    area().scrollLeft = 12;
    act(() => {
      fireEvent.scroll(area());
    });
    expect(container.querySelector(".pb-code-layer")?.scrollTop).toBe(30);
    expect(container.querySelector(".pb-code-layer")?.scrollLeft).toBe(12);
    expect(container.querySelector(".pb-code-gutter")?.scrollTop).toBe(30);
  });

  it("drops the copy under forced colours and draws marks by shape", () => {
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*\.pb-code-layer \{\s*display: none;/);
    expect(css).toMatch(/data-mark="warning"\][^}]*rotate\(45deg\)/);
  });
});

describe("tabEdit", () => {
  it("replaces a one-line selection with the indent", () => {
    expect(tabEdit("abc", 1, 2, "  ", false)).toEqual({ from: 1, to: 2, insert: "  ", start: 3, end: 3 });
  });

  it("indents each line a selection touches, skipping empty ones and a last line it only reaches the start of", () => {
    expect(tabEdit("a\n\nb\nc", 0, 5, "\t", false)).toEqual({ from: 0, to: 4, insert: "\ta\n\n\tb", start: 0, end: 6 });
  });

  it("outdents by the indent, a tab, or up to its width of spaces, and keeps a caret on its line", () => {
    expect(tabEdit("\tab", 2, 2, "\t", true)).toEqual({ from: 0, to: 3, insert: "ab", start: 1, end: 1 });
    expect(tabEdit("      ab", 7, 7, "\t", true)).toEqual({ from: 0, to: 8, insert: "  ab", start: 3, end: 3 });
    expect(tabEdit("  ab", 1, 1, "  ", true)).toEqual({ from: 0, to: 4, insert: "ab", start: 0, end: 0 });
    expect(tabEdit("ab", 1, 1, "\t", true)).toBeUndefined();
  });
});
