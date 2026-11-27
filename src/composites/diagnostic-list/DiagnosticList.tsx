// The diagnostics of a CodeEditor listed in words under it (docs/components.md#code, DiagnosticList): each row a
// button that puts the editor's caret at the diagnostic's place, so what a gutter mark's tooltip says is also written
// out where touch and the keyboard reach it (docs/ux-rules.md#feedback, U47). It shares CodeEditor's diagnostic type
// and its words for one (labels.diagnostic), and marks each row by its severity as the gutter does. A count, in a
// status line there from the start, says how many there are. Where it sits beside the editor is the app's layout.
import { type ComponentPropsWithRef, type RefObject, useId } from "react";
import { type CodeDiagnostic, defaultCodeEditorLabels, markLevel, offsetAt } from "../code-editor";
import "./DiagnosticList.css";

/** The list's own words, each replaceable. */
export interface DiagnosticListLabels {
  /** How a diagnostic is shown and read, CodeEditor's own: "Line 3, column 5: error E1: message". */
  diagnostic: (diagnostic: CodeDiagnostic) => string;
  /** The count in the status line: "No problems", "1 problem", "3 problems". */
  count: (count: number) => string;
}

export const defaultDiagnosticListLabels: DiagnosticListLabels = {
  diagnostic: defaultCodeEditorLabels.diagnostic,
  count: (count) => (count === 0 ? "No problems" : count === 1 ? "1 problem" : `${String(count)} problems`),
};

export type DiagnosticListProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** What the app found in the text, as it gives `CodeEditor`, listed in the order given. */
  diagnostics: readonly CodeDiagnostic[];
  /** The editor's textarea (the `ref` given to `CodeEditor`): a row's press focuses it and puts the caret there. */
  editor?: RefObject<HTMLTextAreaElement | null>;
  /** Called after a row's press with its diagnostic, as when the app must first show the editor. */
  onGo?: (diagnostic: CodeDiagnostic) => void;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<DiagnosticListLabels>;
};

/** Puts the textarea's caret at a diagnostic's line and column, focused, as a press on its gutter mark does. */
function goTo(box: HTMLTextAreaElement, { line, column }: CodeDiagnostic) {
  const offset = offsetAt(box.value, line, column);
  box.focus();
  box.setSelectionRange(offset, offset);
}

/** Lists an editor's diagnostics in words, each a button to its place, under a count. */
export function DiagnosticList({ diagnostics, editor, onGo, labels, className, ...rest }: DiagnosticListProps) {
  const words = { ...defaultDiagnosticListLabels, ...labels };
  const countId = useId();
  return (
    <div
      {...rest}
      className={className === undefined ? "pb-diagnostic-list" : `pb-diagnostic-list ${className}`}
      data-empty={diagnostics.length === 0 ? "" : undefined}
    >
      <p className="pb-diagnostic-count" id={countId} role="status">
        {words.count(diagnostics.length)}
      </p>
      {diagnostics.length > 0 && (
        <ul className="pb-diagnostic-rows" aria-labelledby={countId}>
          {diagnostics.map((diagnostic, index) => (
            <li key={index} className="pb-diagnostic-row">
              <button
                type="button"
                className="pb-diagnostic-go"
                onClick={() => {
                  const box = editor?.current;
                  if (box !== null && box !== undefined) goTo(box, diagnostic);
                  onGo?.(diagnostic);
                }}
              >
                <span className="pb-diagnostic-mark" data-mark={markLevel(diagnostic.severity)} aria-hidden="true" />
                <span className="pb-diagnostic-words">{words.diagnostic(diagnostic)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
