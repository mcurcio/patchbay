import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import { addEdge, type Connection, type Edge, ReactFlow, ReactFlowProvider, useEdgesState } from "@xyflow/react";
import { expect, fireEvent, waitFor } from "storybook/test";
import { type BoxNode, storyNodeTypes } from "../../test/story-canvas";
import { Wire } from "../wire";
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

const handle = (root: HTMLElement, nodeId: string, handleId: string) =>
  waitFor(() => {
    const found = root.querySelector<HTMLElement>(`[data-nodeid="${nodeId}"][data-handleid="${handleId}"]`);
    if (found === null) throw new Error(`no handle ${nodeId}/${handleId} yet`);
    return found;
  });

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
