// The code views' text, pure: the text as a textarea shows it, cut into runs by a highlighter's spans and the
// diagnostics' marks, the gutter's rows, and lines and columns to offsets and back. It also loads knobly's highlighter,
// the one language built in, from the optional knobly peer, only when a view asks for it.
import { useEffect, useState } from "react";

/** A highlighter's span: offsets into the shown text (`end` exclusive) and its class. */
export type CodeSpan = {
  readonly start: number;
  readonly end: number;
  /**
   * How it is drawn: "directive", "keyword", "word", "variable", "number", "string", "comment", "punctuation" or
   * "error" have a colour each; "space", "" and any other class are drawn as plain text.
   */
  readonly class: string;
};

/** A highlighter: the text, as shown (LF line breaks), to its spans. Pure and total. */
export type Highlighter = (text: string) => readonly CodeSpan[];

/** A language built in: "knobly"; any other is drawn as plain text unless a highlighter is given. */
export type CodeLanguage = "knobly" | (string & {});

/** How bad a diagnostic is: "error" and "warning" have their own mark; any other is drawn neutrally. */
export type CodeSeverity = "error" | "warning" | (string & {});

/** Something the app found in the text: a line (from 1) and an optional column (from 1, in UTF-16 code units). */
export type CodeDiagnostic = {
  line: number;
  column?: number;
  severity: CodeSeverity;
  message: string;
  /** The app's own code for it, read with the message. */
  code?: string;
};

/** Where the caret is: a line and a column, both from 1, and its offset into the shown text. */
export type CodeCaret = { line: number; column: number; offset: number };

/** The mark a severity draws. */
export type CodeMarkLevel = "error" | "warning" | "other";

/** One run of shown text, drawn in one class with at most one mark. */
export type CodeRun = { text: string; class: string; mark?: CodeMarkLevel };

/** One gutter row per shown line, with its diagnostics in the order given. */
export type CodeGutterRow = {
  line: number;
  mark?: CodeMarkLevel;
  /** Where a press on its mark puts the caret: the first diagnostic's column, else 1. */
  column: number;
  diagnostics: CodeDiagnostic[];
};

/**
 * The text as a textarea shows it: a textarea holds LF line breaks only, so CRLF and a lone CR are drawn as LF. The
 * value itself is never changed.
 */
