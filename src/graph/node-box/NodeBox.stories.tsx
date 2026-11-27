import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { type Edge, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState } from "@xyflow/react";
import { expect, waitFor } from "storybook/test";
import type { LiveSubscribe } from "../../hooks";
import { Badge, Button, Pill } from "../../primitives";
import { type BoxNode, StoryCanvas, storyNodeTypes } from "../../test/story-canvas";
import { tokenColor } from "../../test/token-color";
import { Meter } from "../meter";
import { nodeBoxSize } from "./geometry";
import { NodeBox, type NodeBoxProps, type PortSpec } from "./NodeBox";

/** A level that stays put, for a meter in a port's trailing slot. */
function steady(peakDb: number, rmsDb: number) {
  const value = [10 ** (peakDb / 20), 10 ** (rmsDb / 20)] as const;
  const subscribe: LiveSubscribe = () => () => undefined;
  return { subscribe, read: () => value };
}

const node = (id: string, x: number, y: number, data: BoxNode["data"], selected = false): BoxNode => ({
  id,
  type: "box",
  position: { x, y },
  data,
  selected,
});

/** The level node: a source with two metered outputs, a status and a footer of facts. */
const levelNode: BoxNode["data"] = {
  title: "Tone 1",
  subtitle: "oscillator",
  tone: "ok",
  status: <Pill tone="ok" label="running" />,
  outputs: [
    { id: "left", label: "left", trailing: <Meter {...steady(-9, -15)} label="left level" /> },
    { id: "right", label: "right", trailing: <Meter {...steady(-12, -18)} label="right level" /> },
  ],
  footer: (
    <>
      <Badge tone="muted">48 kHz</Badge>
      <Badge tone="muted">2 ch</Badge>
    </>
  ),
};

/** The staged-edit node: typed ports side by side, added but not yet applied, drawn while a wire is dragged. */
const stagedNode: BoxNode["data"] = {
  title: "mix-2",
  subtitle: "mixer",
  change: "added",
  ports: "side-by-side",
  inputs: [
    { id: "in", label: "in", typeLabel: "audio", hint: "ok" },
    {
      id: "side",
      label: "side",
      typeLabel: "control",
      hint: "no",
      reason: "Takes control, not audio",
      problem: "Nothing drives it",
    },
  ],
  outputs: [{ id: "out", label: "out", typeLabel: "audio" }],
};

const meta = {
  title: "Graph/NodeBox",
  component: NodeBox,
  args: { title: "node-1" },
  argTypes: {
    tone: { control: "select", options: ["ok", "warn", "err", "quiet", "off", "accent", "muted", "sparkly"] },
    change: { control: "select", options: [undefined, "added", "removed", "renamed", "changed", "moved"] },
    ports: { control: "inline-radio", options: ["stacked", "side-by-side"] },
    status: { control: false },
    footer: { control: false },
    inputs: { control: false },
    outputs: { control: false },
  },
  render: ({ selected, ...args }) => <StoryCanvas nodes={[node("n", 0, 0, args, selected)]} />,
} satisfies Meta<typeof NodeBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A level node: a status pill, two outputs with a meter each, and a footer of badges. */
export const LevelNode: Story = {
  args: levelNode,
  play: async ({ canvas }) => {
    const box = await canvas.findByRole("group", { name: "Tone 1" });
    await expect(canvas.getAllByRole("img")).toHaveLength(2);
    await expect(box.querySelectorAll(".react-flow__handle.source")).toHaveLength(2);
  },
};

/** A staged edit: added and not yet applied, typed ports side by side, one refusing the wire being dragged. */
export const StagedEdit: Story = {
  args: stagedNode,
  play: async ({ canvas }) => {
    const box = await canvas.findByRole("group", { name: "mix-2" });
    await expect(canvas.getByText("added")).toHaveClass("pb-badge");
    await expect(box.querySelector('[data-handleid="in"]')).toHaveAttribute("data-hint", "ok");
    await expect(box.querySelector('[data-handleid="side"]')).toHaveAttribute("title", "Takes control, not audio");
  },
};

/** A tone it does not know: its stripe in line-strong. */
export const UnknownTone: Story = {
  render: () => (
    <StoryCanvas height={160} nodes={[node("n", 0, 0, { title: "node-1", subtitle: "tone", tone: "sparkly" })]} />
  ),
  play: async ({ canvasElement }) => {
    const box = await waitFor(() => {
      const found = canvasElement.querySelector(".pb-node-box");
      if (found === null) throw new Error("no node yet");
      return found;
    });
    await expect(box).toHaveAttribute("data-tone", "sparkly");
    await expect(getComputedStyle(box, "::before").backgroundColor).toBe(tokenColor(canvasElement, "line-strong"));
  },
};

/** Every tone's stripe, and one it does not know in --pb-line-strong. */
export const Tones: Story = {
  render: () => (
    <StoryCanvas
      height={420}
      nodes={["ok", "warn", "err", "quiet", "off", "accent", "muted", "sparkly"].map((tone, index) =>
        node(tone, (index % 4) * 200, Math.floor(index / 4) * 90, { title: tone, subtitle: "tone", tone, width: 180 }),
      )}
    />
  ),
};

/** Each change not yet applied, and one it does not know, drawn by its own word. */
export const Changes: Story = {
  render: () => (
    <StoryCanvas
      height={420}
      nodes={["added", "removed", "renamed", "changed", "moved"].map((change, index) =>
        node(change, (index % 3) * 260, Math.floor(index / 3) * 90, {
          title: `node-${index + 1}`,
          subtitle: "filter",
          change,
        }),
      )}
    />
  ),
  play: async ({ canvas }) => {
    for (const word of ["added", "removed", "renamed", "changed", "moved"]) {
      await expect(canvas.getByText(word)).toHaveClass("pb-badge");
    }
  },
};

