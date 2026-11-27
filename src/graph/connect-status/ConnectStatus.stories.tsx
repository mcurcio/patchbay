import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { addEdge, type Connection, type Edge, ReactFlow, ReactFlowProvider, useEdgesState } from "@xyflow/react";
import { expect, fireEvent, waitFor } from "storybook/test";
import { measuredHandle } from "../../test/measured-handle";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { type CanConnect, ConnectHints, mergeFlowProps, useConnectHints } from "../connect-hints";
import { Wire } from "../wire";
import { ConnectStatus, type ConnectStatusLabels } from "./ConnectStatus";

/** Each port's type, by node and handle: the app's own rule reads its graph, here a table. */
const types: Record<string, string> = {
  "src/left": "audio",
  "src/gate": "control",
  "mix/in": "audio",
  "mix/side": "control",
};
const typeOf = (nodeId: string, handleId: string | null) => types[`${nodeId}/${handleId ?? ""}`];

/** Joins ports of one type, and refuses others with the reason. */
const canConnect: CanConnect = (from, to) => {
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
      inputs: [
        { id: "in", label: "in", typeLabel: "audio" },
        { id: "side", label: "side", typeLabel: "control" },
      ],
    },
  },
];

const edgeTypes = { wire: Wire };
const startEdges: Edge[] = [];

/** An app's canvas: the hints wrap <ReactFlow>, and the status line is one of its children, fed by the same hook. */
function Demo({ labels }: { labels?: Partial<ConnectStatusLabels> }) {
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
          >
            <ConnectStatus value={hints.value} refused={hints.refused} labels={labels} />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </ConnectHints>
  );
}

const meta = {
  title: "Graph/ConnectStatus",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const centre = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
};

const status = (root: HTMLElement) => {
  const found = root.querySelector<HTMLElement>('.pb-connect-status [role="status"]');
  if (found === null) throw new Error("no status line");
  return found;
};

/** Starts a wire from src's left output and moves it a little, so React Flow's drag is under way. */
async function dragFromLeft(root: HTMLElement) {
  const left = await measuredHandle(root, "src", "left");
  const from = centre(left);
  await fireEvent.mouseDown(left, { ...from, button: 0 });
  await fireEvent.mouseMove(document, { clientX: from.clientX + 40, clientY: from.clientY + 4 });
  await waitFor(() => expect(left).toHaveAttribute("data-hint", "origin"));
}

/**
 * While a wire is dragged, the line says why the port under the pointer refuses it, in words, where a tooltip would not
 * show on touch or to the keyboard; over a port that takes it, nothing.
 */
export const Dragging: Story = {
  play: async ({ canvasElement }) => {
    const line = status(canvasElement);
    await expect(line).toBeEmptyDOMElement();
    await dragFromLeft(canvasElement);
    const side = await measuredHandle(canvasElement, "mix", "side");
    const into = await measuredHandle(canvasElement, "mix", "in");
    await fireEvent.mouseMove(document, centre(side));
    await waitFor(() => expect(line).toHaveTextContent("Takes control, not audio"));
    await fireEvent.mouseMove(document, centre(into));
    await waitFor(() => expect(line).toBeEmptyDOMElement());
    await fireEvent.mouseUp(document, centre(into));
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-wire")).toHaveLength(1));
    await expect(line).toBeEmptyDOMElement();
  },
};

/** A drop on a port that refuses: no wire, and the line keeps the verdict until the next drag begins. */
export const RefusedDrop: Story = {
  play: async ({ canvasElement }) => {
    const line = status(canvasElement);
    await dragFromLeft(canvasElement);
    const side = await measuredHandle(canvasElement, "mix", "side");
    await fireEvent.mouseMove(document, centre(side));
    await fireEvent.mouseUp(document, centre(side));
    await waitFor(() => expect(line).toHaveTextContent("Not connected: Takes control, not audio"));
    await expect(canvasElement.querySelectorAll(".pb-wire")).toHaveLength(0);
    await dragFromLeft(canvasElement);
    await expect(line).toBeEmptyDOMElement();
    await fireEvent.mouseUp(document, { clientX: 5, clientY: 250 });
  },
};

/** The app's words, through `labels`. */
export const Labels: Story = {
  args: {
    labels: {
      refuses: (reason) => `Nein: ${reason ?? "dieser Anschluss nimmt nichts an"}`,
      notConnected: (reason) => `Nicht verbunden: ${reason ?? "dieser Anschluss nimmt nichts an"}`,
    },
  },
  play: async ({ canvasElement }) => {
    const line = status(canvasElement);
    await dragFromLeft(canvasElement);
    const side = await measuredHandle(canvasElement, "mix", "side");
    await fireEvent.mouseMove(document, centre(side));
    await waitFor(() => expect(line).toHaveTextContent("Nein: Takes control, not audio"));
    await fireEvent.mouseUp(document, centre(side));
    await waitFor(() => expect(line).toHaveTextContent("Nicht verbunden: Takes control, not audio"));
  },
};

/** The refused drop under the example harbor brand in dark. */
export const RefusedDropHarborDark: Story = { ...RefusedDrop, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const RefusedDropEmberLight: Story = { ...RefusedDrop, globals: { brand: "ember", theme: "light" } };