export function shownText(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** Where each line of shown text starts. "" is one line, and a last newline starts an empty one after it. */
export function lineStarts(shown: string): number[] {
  const starts = [0];
  for (let at = shown.indexOf("\n"); at !== -1; at = shown.indexOf("\n", at + 1)) starts.push(at + 1);
  return starts;
}

/** The caret at an offset into the shown text, clamped to the text. */
export function caretAt(shown: string, offset: number): CodeCaret {
  const at = Math.min(shown.length, Math.max(0, Math.trunc(offset)));
  const starts = lineStarts(shown);
  let line = 0;
  while (line + 1 < starts.length && (starts[line + 1] ?? Infinity) <= at) line += 1;
  return { line: line + 1, column: at - (starts[line] ?? 0) + 1, offset: at };
}

/** The offset of a line and column (both from 1) into the shown text, each clamped to the text. */
export function offsetAt(shown: string, line: number, column = 1): number {
  const starts = lineStarts(shown);
  const index = Math.min(starts.length, Math.max(1, Math.trunc(line))) - 1;
  const start = starts[index] ?? 0;
  const end = index + 1 < starts.length ? (starts[index + 1] ?? 0) - 1 : shown.length;
  return Math.min(end, start + Math.max(1, Math.trunc(column)) - 1);
}

/** The mark a severity draws: error, warning, or a neutral one for any other. */
export function markLevel(severity: string): CodeMarkLevel {
  return severity === "error" ? "error" : severity === "warning" ? "warning" : "other";
}

const rank: Record<CodeMarkLevel, number> = { other: 1, warning: 2, error: 3 };

function worse(a: CodeMarkLevel | undefined, b: CodeMarkLevel): CodeMarkLevel {
  return a !== undefined && rank[a] >= rank[b] ? a : b;
}

/** A diagnostic's mark in the shown text: from its column to the word's end, or the line's text without a column. */
export function markRange(shown: string, diagnostic: CodeDiagnostic): { start: number; end: number } {
  const starts = lineStarts(shown);
  const index = Math.min(starts.length, Math.max(1, Math.trunc(diagnostic.line))) - 1;
  const lineStart = starts[index] ?? 0;
  const lineEnd = index + 1 < starts.length ? (starts[index + 1] ?? 0) - 1 : shown.length;
  if (diagnostic.column === undefined) {
    let start = lineStart;
    let end = lineEnd;
    while (start < end && /\s/.test(shown[start] ?? "")) start += 1;
    while (end > start && /\s/.test(shown[end - 1] ?? "")) end -= 1;
    return { start, end };
  }
  const start = offsetAt(shown, index + 1, diagnostic.column);
  let end = start;
  while (end < lineEnd && !/\s/.test(shown[end] ?? "")) end += 1;
  // A column on white space marks that one character; one past the line's end marks nothing.
  if (end === start && start < lineEnd) end = start + 1;
  return { start, end };
}

/**
 * The shown text cut into runs by the spans (clipped to the text, empty ones ignored; where two overlap, the later
 * one wins) and the diagnostics' marks (where two overlap, error over warning over any other). Joined, the runs are
 * the shown text exactly.
 */
export function codeRuns(
  shown: string,
  spans: readonly CodeSpan[] = [],
  diagnostics: readonly CodeDiagnostic[] = [],
): CodeRun[] {
  const classes = [""];
  const classAt = new Uint16Array(shown.length);
  for (const span of spans) {
    const start = Math.max(0, Math.trunc(span.start));
    const end = Math.min(shown.length, Math.trunc(span.end));
    if (!(end > start)) continue;
    const name = span.class === "space" ? "" : span.class;
    let index = classes.indexOf(name);
    if (index === -1) index = classes.push(name) - 1;
    classAt.fill(index, start, end);
  }
  const levels: (CodeMarkLevel | undefined)[] = [undefined, "other", "warning", "error"];
  const markAt = new Uint8Array(shown.length);
  for (const diagnostic of diagnostics) {
    const { start, end } = markRange(shown, diagnostic);
    const level = rank[markLevel(diagnostic.severity)];
    for (let at = start; at < end; at += 1) markAt[at] = Math.max(markAt[at] ?? 0, level);
  }
  const runs: CodeRun[] = [];
  let from = 0;
  for (let at = 1; at <= shown.length; at += 1) {
    if (at < shown.length && classAt[at] === classAt[from] && markAt[at] === markAt[from]) continue;
    const mark = levels[markAt[from] ?? 0];
    const run: CodeRun = { text: shown.slice(from, at), class: classes[classAt[from] ?? 0] ?? "" };
    if (mark !== undefined) run.mark = mark;
    runs.push(run);
    from = at;
  }
  return runs;
}

/** One row per shown line; a diagnostic's line is clamped to the text, so one past the end marks the last line. */
export function gutterRows(shown: string, diagnostics: readonly CodeDiagnostic[] = []): CodeGutterRow[] {
  const count = lineStarts(shown).length;
  const rows = Array.from({ length: count }, (_, index): CodeGutterRow => ({
    line: index + 1,
    column: 1,
    diagnostics: [],
  }));
  for (const diagnostic of diagnostics) {
    const row = rows[Math.min(count, Math.max(1, Math.trunc(diagnostic.line))) - 1];
    if (row === undefined) continue;
    if (row.diagnostics.length === 0) row.column = diagnostic.column ?? 1;
    row.diagnostics.push(diagnostic);
    row.mark = worse(row.mark, markLevel(diagnostic.severity));
  }
  return rows;
}

let knoblyLoad: Promise<Highlighter | null> | undefined;
let knoblyReady: Highlighter | null | undefined;

/**
 * Loads knobly's highlighter from the optional knobly peer, once for the page; null when knobly is not installed (the
 * view then draws plain text, and says so once on the console).
 */
export function loadKnobly(): Promise<Highlighter | null> {
  knoblyLoad ??= import("knobly/highlight").then(
    (module): Highlighter => (knoblyReady = module.highlight),
    (error: unknown) => {
      console.warn('patchbay: language "knobly" needs the knobly package; drawing plain text.', error);
      knoblyReady = null;
      return null;
    },
  );
  return knoblyLoad;
}

/**
 * The highlighter a view draws with: the app's `highlight` when given, else knobly's for language "knobly" (once
 * loaded; plain text until then), else none.
 */
export function useHighlighter(language: CodeLanguage | undefined, highlight: Highlighter | undefined) {
  const wantsKnobly = highlight === undefined && language === "knobly";
  // Kept in a box: React would call a function given to useState or its setter.
  const [loaded, setLoaded] = useState<{ highlight: Highlighter | null } | undefined>(undefined);
  useEffect(() => {
    if (!wantsKnobly || knoblyReady !== undefined) return;
    let live = true;
    void loadKnobly().then((found) => {
      if (live) setLoaded({ highlight: found });
    });
    return () => {
      live = false;
    };
  }, [wantsKnobly]);
  if (highlight !== undefined) return highlight;
  return wantsKnobly ? (knoblyReady ?? loaded?.highlight ?? undefined) : undefined;
}
