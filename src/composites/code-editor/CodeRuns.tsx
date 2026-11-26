// The runs of highlighted text both code views draw: a span per run with a class or a mark, plain text otherwise.
// Internal to the code views; not exported from the layer.
import type { CodeRun } from "./highlight";
import "./CodeRuns.css";

export function CodeRuns({ runs }: { runs: readonly CodeRun[] }) {
  return runs.map((run, index) =>
    run.class === "" && run.mark === undefined ? (
      run.text
    ) : (
      <span key={index} className="pb-code-run" data-class={run.class || undefined} data-mark={run.mark}>
        {run.text}
      </span>
    ),
  );
}
