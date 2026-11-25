// A floating group of tools, such as a canvas's zoom, fit and minimap: a Toolbar drawn as one raised, framed group of
// square buttons. Its tools are IconButtons (or plain <button>s named by aria-label with their
// glyph hidden); a pressed one (aria-pressed) is drawn in the accent. 28 px buttons, 40 px on touch.
import { Toolbar, type ToolbarProps } from "../toolbar";
import "./ToolGroup.css";

export type ToolGroupProps = ToolbarProps;

/** Draws a framed group of square tool buttons, one tab stop with roving focus. */
export function ToolGroup({ className, ...rest }: ToolGroupProps) {
  return <Toolbar {...rest} className={className === undefined ? "pb-tool-group" : `pb-tool-group ${className}`} />;
}
