// Read-only highlighted code: the text in code type on the read-only code surface, highlighted by knobly's highlighter
// (language "knobly", loaded from the optional knobly peer) or the app's own. Long lines scroll sideways; the box is a
// tab stop, so it scrolls from the keyboard too.
import { type ComponentPropsWithRef, useMemo } from "react";
import { CodeRuns } from "./CodeRuns";
import { type CodeLanguage, codeRuns, type Highlighter, shownText, useHighlighter } from "./highlight";
import "./CodeText.css";

export type CodeTextProps = Omit<ComponentPropsWithRef<"pre">, "children"> & {
  /** The text; CRLF and a lone CR are drawn as LF. */
  value: string;
  /** A language built in ("knobly"); any other draws plain text. `highlight` wins over it. */
  language?: CodeLanguage;
  /** The app's highlighter, from the shown text to its spans. */
  highlight?: Highlighter;
};

export function CodeText({ value, language, highlight, className, ...rest }: CodeTextProps) {
  const highlighter = useHighlighter(language, highlight);
  const runs = useMemo(() => {
    const shown = shownText(value);
    return codeRuns(shown, highlighter?.(shown));
  }, [value, highlighter]);
  return (
    <pre tabIndex={0} {...rest} className={className === undefined ? "pb-code-text" : `pb-code-text ${className}`}>
      <code className="pb-code-text-code">
        <CodeRuns runs={runs} />
      </code>
    </pre>
  );
}