/** The change's words are the app's, through `labels`. */
export const Labels: Story = {
  args: { title: "gain", subtitle: "filter", change: "removed", labels: { removed: "to delete" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("to delete")).toHaveClass("pb-badge");
  },
};

/** Disabled: a dashed border, the stripe hatched, the words muted. */
export const Disabled: Story = { args: { ...levelNode, disabled: true, status: <Pill tone="off" label="off" /> } };

/** Failed: the border in the error tone, the header on its soft surface, and why in the line. */
export const Failed: Story = {
  args: {
    ...levelNode,
    tone: "err",
    failed: true,
    line: "The device went away",
    status: <Pill tone="err" label="failed" />,
  },
};

/** Failed and disabled: both looks. */
export const FailedAndDisabled: Story = {
  args: { ...levelNode, tone: "err", failed: true, disabled: true, line: "The device went away" },
};

/** Selected: a 2 px outline in the accent. */
export const Selected: Story = { args: { ...levelNode, selected: true } };

/** A line saying why the node is silent, cut with an ellipsis, the whole of it in the tooltip. */
export const Line: Story = {
  args: { ...levelNode, tone: "warn", line: "Waiting for the upstream source to start sending a signal" },
};

/** A layout it does not know is stacked. */
export const UnknownLayout: Story = { args: { ...stagedNode, ports: "diagonal" } };

/** A wider box, by the width prop. */
export const Wide: Story = { args: { ...levelNode, width: 320 } };

/** The keyboard: React Flow's node wrapper takes the focus and the box shows it; the box adds no tab stop. */
export const Keyboard: Story = {
  args: { ...stagedNode },
  play: async ({ canvas, userEvent }) => {
    const box = await canvas.findByRole("group", { name: "mix-2" });
    await userEvent.tab();
    await expect(document.activeElement).toBe(box.parentElement);
    await expect(getComputedStyle(box).outlineStyle).toBe("solid");
    await expect(box.querySelectorAll("[tabindex], a, button, input, select, textarea")).toHaveLength(0);
  },
};

const noEdges: Edge[] = [];

/** A port added at run time: NodeBox asks React Flow to measure the node again, so a wire to it is drawn. */
function GrowingPortsDemo() {
  const outputs: PortSpec[] = [{ id: "main", label: "main" }];
  const [nodes, setNodes, onNodesChange] = useNodesState<BoxNode>([
    node("src", 0, 0, { title: "split-1", subtitle: "splitter", outputs }),
    node("dst", 320, 0, { title: "sink-1", subtitle: "output", inputs: [{ id: "in", label: "in" }] }),
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(noEdges);
  const addPort = () => {
    setNodes((current) =>
      current.map((each) =>
        each.id === "src"
          ? { ...each, data: { ...each.data, outputs: [...outputs, { id: "aux", label: "aux" }] } }
          : each,
      ),
    );
    setEdges([{ id: "aux-in", source: "src", sourceHandle: "aux", target: "dst", targetHandle: "in" }]);
  };
  return (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <Button onClick={addPort}>Add a port</Button>
      <ReactFlowProvider>
        <div style={{ width: "100%", height: "240px" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={storyNodeTypes}
            defaultViewport={{ x: 24, y: 24, zoom: 1 }}
          />
        </div>
      </ReactFlowProvider>
    </div>
  );
}

export const GrowingPorts: Story = {
  render: () => <GrowingPortsDemo />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add a port" }));
    await waitFor(() => expect(canvasElement.querySelector('[data-id="aux-in"] path')).not.toBeNull());
  },
};

/** Shapes whose rendered size is checked against nodeBoxSize, the formula layout code uses. */
const measured: { id: string; data: BoxNode["data"] }[] = [
  { id: "bare", data: { title: "bare" } },
  { id: "level", data: levelNode },
  { id: "staged", data: stagedNode },
  {
    id: "stacked",
    data: {
      title: "route-3",
      subtitle: "router",
      line: "No input yet",
      inputs: [
        { id: "a", label: "a" },
        { id: "b", label: "b" },
      ],
      outputs: [{ id: "out", label: "out" }],
      footer: <Badge tone="muted">idle</Badge>,
      width: 200,
    },
  },
];

function shapeOf(data: Pick<NodeBoxProps, "inputs" | "outputs" | "ports" | "line" | "footer" | "width">) {
  return {
    inputs: data.inputs?.length ?? 0,
    outputs: data.outputs?.length ?? 0,
    ports: data.ports ?? "stacked",
    line: data.line !== undefined,
    footer: data.footer !== undefined,
    width: data.width,
  };
}

/** A level node, a staged edit, a bare box and a stacked one with a line and a footer, each measured. */
export const All: Story = {
  render: () => (
    <StoryCanvas
      height={460}
      nodes={measured.map(({ id, data }, index) => node(id, (index % 2) * 300, Math.floor(index / 2) * 200, data))}
    />
  ),
  play: async ({ canvasElement }) => {
    for (const { id, data } of measured) {
      const box = canvasElement.querySelector<HTMLElement>(`[data-id="${id}"] .pb-node-box`);
      if (box === null) throw new Error(`no box for ${id}`);
      const size = nodeBoxSize(shapeOf(data));
      await expect({ id, width: box.offsetWidth, height: box.offsetHeight }).toEqual({ id, ...size });
    }
  },
};

/** The same set under the example harbor brand in dark: the sizes hold, since a brand may not change them. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light, whose text is a point larger. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
