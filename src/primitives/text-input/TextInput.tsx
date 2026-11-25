// A one-line text field in the library's look: a native input (every native prop passes through, ref included), in
// the UI face or the code face. It shows aria-invalid in the error tone, as Field sets it. On a touch screen its text is
// 16 px, as iOS Safari zooms the page when a smaller field takes the focus.
import type { ComponentPropsWithRef } from "react";
import "./TextInput.css";

/** ui (the default) or code, the monospace face for values written as code; others draw as ui. */
export type TextInputFont = "ui" | "code" | (string & {});

export type TextInputProps = ComponentPropsWithRef<"input"> & {
  font?: TextInputFont;
};

export function TextInput({ font = "ui", type = "text", className, ...rest }: TextInputProps) {
  return (
    <input
      {...rest}
      type={type}
      className={className === undefined ? "pb-text-input" : `pb-text-input ${className}`}
      data-font={font}
    />
  );
}
