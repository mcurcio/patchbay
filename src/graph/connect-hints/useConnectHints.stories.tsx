import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { addEdge, type Connection, type Edge, ReactFlow, ReactFlowProvider, useEdgesState } from "@xyflow/react";
import { useState } from "react";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { Field, Panel, Select } from "../../primitives";
import { measuredHandle } from "../../test/measured-handle";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { Wire } from "../wire";
import { type ConnectCandidate, connectTargets } from "./connectTargets";
import { mergeFlowProps } from "./mergeFlowProps";
import { type CanConnect, ConnectHints, useConnectHints } from "./useConnectHints";

/** Each port's type, by node and handle: the app's own rule reads its graph, here a table. */
const types: Record<string, string> = {
  "src/left": "audio",
  "src/right": "audio",
  "src/gate": "control",
  "mix/in": "audio",
  "mix/side": "control",
  "mix/aux": "audio",
};

const typeOf = (nodeId: string, handleId: string | null) => types[`${nodeId}/${handleId ?? ""}`];

/** Joins ports of one type; refuses others with the reason, and a node to itself plainly. */
const canConnect: CanConnect = (from, to) => {
  if (from.nodeId === to.nodeId) return false;
  const [out, into] = [typeOf(from.nodeId, from.handleId), typeOf(to.nodeId, to.handleId)];
  return out === into || `Takes ${into ?? "nothing"}, not ${out ?? "nothing"}`;
};

const nodes: BoxNode[] = [
  {
    id: "src",
    type: "box",
    position: { x: 0, y: 0 },
    data: {
      title: "Tone 1",
      subtitle: "oscillator",
      outputs: [
        { id: "left", label: "left", typeLabel: "audio" },
        { id: "right", label: "right", typeLabel: "audio" },
        { id: "gate", label: "gate", typeLabel: "control" },
      ],
    },
  },
  {
    id: "mix",
    type: "box",
    position: { x: 360, y: 0 },
    data: {
      title: "mix-2",
      subtitle: "mixer",
      change: "added",
      inputs: [
        { id: "in", label: "in", typeLabel: "audio" },
        { id: "side", label: "side", typeLabel: "control" },
        { id: "aux", label: "aux", typeLabel: "audio", hint: "no", reason: "Held by the app" },
      ],
    },
  },
];

const edgeTypes = { wire: Wire };
const startEdges: Edge[] = [];

/** An app's canvas: the hints wrap <ReactFlow>, and its own connect handler joins the drop. */
function Demo() {
  const hints = useConnectHints(canConnect);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);
  const onConnect = (connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, type: "wire" }, current));
  };
  return (
    <ConnectHints value={hints.value}>
      <ReactFlowProvider>
        <div style={{ width: "100%", height: "260px" }}>
          <ReactFlow
            defaultNodes={nodes}
            edges={edges}
            onEdgesChange={onEdgesChange}
            nodeTypes={storyNodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={{ x: 24, y: 24, zoom: 1 }}
            {...mergeFlowProps(hints.flowProps, { onConnect })}
          />
        </div>
      </ReactFlowProvider>
    </ConnectHints>
  );
}

const meta = {
  title: "Graph/useConnectHints",
  render: () => <Demo />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const handle = measuredHandle;

const centre = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
};

/**
 * Drag a wire from an output: the inputs that take it show ok, the others no with their reason, the outputs nothing.
 * A row's own hint (aux, held by the app) wins over the drag's. Dropping on an ok input joins them.
 */
export const Drag: Story = {
  play: async ({ canvasElement }) => {
    const left = await handle(canvasElement, "src", "left");
    const into = await handle(canvasElement, "mix", "in");
    const side = await handle(canvasElement, "mix", "side");
    const aux = await handle(canvasElement, "mix", "aux");
    const right = await handle(canvasElement, "src", "right");
    await expect(into).not.toHaveAttribute("data-hint");

    const from = centre(left);
    await fireEvent.mouseDown(left, { ...from, button: 0 });
    await fireEvent.mouseMove(document, { clientX: from.clientX + 40, clientY: from.clientY + 4 });
    await waitFor(() => expect(left).toHaveAttribute("data-hint", "origin"));
    await expect(into).toHaveAttribute("data-hint", "ok");
    await expect(side).toHaveAttribute("data-hint", "no");
    await expect(side).toHaveAttribute("title", "Takes control, not audio");
    await expect(aux).toHaveAttribute("title", "Held by the app");
    await expect(right).not.toHaveAttribute("data-hint");

    const to = centre(into);
    await fireEvent.mouseMove(document, to);
    await fireEvent.mouseUp(document, to);
    await waitFor(() => expect(into).not.toHaveAttribute("data-hint"));
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-wire")).toHaveLength(1));
  },
};

