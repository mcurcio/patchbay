// A drop-down choice in the library's look: a native select (every native prop passes through, ref included; its
// options are its children), so the platform's own list opens, the keyboard works as the platform's does, and a phone
// shows its picker. It shows aria-invalid in the error tone, as Field sets it. On a touch screen its text is 16 px, as
// iOS Safari zooms the page when a smaller field takes the focus.
import type { ComponentPropsWithRef } from "react";
import "./Select.css";

/** ui (the default) or code, the monospace face for values written as code; others draw as ui. */
export type SelectFont = "ui" | "code" | (string & {});

export type SelectProps = ComponentPropsWithRef<"select"> & {
  font?: SelectFont;
};

export function Select({ font = "ui", className, children, ...rest }: SelectProps) {
  return (
    <select {...rest} className={className === undefined ? "pb-select" : `pb-select ${className}`} data-font={font}>
      {children}
    </select>
  );
}
