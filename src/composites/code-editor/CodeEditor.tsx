// A text editor for configuration text: a native textarea holds the text, the caret, the selection and every edit; a
// highlighted copy of what it shows is drawn behind it (its glyphs transparent over the copy's) and follows its scroll.
// A gutter beside the box numbers the lines and marks those a diagnostic names; a press on a mark puts the caret
// there. Tab indents and Shift+Tab outdents; Escape, then Tab or Shift+Tab, moves the focus on as usual, so the
// keyboard can always leave. The diagnostics, and how to leave, are read as the textarea's description.
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { CodeRuns } from "./CodeRuns";
import {
  type CodeCaret,
  type CodeDiagnostic,
  type CodeLanguage,
  caretAt,
  codeRuns,
  gutterRows,
  type Highlighter,
  offsetAt,
  shownText,
  useHighlighter,
} from "./highlight";
import "./CodeEditor.css";

/** The editor's own words, each replaceable. */
export interface CodeEditorLabels {
  /** How a diagnostic is read, and shown over its gutter mark: "Line 3, column 5: error E1: message". */
  diagnostic: (diagnostic: CodeDiagnostic) => string;
  /** Read after the editor's name while it can be edited: how Tab works and how to leave. */
  tabKey: string;
}

export const defaultCodeEditorLabels: CodeEditorLabels = {
  diagnostic: ({ line, column, severity, code, message }) =>
    `Line ${String(line)}${column === undefined ? "" : `, column ${String(column)}`}: ${severity}${
      code === undefined || code === "" ? "" : ` ${code}`
    }: ${message}`,
  tabKey: "Tab indents. Press Escape, then Tab, to move on.",
};

export type CodeEditorProps = Omit<ComponentPropsWithRef<"textarea">, "value" | "defaultValue" | "onChange"> & {
  /** The text. CRLF and a lone CR are shown as LF, and an edit gives the text back with LF. */
  value: string;
  /** The person changed the text: the textarea's whole new value. */
  onChange?: (value: string) => void;
  /** A language built in ("knobly"); any other draws plain text. `highlight` wins over it. */
  language?: CodeLanguage;
  /** The app's highlighter, from the shown text to its spans. */
  highlight?: Highlighter;
  /** What the app found in the text, marked in the gutter and under the text, and read with the editor. */
  diagnostics?: readonly CodeDiagnostic[];
  /** The caret moved (by a key, a press, an edit or a gutter mark): its line, column and offset. */
  onCaret?: (caret: CodeCaret) => void;
  /** Show the line-number gutter (true by default). */
  lineNumbers?: boolean;
  /** What Tab inserts, and Shift+Tab takes away from a line's start: a tab by default. */
  indent?: string;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<CodeEditorLabels>;
};

const none: readonly CodeDiagnostic[] = [];

type Pending = { value: string; start: number; end: number };

/** How many leading characters of a line one outdent takes away. */
function outdentOf(line: string, indent: string): number {
  if (indent !== "" && line.startsWith(indent)) return indent.length;
  if (line.startsWith("\t")) return 1;
  const width = indent === "\t" || indent === "" ? 4 : indent.length;
  let spaces = 0;
  while (spaces < width && line[spaces] === " ") spaces += 1;
  return spaces;
}

/**
 * What Tab (or Shift+Tab, `out`) does to a text and its selection: the range it replaces, with what, and the
 * selection after. Tab in one line replaces the selection with the indent; across lines, and Shift+Tab always, it
 * indents or outdents each line the selection touches (empty lines are left alone when indenting). Undefined when
 * nothing would change.
 */
export function tabEdit(
  text: string,
  start: number,
  end: number,
  indent: string,
  out: boolean,
): { from: number; to: number; insert: string; start: number; end: number } | undefined {
  const multiLine = text.slice(start, end).includes("\n");
  if (!out && !multiLine) {
    if (indent === "") return undefined;
    const caret = start + indent.length;
    return { from: start, to: end, insert: indent, start: caret, end: caret };
  }
  const from = text.lastIndexOf("\n", start - 1) + 1;
  // A selection that ends at a line's start does not take that line.
  const last = end > start && text[end - 1] === "\n" ? end - 1 : end;
  const lineEnd = text.indexOf("\n", last);
  const to = lineEnd === -1 ? text.length : lineEnd;
  const lines = text.slice(from, to).split("\n");
  const changed = lines.map((line) => (out ? line.slice(outdentOf(line, indent)) : line === "" ? line : indent + line));
  const insert = changed.join("\n");
  if (insert === text.slice(from, to)) return undefined;
  if (start === end) {
    // A caret moves with its line's text, never before the line's start.
    const delta = (changed[0] ?? "").length - (lines[0] ?? "").length;
    const caret = Math.max(from, start + delta);
    return { from, to, insert, start: caret, end: caret };
  }
  return { from, to, insert, start: from, end: from + insert.length };
}

/**
 * Replaces a textarea's selection through the browser's own editing, which keeps its undo history, so Ctrl+Z takes an
 * indent back as it does a typed character. execCommand is deprecated, but no other API edits a textarea within its
 * undo history; false where the browser has none (or refuses), and the edit is then made by value.
 */
function browserEdit(insert: string): boolean {
  const run = (document as { execCommand?: (command: string, ui: boolean, value?: string) => boolean }).execCommand;
  if (typeof run !== "function") return false;
  return insert === "" ? run.call(document, "delete", false) : run.call(document, "insertText", false, insert);
}

