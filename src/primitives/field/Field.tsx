// A labelled form control: the label, the control (its one child), a hint under it and an error under that. It wires
// the control to them itself: the control gets an id the label points at (its own id if it has one), aria-describedby
// naming the hint and the error (after any ids it already has), and aria-invalid while there is an error. The control
// is any element that passes those props on to its native element, as TextInput, Select and Checkbox do.
import {
  cloneElement,
  isValidElement,
  useId,
  type AriaAttributes,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from "react";
import "./Field.css";

/** stacked (the default: the label above the control) or inline (the label in a column to its left); others stack. */
export type FieldLayout = "stacked" | "inline" | (string & {});

/** The props Field sets on its control. */
export type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

export type FieldProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** What the control is, as its accessible name. */
  label: ReactNode;
  /** Why the value is refused; while there is one the control is marked invalid. Empty means none. */
  error?: ReactNode;
  /** A line of help under the control. */
  hint?: ReactNode;
  layout?: FieldLayout;
  /** The control: one element that passes id and aria props on to its native element. */
  children: ReactElement<FieldControlProps>;
};

function present(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

export function Field({ label, error, hint, layout = "stacked", className, children, ...rest }: FieldProps) {
  const base = useId();
  const control: unknown = children;
  const own = isValidElement<FieldControlProps>(control) ? control.props : undefined;
  const controlId = own?.id ?? `${base}-control`;
  const hintId = present(hint) ? `${base}-hint` : undefined;
  const errorId = present(error) ? `${base}-error` : undefined;
  const describedBy = [own?.["aria-describedby"], hintId, errorId].filter((id) => id !== undefined && id !== "");
  const wired =
    own === undefined
      ? children
      : cloneElement(children, {
          id: controlId,
          "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
          "aria-invalid": errorId !== undefined ? true : own["aria-invalid"],
        });
  return (
    <div
      {...rest}
      className={className === undefined ? "pb-field" : `pb-field ${className}`}
      data-layout={layout}
      data-invalid={errorId !== undefined || undefined}
    >
      <label className="pb-field-label" htmlFor={controlId}>
        {label}
      </label>
      <div className="pb-field-control">
        {wired}
        {hintId !== undefined && (
          <div className="pb-field-hint" id={hintId}>
            {hint}
          </div>
        )}
        {errorId !== undefined && (
          <div className="pb-field-error" id={errorId}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