/** Under the example harbor brand in dark. */
export const DragHarborDark: Story = { globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const DragEmberLight: Story = { globals: { brand: "ember", theme: "light" } };

/** Every port on the canvas, as the app's graph lists them: the candidates a "Connect to" choice is judged from. */
const ports: (ConnectCandidate & { label: string })[] = nodes.flatMap((node) => [
  ...(node.data.inputs ?? []).map((p) => ({
    nodeId: node.id,
    handleId: p.id,
    side: "input" as const,
    label: p.label as string,
  })),
  ...(node.data.outputs ?? []).map((p) => ({
    nodeId: node.id,
    handleId: p.id,
    side: "output" as const,
    label: p.label as string,
  })),
]);

const nameOf = (port: ConnectCandidate) => {
  const node = nodes.find((n) => n.id === port.nodeId);
  const label = ports.find((p) => p.nodeId === port.nodeId && p.handleId === port.handleId)?.label ?? "";
  return `${typeof node?.data.title === "string" ? node.data.title : port.nodeId}: ${label}`;
};

/**
 * The keyboard's path: an inspector for one node lists its ports, each with a "Connect to" Select of the ports
 * `connectTargets` accepts for it, judged by the same rule as the drag. Choosing one makes the connection.
 */
function ConnectToDemo() {
  const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);
  const hints = useConnectHints(canConnect);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const mix = ports.filter((p) => p.nodeId === "mix");
  const connect = (into: ConnectCandidate, key: string) => {
    const from = ports.find((p) => `${p.nodeId}/${p.handleId ?? ""}` === key);
    if (from === undefined) return;
    setEdges((current) =>
      addEdge(
        {
          source: from.nodeId,
          sourceHandle: from.handleId,
          target: into.nodeId,
          targetHandle: into.handleId,
          type: "wire",
        },
        current,
      ),
    );
    setChosen((c) => ({ ...c, [into.handleId ?? ""]: "" }));
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: "12px" }}>
      <ConnectHints value={hints.value}>
        <ReactFlowProvider>
          <div style={{ width: "100%", height: "260px" }}>
            <ReactFlow
              defaultNodes={nodes}
              edges={edges}
              onEdgesChange={onEdgesChange}
              nodeTypes={storyNodeTypes}
              edgeTypes={edgeTypes}
              defaultViewport={{ x: 24, y: 24, zoom: 0.8 }}
              {...hints.flowProps}
            />
          </div>
        </ReactFlowProvider>
      </ConnectHints>
      <Panel title="mix-2">
        {mix.map((into) => {
          const { accepted } = connectTargets(into, into.side, ports, canConnect);
          return (
            <Field key={into.handleId} label={`${into.label}: connect to`}>
              <Select
                value={chosen[into.handleId ?? ""] ?? ""}
                disabled={accepted.length === 0}
                onChange={(event) => {
                  connect(into, event.target.value);
                }}
              >
                <option value="">{accepted.length === 0 ? "No port takes it" : "Choose a port"}</option>
                {accepted.map((from) => (
                  <option key={`${from.nodeId}/${from.handleId ?? ""}`} value={`${from.nodeId}/${from.handleId ?? ""}`}>
                    {nameOf(from)}
                  </option>
                ))}
              </Select>
            </Field>
          );
        })}
      </Panel>
    </div>
  );
}

/** Each input's choice lists only the outputs the rule accepts; choosing one draws the wire, as a drop would. */
export const ConnectTo: Story = {
  render: () => <ConnectToDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const into = canvas.getByRole("combobox", { name: "in: connect to" });
    const side = canvas.getByRole("combobox", { name: "side: connect to" });
    await expect(
      within(into)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Choose a port", "Tone 1: left", "Tone 1: right"]);
    await expect(
      within(side)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Choose a port", "Tone 1: gate"]);
    await userEvent.selectOptions(into, "src/right");
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-wire")).toHaveLength(1));
    await expect(into).toHaveValue("");
  },
};

/** Under the example harbor brand in dark. */
export const ConnectToHarborDark: Story = { ...ConnectTo, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const ConnectToEmberLight: Story = { ...ConnectTo, globals: { brand: "ember", theme: "light" } };
