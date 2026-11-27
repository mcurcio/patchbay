// A diff: unified diff text drawn line by line, added lines in the added tone and removed ones in the removed tone,
// each keeping its "+" or "-" so the change never rests on colour alone. Given files, each is a section of its own
// under a heading, labelled by its file name with its whole path on hover, that the person can fold away.
import { useId, useState, type ComponentPropsWithRef } from "react";
import { Glyph } from "../../primitives";
import "./DiffView.css";

export type DiffFile = {
  /** The file's path; the section is labelled by its last part. Unique among the files. */
  path: string;
  /** The file's unified diff text. */
  diff: string;
};

/** What a line of unified diff text is, by its start. */
export type DiffLineKind = "add" | "del" | "hunk" | "meta" | "note" | "context";

type DiffSource =
  | {
      /** One unified diff, drawn whole without a heading. */
      diff: string;
      files?: never;
    }
  | {
      /** One section per file, in this order. */
      files: readonly DiffFile[];
      diff?: never;
    };

export type DiffViewProps = Omit<ComponentPropsWithRef<"div">, "children" | "onToggle"> &
  DiffSource & {
    /** The files' headings' level, h2 to h6 (h3 by default). */
    level?: 2 | 3 | 4 | 5 | 6;
    /**
     * The paths of the files folded away. Given, the app holds them and onToggle asks it to change them; left out,
     * the view keeps its own, every file open at first.
     */
    collapsed?: readonly string[];
    /** Called when the person opens (true) or folds (false) a file's section. */
    onToggle?: (path: string, open: boolean) => void;
  };

/** The kind of one line of unified diff text. */
export function diffLineKind(line: string): DiffLineKind {
  if (line.startsWith("+++ ") || line.startsWith("--- ")) return "meta";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  if (line.startsWith("\\")) return "note";
  if (line === "" || line.startsWith(" ")) return "context";
  // A git header line: diff --git, index, new file mode, rename from, similarity index and the like.
  return "meta";
}

/** A path's last part: "src/app/main.ts" is "main.ts". */
export function baseName(path: string): string {
  const parts = path.split("/").filter((part) => part !== "");
  return parts.at(-1) ?? path;
}

function lines(text: string): string[] {
  const all = text.split(/\r?\n/);
  // A diff ends with a newline, which starts no line of its own.
  if (all.length > 0 && all.at(-1) === "") all.pop();
  return all;
}

function DiffBody({ text, id, hidden }: { text: string; id?: string; hidden?: boolean }) {
  return (
    // Focusable, so a wide diff can be scrolled sideways from the keyboard.
    <pre className="pb-diff-body" id={id} hidden={hidden} tabIndex={0}>
      <code className="pb-diff-code">
        {lines(text).map((line, index) => (
          <span key={index} className="pb-diff-line" data-kind={diffLineKind(line)}>
            {line === "" ? " " : line}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function DiffView({ diff, files, level = 3, collapsed, onToggle, className, ...rest }: DiffViewProps) {
  const base = useId();
  const [ownCollapsed, setOwnCollapsed] = useState<readonly string[]>([]);
  const folded = collapsed ?? ownCollapsed;
  const Heading = `h${String(level)}` as "h3";
  const toggle = (path: string, open: boolean) => {
    if (collapsed === undefined) {
      setOwnCollapsed((was) => (open ? was.filter((other) => other !== path) : [...was, path]));
    }
    onToggle?.(path, open);
  };
  return (
    <div {...rest} className={className === undefined ? "pb-diff" : `pb-diff ${className}`}>
      {files === undefined ? (
        <DiffBody text={diff} />
      ) : (
        files.map((file, index) => {
          const open = !folded.includes(file.path);
          const bodyId = `${base}-${String(index)}`;
          return (
            <div key={file.path} className="pb-diff-file" data-open={open || undefined}>
              <Heading className="pb-diff-file-title">
                <button
                  type="button"
                  className="pb-diff-toggle"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  title={file.path}
                  onClick={() => {
                    toggle(file.path, !open);
                  }}
                >
                  <Glyph className="pb-diff-chevron">
                    <path d="M6.5 4.5l3.5 3.5-3.5 3.5" />
                  </Glyph>
                  {baseName(file.path)}
                </button>
              </Heading>
              <DiffBody text={file.diff} id={bodyId} hidden={!open} />
            </div>
          );
        })
      )}
    </div>
  );
}
