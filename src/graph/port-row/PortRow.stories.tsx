import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { type Node, type NodeProps, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { expect } from "storybook/test";
import type { LiveSubscribe } from "../../hooks";
import { Meter } from "../meter";
import { PortRow, type PortRowProps } from "./PortRow";

/** An app's own box drawing its ports with PortRow alone: a plain raised card, 220 px wide. */
type RowsNode = Node<{ rows: PortRowProps[] }, "rows">;

function Rows({ data }: NodeProps<RowsNode>) {
  return (
    <div
      style={{
        width: "220px",
        paddingBlock: "var(--pb-space-3)",
        background: "var(--pb-raised)",
        border: "1px solid var(--pb-line)",
        borderRadius: "var(--pb-radius-box)",
      }}
    >
      {data.rows.map((row) => (
        <PortRow key={row.id} {...row} />
      ))}
    </div>
  );
}

const nodeTypes = { rows: Rows };

function Canvas({ rows, height = 260 }: { rows: PortRowProps[]; height?: number }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: `${height}px` }}>
        <ReactFlow
          defaultNodes={[{ id: "card", type: "rows", position: { x: 0, y: 0 }, data: { rows } }]}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 24, y: 24, zoom: 1 }}
        />
      </div>
    </ReactFlowProvider>
  );
}

const quiet: LiveSubscribe = () => () => undefined;

const meta = {
  title: "Graph/PortRow",
  component: PortRow,
  args: { id: "in", side: "input", label: "in", typeLabel: "audio" },
  argTypes: {
    side: { control: "inline-radio", options: ["input", "output"] },
    hint: { control: "select", options: [null, "ok", "no", "origin", "maybe"] },
    trailing: { control: false },
  },
  render: (args) => <Canvas rows={[args]} height={120} />,
} satisfies Meta<typeof PortRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An input: a target handle on the left edge, its label and type. */
export const Input: Story = {
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('[data-handleid="in"]');
    await expect(handle).toHaveClass("react-flow__handle", "target", "pb-port-handle");
  },
};

/** An output: a source handle on the right edge, its words toward it. */
export const Output: Story = { args: { id: "out", side: "output", label: "out" } };

/** A problem with the port: a warning mark beside the label. */
export const Problem: Story = { args: { problem: "Nothing drives it" } };

/** A meter in the trailing slot, toward the box's centre. */
export const Trailing: Story = {
  args: {
    id: "left",
    side: "output",
    label: "left",
    typeLabel: undefined,
    trailing: <Meter subscribe={quiet} read={() => [0.5, 0.25]} label="left level" />,
  },
};

/** A hint it does not know is drawn as no drag. */
export const UnknownHint: Story = {
  args: { hint: "maybe" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".pb-port-handle")).not.toHaveAttribute("data-hint");
  },
};

const rows: PortRowProps[] = [
  { id: "a", side: "input", label: "origin", typeLabel: "audio", hint: "origin" },
  { id: "b", side: "input", label: "accepts", typeLabel: "audio", hint: "ok" },
  { id: "c", side: "input", label: "refuses", typeLabel: "control", hint: "no", reason: "Takes control, not audio" },
  { id: "d", side: "input", label: "no drag", hint: null },
  { id: "e", side: "input", label: "a port with a long name cut short", problem: "Nothing drives it" },
  { id: "f", side: "input", label: "fixed", connectable: false },
  {
    id: "g",
    side: "output",
    label: "out",
    typeLabel: "audio",
    trailing: <Meter subscribe={quiet} read={() => [0.5, 0.25]} label="out level" />,
  },
  { id: "h", side: "output", label: "accepts", hint: "ok" },
];

/** Every hint, a problem, a port that does not connect and a metered output, in one app-drawn card. */
export const All: Story = {
  render: () => <Canvas rows={rows} />,
  play: async ({ canvasElement }) => {
    const hints = [...canvasElement.querySelectorAll(".pb-port-handle")].map((handle) =>
      handle.getAttribute("data-hint"),
    );
    await expect(hints).toEqual(["origin", "ok", "no", null, null, null, null, "ok"]);
  },
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
