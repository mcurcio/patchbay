// A tick box: a native checkbox (every native prop passes through, ref included, and id and aria props reach the
// input, so Field can wire it), ticked in the accent. With a label it is wrapped in its own label, so a press on the
// words ticks it too, and the row is a target a finger can find. Indeterminate (some of a group ticked) is a prop,
// since HTML has it only as a DOM property.
import { useCallback, useLayoutEffect, useRef, type ComponentPropsWithRef, type ReactNode, type Ref } from "react";
import "./Checkbox.css";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  /** The words beside the box, which tick it too; without them, name the box by a Field or aria-label. */
  label?: ReactNode;
  /** Neither ticked nor not: drawn as a dash and read as "mixed". */
  indeterminate?: boolean;
};

function assign<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref !== null && ref !== undefined) ref.current = value;
}

export function Checkbox({ label, indeterminate = false, className, ref, ...rest }: CheckboxProps) {
  const own = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      own.current = node;
      assign(ref, node);
    },
    [ref],
  );
  useLayoutEffect(() => {
    if (own.current !== null) own.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const box = (
    <input
      {...rest}
      ref={setRef}
      type="checkbox"
      className={label === undefined && className !== undefined ? `pb-checkbox ${className}` : "pb-checkbox"}
    />
  );
  if (label === undefined) return box;
  return (
    <label
      className={className === undefined ? "pb-checkbox-row" : `pb-checkbox-row ${className}`}
      data-disabled={rest.disabled === true || undefined}
    >
      {box}
      <span className="pb-checkbox-label">{label}</span>
    </label>
  );
}