export function CodeEditor({
  value,
  onChange,
  language,
  highlight,
  diagnostics = none,
  onCaret,
  lineNumbers = true,
  indent = "\t",
  labels,
  readOnly = false,
  className,
  style,
  ref,
  onKeyDown,
  onBlur,
  onScroll,
  onSelect,
  "aria-describedby": describedBy,
  ...rest
}: CodeEditorProps) {
  const words = { ...defaultCodeEditorLabels, ...labels };
  const area = useRef<HTMLTextAreaElement | null>(null);
  const layer = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLPreElement>(null);
  const escaped = useRef(false);
  const pending = useRef<Pending | null>(null);
  const lastCaret = useRef<string>("");
  const said = useId();
  const highlighter = useHighlighter(language, highlight);

  const shown = shownText(value);
  const runs = useMemo(() => codeRuns(shown, highlighter?.(shown), diagnostics), [shown, highlighter, diagnostics]);
  const rows = useMemo(() => gutterRows(shown, diagnostics), [shown, diagnostics]);

  const follow = () => {
    const box = area.current;
    if (box === null) return;
    if (layer.current !== null) {
      layer.current.scrollTop = box.scrollTop;
      layer.current.scrollLeft = box.scrollLeft;
    }
    if (gutter.current !== null) gutter.current.scrollTop = box.scrollTop;
  };

  const reportCaret = () => {
    const box = area.current;
    if (box === null || onCaret === undefined) return;
    const offset = box.selectionDirection === "backward" ? box.selectionStart : box.selectionEnd;
    const caret = caretAt(box.value, offset);
    const key = `${String(caret.line)}:${String(caret.column)}:${String(caret.offset)}`;
    if (key === lastCaret.current) return;
    lastCaret.current = key;
    onCaret(caret);
  };

  // After a render (an edit, a new text), put the copy and the gutter where the textarea is scrolled, and the
  // selection where an edit made without the browser's own editing left it.
  useLayoutEffect(() => {
    const box = area.current;
    const wanted = pending.current;
    pending.current = null;
    if (box !== null && wanted !== null && box.value === wanted.value) {
      box.setSelectionRange(wanted.start, wanted.end);
      reportCaret();
    }
    follow();
  });

  const edit = (box: HTMLTextAreaElement, change: NonNullable<ReturnType<typeof tabEdit>>) => {
    box.setSelectionRange(change.from, change.to);
    const done = browserEdit(change.insert);
    if (done) {
      box.setSelectionRange(change.start, change.end);
      reportCaret();
      return;
    }
    const next = box.value.slice(0, change.from) + change.insert + box.value.slice(change.to);
    pending.current = { value: next, start: change.start, end: change.end };
    onChange?.(next);
  };

  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (event.key !== "Tab") {
      if (event.key !== "Shift") escaped.current = false;
      return;
    }
    const wasEscaped = escaped.current;
    escaped.current = false;
    if (wasEscaped || readOnly || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    const box = event.currentTarget;
    const change = tabEdit(box.value, box.selectionStart, box.selectionEnd, indent, event.shiftKey);
    if (change !== undefined) edit(box, change);
  };

  const goTo = (line: number, column: number) => {
    const box = area.current;
    if (box === null) return;
    const offset = offsetAt(box.value, line, column);
    box.focus();
    box.setSelectionRange(offset, offset);
    reportCaret();
  };

  const description = [
    ...(readOnly ? [] : [words.tabKey]),
    ...diagnostics.map((diagnostic) => words.diagnostic(diagnostic)),
  ];
  const describedByAll =
    [describedBy, description.length > 0 ? said : undefined].filter((id) => id !== undefined && id !== "").join(" ") ||
    undefined;
  const digits = String(rows.length).length;

  return (
    <div
      className={className === undefined ? "pb-code-editor" : `pb-code-editor ${className}`}
      style={style}
      data-readonly={readOnly || undefined}
    >
      {lineNumbers ? (
        <pre
          ref={gutter}
          className="pb-code-gutter"
          aria-hidden="true"
          style={{ "--pb-code-gutter-digits": digits } as CSSProperties}
        >
          <code className="pb-code-gutter-code">
            {rows.map((row) => (
              <span key={row.line} className="pb-code-gutter-row">
                {row.line}
                <span
                  className="pb-code-gutter-mark"
                  data-mark={row.mark}
                  title={
                    row.diagnostics.length === 0
                      ? undefined
                      : row.diagnostics.map((diagnostic) => words.diagnostic(diagnostic)).join("\n")
                  }
                  onClick={
                    row.mark === undefined
                      ? undefined
                      : () => {
                          goTo(row.line, row.column);
                        }
                  }
                />
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      ) : null}
      <div className="pb-code-box">
        <pre ref={layer} className="pb-code-layer" aria-hidden="true">
          <code className="pb-code-layer-code">
            <CodeRuns runs={runs} />
            {/* A last empty line keeps its height, as the textarea gives it. */}
            {"\n"}
          </code>
        </pre>
        <textarea
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          {...rest}
          ref={(element) => {
            area.current = element;
            if (typeof ref === "function") return ref(element);
            if (ref) ref.current = element;
            return undefined;
          }}
          className="pb-code-input"
          value={value}
          readOnly={readOnly}
          aria-describedby={describedByAll}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={key}
          onBlur={(event) => {
            escaped.current = false;
            onBlur?.(event);
          }}
          onScroll={(event) => {
            follow();
            onScroll?.(event);
          }}
          onSelect={(event) => {
            reportCaret();
            onSelect?.(event);
          }}
        />
      </div>
      {description.length > 0 ? (
        <div id={said} hidden>
          {description.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
