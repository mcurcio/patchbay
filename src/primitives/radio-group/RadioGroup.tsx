// A choice of one: native radios under a legend, in one fieldset (role radiogroup), so the browser gives the arrow
// keys and a single tab stop. Controlled: the app holds the value and every press asks it through onChange. Its hint
// and error are wired as Field wires a control's: aria-describedby names them, and aria-invalid marks the group while
// there is an error.
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import "./RadioGroup.css";

/** stacked (the default: one option a row) or inline (the options side by side, wrapping); others stack. */
export type RadioGroupLayout = "stacked" | "inline" | (string & {});

export type RadioOption = {
  /** The value onChange gives when this option is picked; unique in the group. */
  value: string;
  /** The option's words, which pick it too. */
  label: ReactNode;
  /** Shown on hover over the option. */
  title?: string;
  /** Not pickable. */
  disabled?: boolean;
};

export type RadioGroupProps = Omit<ComponentPropsWithRef<"fieldset">, "children" | "onChange"> & {
  /** What the choice is: the group's legend and accessible name. */
  legend: ReactNode;
  /** Keeps the legend for screen readers only, when the layout around the group already says what it is. */
  legendHidden?: boolean;
  options: readonly RadioOption[];
  /** The picked option's value; one matching no option (or undefined) picks none. */
  value: string | undefined;
  /** Asks the app to pick this value. */
  onChange: (value: string) => void;
  /** The radios' shared name; one of its own by default. */
  name?: string;
  layout?: RadioGroupLayout;
  /** A line of help under the options. */
  hint?: ReactNode;
  /** Why the choice is refused; while there is one the group is marked invalid. Empty means none. */
  error?: ReactNode;
};

function present(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

export function RadioGroup({
  legend,
  legendHidden = false,
  options,
  value,
  onChange,
  name,
  layout = "stacked",
  hint,
  error,
  className,
  "aria-describedby": describedByOwn,
  "aria-invalid": invalidOwn,
  ...rest
}: RadioGroupProps) {
  const base = useId();
  const groupName = name ?? `${base}-name`;
  const hintId = present(hint) ? `${base}-hint` : undefined;
  const errorId = present(error) ? `${base}-error` : undefined;
  const describedBy = [describedByOwn, hintId, errorId].filter((id) => id !== undefined && id !== "");
  return (
    <fieldset
      {...rest}
      role="radiogroup"
      className={className === undefined ? "pb-radio-group" : `pb-radio-group ${className}`}
      data-layout={layout}
      aria-describedby={describedBy.length > 0 ? describedBy.join(" ") : undefined}
      aria-invalid={errorId !== undefined ? true : invalidOwn}
    >
      <legend className="pb-radio-group-legend" data-hidden={legendHidden || undefined}>
        {legend}
      </legend>
      <div className="pb-radio-group-options">
        {options.map((option) => (
          <label
            key={option.value}
            className="pb-radio-row"
            title={option.title}
            data-disabled={option.disabled === true || rest.disabled === true || undefined}
          >
            <input
              className="pb-radio"
              type="radio"
              name={groupName}
              value={option.value}
              checked={option.value === value}
              disabled={option.disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className="pb-radio-label">{option.label}</span>
          </label>
        ))}
      </div>
      {hintId !== undefined && (
        <div className="pb-radio-group-hint" id={hintId}>
          {hint}
        </div>
      )}
      {errorId !== undefined && (
        <div className="pb-radio-group-error" id={errorId}>
          {error}
        </div>
      )}
    </fieldset>
  );
}
