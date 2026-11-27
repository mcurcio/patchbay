import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";
import { expect, fireEvent, screen, waitFor } from "storybook/test";
import { type Command, CommandPalette } from "../../composites";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { type ContextAt, useContextAt } from "./useContextAt";

const nodes: BoxNode[] = [
  {
    id: "src",
    type: "box",
    position: { x: 0, y: 0 },
    data: { title: "Tone 1", subtitle: "oscillator", outputs: [{ id: "left", label: "left" }] },
  },
  {
    id: "mix",
    type: "box",
    position: { x: 320, y: 40 },
    data: { title: "mix-2", subtitle: "mixer", inputs: [{ id: "in", label: "in" }] },
  },
];

const noop = () => {};

/** The canvas's own commands, after the pressed node's. */
const canvasCommands: Command[] = [
  { id: "add", label: "Add a node here", group: "Canvas", run: noop },
  { id: "fit", label: "Fit the view", group: "Canvas", keys: "F", run: noop },
];

/** A node's commands first, when the press was on one. */
const nodeCommands = (title: string): Command[] => [
  { id: "inspect", label: `Inspect ${title}`, group: title, run: noop },
  { id: "remove", label: `Remove ${title}`, group: title, keys: "Delete", run: noop },
];

/** An app's canvas: a right-click or a long-press opens the palette at the point, the pressed node's commands first. */
function Demo() {
  const [context, setContext] = useState<ContextAt | null>(null);
  const { flowProps } = useContextAt(setContext);
  const title = context?.node === undefined ? undefined : String((context.node.data as { title?: string }).title);
  const commands = title === undefined ? canvasCommands : [...nodeCommands(title), ...canvasCommands];
  return (
    <>
      <div style={{ width: "100%", height: "320px" }}>
        <ReactFlow
          defaultNodes={nodes}
          nodeTypes={storyNodeTypes}
          defaultViewport={{ x: 24, y: 24, zoom: 1 }}
          {...flowProps}
        />
      </div>
      <CommandPalette
        open={context !== null}
        onClose={() => {
          setContext(null);
        }}
        commands={commands}
        {...(context === null ? {} : { at: context.at })}
      />
    </>
  );
}

const meta = {
  title: "Graph/useContextAt",
  render: () => (
    <ReactFlowProvider>
      <Demo />
    </ReactFlowProvider>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const centre = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
};

const nodeEl = (root: HTMLElement, id: string) => {
  const found = root.querySelector(`.react-flow__node[data-id="${id}"]`);
  if (found === null) throw new Error(`no node ${id}`);
  return found;
};

const paneEl = (root: HTMLElement) => {
  const found = root.querySelector(".react-flow__pane");
  if (found === null) throw new Error("no pane");
  return found;
};

/** A right-click on a node: the palette at the point, that node's commands first. */
export const RightClick: Story = {
  play: async ({ canvasElement }) => {
    const at = centre(nodeEl(canvasElement, "mix"));
    await waitFor(() => expect(nodeEl(canvasElement, "mix")).toBeVisible());
    await fireEvent.contextMenu(nodeEl(canvasElement, "mix"), at);
    const palette = await screen.findByRole("dialog", { name: "Commands" });
    const options = screen.getAllByRole("option");
    await expect(options[0]).toHaveTextContent("Inspect mix-2");
    const box = palette.getBoundingClientRect();
    await expect(Math.round(box.left)).toBe(Math.round(at.clientX));
    await expect(Math.round(box.top)).toBe(Math.round(at.clientY));
  },
};

/** Under the example harbor brand in dark. */
export const RightClickHarborDark: Story = { ...RightClick, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const RightClickEmberLight: Story = { ...RightClick, globals: { brand: "ember", theme: "light" } };

/** A long-press on empty canvas, as on a touch screen: the palette at the point, with the canvas's commands. */
export const LongPress: Story = {
  play: async ({ canvasElement }) => {
    const pane = paneEl(canvasElement);
    const rect = pane.getBoundingClientRect();
    const at = { clientX: rect.left + 200, clientY: rect.top + 240 };
    pane.dispatchEvent(
      new PointerEvent("pointerdown", { ...at, bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true }),
    );
    await screen.findByRole("dialog", { name: "Commands" }, { timeout: 3000 });
    pane.dispatchEvent(
      new PointerEvent("pointerup", { ...at, bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true }),
    );
    await expect(screen.getAllByRole("option")[0]).toHaveTextContent("Add a node here");
  },
};
