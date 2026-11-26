import { describe, expect, it } from "vitest";
import {
  caretAt,
  type CodeDiagnostic,
  codeRuns,
  gutterRows,
  lineStarts,
  loadKnobly,
  markLevel,
  markRange,
  offsetAt,
  shownText,
} from "./highlight";

const diagnostic = (line: number, severity: string, column?: number): CodeDiagnostic =>
  column === undefined ? { line, severity, message: "m" } : { line, column, severity, message: "m" };

describe("the shown text", () => {
  it("reads CRLF and a lone CR as LF", () => {
    expect(shownText("a\r\nb\rc\n")).toBe("a\nb\nc\n");
  });

  it("counts an empty text as one line and a last newline as one more", () => {
    expect(lineStarts("")).toEqual([0]);
    expect(lineStarts("ab\ncd\n")).toEqual([0, 3, 6]);
  });

  it("turns offsets into lines and columns and back, clamped to the text", () => {
    const text = "ab\ncd\n";
    expect(caretAt(text, 0)).toEqual({ line: 1, column: 1, offset: 0 });
    expect(caretAt(text, 2)).toEqual({ line: 1, column: 3, offset: 2 });
    expect(caretAt(text, 3)).toEqual({ line: 2, column: 1, offset: 3 });
    expect(caretAt(text, 6)).toEqual({ line: 3, column: 1, offset: 6 });
    expect(caretAt(text, 99)).toEqual({ line: 3, column: 1, offset: 6 });
    expect(caretAt(text, -4)).toEqual({ line: 1, column: 1, offset: 0 });
    expect(offsetAt(text, 2, 2)).toBe(4);
    expect(offsetAt(text, 2, 40)).toBe(5);
    expect(offsetAt(text, 0, 0)).toBe(0);
    expect(offsetAt(text, 9)).toBe(6);
  });
});

describe("runs", () => {
  it("joins back into the text, merging what is drawn the same", () => {
    const text = "key = 1;";
    const runs = codeRuns(text, [
      { start: 0, end: 3, class: "directive" },
      { start: 3, end: 4, class: "space" },
      { start: 6, end: 7, class: "number" },
      { start: 7, end: 8, class: "punctuation" },
    ]);
    expect(runs).toEqual([
      { text: "key", class: "directive" },
      { text: " = ", class: "" },
      { text: "1", class: "number" },
      { text: ";", class: "punctuation" },
    ]);
    expect(runs.map((run) => run.text).join("")).toBe(text);
  });

  it("clips spans to the text, ignores empty ones, and lets a later one win an overlap", () => {
    expect(
      codeRuns("abcd", [
        { start: -3, end: 2, class: "word" },
        { start: 3, end: 3, class: "number" },
        { start: 1, end: 9, class: "string" },
      ]),
    ).toEqual([
      { text: "a", class: "word" },
      { text: "bcd", class: "string" },
    ]);
  });

  it("keeps a class it does not know, for the stylesheet to draw plainly", () => {
    expect(codeRuns("x", [{ start: 0, end: 1, class: "sparkle" }])).toEqual([{ text: "x", class: "sparkle" }]);
  });

  it("marks a diagnostic from its column to the word's end, or the line's text without a column", () => {
    const text = "  set rate 48000;\nnext";
    expect(markRange(text, diagnostic(1, "error", 7))).toEqual({ start: 6, end: 10 });
    expect(markRange(text, diagnostic(1, "error"))).toEqual({ start: 2, end: 17 });
    expect(markRange(text, diagnostic(1, "error", 1))).toEqual({ start: 0, end: 1 });
    expect(markRange(text, diagnostic(1, "error", 99))).toEqual({ start: 17, end: 17 });
    expect(markRange(text, diagnostic(9, "error"))).toEqual({ start: 18, end: 22 });
    expect(codeRuns(text, [], [diagnostic(2, "warning", 1)]).at(-1)).toEqual({
      text: "next",
      class: "",
      mark: "warning",
    });
  });

  it("draws error over warning over any other where marks overlap", () => {
    const runs = codeRuns("one two", [], [diagnostic(1, "note"), diagnostic(1, "error", 5), diagnostic(1, "warning")]);
    expect(runs).toEqual([
      { text: "one ", class: "", mark: "warning" },
      { text: "two", class: "", mark: "error" },
    ]);
  });
});

describe("the gutter", () => {
  it("has a row per line, marking each by its worst severity and going to the first diagnostic's column", () => {
    const rows = gutterRows("a\nb\nc", [
      diagnostic(2, "warning", 3),
      diagnostic(2, "error", 1),
      diagnostic(3, "hint"),
      diagnostic(40, "warning"),
    ]);
    expect(rows.map((row) => [row.line, row.mark, row.column, row.diagnostics.length])).toEqual([
      [1, undefined, 1, 0],
      [2, "error", 3, 2],
      [3, "warning", 1, 2],
    ]);
  });

  it("reads error and warning, and any other severity as other", () => {
    expect([markLevel("error"), markLevel("warning"), markLevel("info"), markLevel("")]).toEqual([
      "error",
      "warning",
      "other",
      "other",
    ]);
  });
});

describe("knobly", () => {
  it("loads the peer's highlighter once", async () => {
    const first = loadKnobly();
    expect(loadKnobly()).toBe(first);
    const highlight = await first;
    expect(highlight).not.toBeNull();
    expect(highlight?.("@set a 1;").map((span) => span.class)).toEqual([
      "keyword",
      "space",
      "word",
      "space",
      "number",
      "punctuation",
    ]);
  });
});
