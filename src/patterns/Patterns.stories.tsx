// The arrangements the Patterns pages (src/patterns/*.mdx) show that no component's own stories do: several parts
// put together as docs/patterns.md says, with neutral data. They are hidden from the sidebar ("!dev") and shown on
// those pages; each still runs as a test.
import type { Meta, StoryObj } from "@storybook/react-vite";
import "@xyflow/react/dist/style.css";
import {
  type Edge,
  type OnSelectionChangeParams,
  Panel as FlowPanel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";
import { Banner, CodeEditor } from "../composites";
import { GhostWire, Wire } from "../graph";
import { Badge, Button, KeyValue, Panel, Pill } from "../primitives";
import { type BoxNode, StoryCanvas, storyNodeTypes } from "../test/story-canvas";

const edgeTypes = { ghost: GhostWire, wire: Wire };

const box = (id: string, x: number, y: number, data: BoxNode["data"]): BoxNode => ({
  id,
  type: "box",
  position: { x, y },
  data,
});

/** A source with outputs o0… and a step with inputs i0…, 360 px apart. */
const pair = (count: number, connectable = true): BoxNode[] => [
  box("src", 0, 0, {
    title: "Source",
    subtitle: "source",
    outputs: Array.from({ length: count }, (_, index) => ({
      id: `o${index}`,
      label: `out ${index + 1}`,
      connectable,
    })),
  }),
  box("dst", 360, 0, {
    title: "Step 1",
    subtitle: "step",
    inputs: Array.from({ length: count }, (_, index) => ({ id: `i${index}`, label: `in ${index + 1}`, connectable })),
  }),
];

const between = (index: number, type: "wire" | "ghost", data: Record<string, unknown>): Edge => ({
  id: `${type}${index}`,
  source: "src",
  sourceHandle: `o${index}`,
  target: "dst",
  targetHandle: `i${index}`,
  type,
  data,
  // A request's ghost, as an app adds it: unselectable, unfocusable and undeletable.
  ...(type === "ghost" ? { selectable: false, focusable: false, deletable: false } : {}),
});

const found = (root: HTMLElement, selector: string) =>
  waitFor(() => {
    const element = root.querySelector<SVGElement | HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} yet`);
    return element;
  });

const meta = {
  title: "Patterns/Examples",
  tags: ["!dev"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state of a change at once, each with its word: a live wire, a request pending, a queued wire and a queued
 * node, a refused request, and a node that failed.
 */
export const States: Story = {
  render: () => (
    <StoryCanvas
      height={300}
      nodes={[
        ...pair(4),
        box("queued", 0, 200, { title: "Step 2", subtitle: "step", change: "added" }),
        box("failed", 360, 200, {
          title: "Step 3",
          subtitle: "step",
          failed: true,
          line: "Stopped: the source refused its settings",
        }),
      ]}
      edges={[
        between(0, "wire", { label: "live" }),
        between(1, "ghost", { label: "pending" }),
        between(2, "wire", { tone: "added", dashed: true, label: "queued" }),
        between(3, "ghost", { tone: "refused", label: "refused" }),
      ]}
      edgeTypes={edgeTypes}
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(".pb-ghost-wire")).toHaveLength(2));
    await expect(canvasElement.querySelector('.pb-ghost-wire[data-tone="refused"]')).not.toBeNull();
    for (const word of ["live", "pending", "queued", "refused", "added"]) {
      await expect(await canvas.findByText(word)).toBeVisible();
    }
    await expect(canvas.getByText("Stopped: the source refused its settings")).toBeVisible();
  },
};

type Phase = "idle" | "pending" | "live" | "refused";

/** One request stepped through by hand: sent (pending), then the source's answer (live, or refused with why). */
function Request() {
  const [phase, setPhase] = useState<Phase>("idle");
  const edges: Edge[] =
    phase === "pending"
      ? [between(0, "ghost", {})]
      : phase === "live"
        ? [between(0, "wire", {})]
        : phase === "refused"
          ? [between(0, "ghost", { tone: "refused", label: "refused" })]
          : [];
  return (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--pb-space-2)", alignItems: "center" }}>
        <Button
          tone="primary"
          busy={phase === "pending"}
          busyLabel="Connecting…"
          disabled={phase === "live"}
          onClick={() => {
            if (phase !== "pending") setPhase("pending");
          }}
        >
          Connect
        </Button>
        {phase === "pending" && (
          <>
            <Button
              onClick={() => {
                setPhase("live");
              }}
            >
              The source accepts
            </Button>
            <Button
              onClick={() => {
                setPhase("refused");
              }}
            >
              The source refuses
            </Button>
          </>
        )}
        {(phase === "live" || phase === "refused") && (
          <Button
            onClick={() => {
              setPhase("idle");
            }}
          >
            Start again
          </Button>
        )}
      </div>
      <p role="status" style={{ margin: 0 }}>
        {phase === "idle" && "Not connected."}
        {phase === "pending" && "Asked; no answer yet."}
        {phase === "live" && "Connected: the source holds the connection."}
        {phase === "refused" && "Refused: Step 1's in 1 takes one connection."}
      </p>
      {/* Remounted per phase: the canvas holds its edges itself (StoryCanvas is uncontrolled). */}
      <StoryCanvas key={phase} height={160} nodes={pair(1)} edges={edges} edgeTypes={edgeTypes} />
    </div>
  );
}

/** A request stepped through: Connect sends it, then the source accepts or refuses. */
export const RequestSteps: Story = {
  render: () => <Request />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Connect" }));
    await expect(await found(canvasElement, ".pb-ghost-wire")).toHaveAttribute("data-tone", "pending");
    await expect(canvas.getByRole("status")).toHaveTextContent("Asked; no answer yet.");
    await userEvent.click(canvas.getByRole("button", { name: "The source accepts" }));
    await found(canvasElement, ".pb-wire");
    await expect(canvasElement.querySelector(".pb-ghost-wire")).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Start again" }));
    await userEvent.click(canvas.getByRole("button", { name: "Connect" }));
    await userEvent.click(await canvas.findByRole("button", { name: "The source refuses" }));
    await expect(await found(canvasElement, ".pb-ghost-wire")).toHaveAttribute("data-tone", "refused");
    await expect(canvas.getByRole("status")).toHaveTextContent("Refused");
  },
};

const inspected: BoxNode[] = [
  box("src", 0, 0, { title: "Source", subtitle: "source", tone: "ok", outputs: [{ id: "out", label: "out" }] }),
  box("step", 300, 0, {
    title: "Step 1",
    subtitle: "step",
    tone: "warn",
    inputs: [{ id: "in", label: "in" }],
    outputs: [{ id: "out", label: "out" }],
  }),
  box("sink", 600, 0, { title: "Step 2", subtitle: "step", inputs: [{ id: "in", label: "in" }] }),
];

const inspectedEdges: Edge[] = [
  { id: "a", source: "src", sourceHandle: "out", target: "step", targetHandle: "in", type: "wire", data: {} },
];

const states: Record<string, { tone: string; word: string }> = {
  src: { tone: "ok", word: "running" },
  step: { tone: "warn", word: "waiting: nothing reaches out" },
  sink: { tone: "quiet", word: "idle" },
};

/** The canvas and the inspector beside it: the selection chooses the inspector's subject. */
function Inspecting() {
  const [nodes, setNodes, onNodesChange] = useNodesState(inspected);
  const [edges, setEdges, onEdgesChange] = useEdgesState(inspectedEdges);
  const [selection, setSelection] = useState<OnSelectionChangeParams>({ nodes: [], edges: [] });
  const name = (id: string): string => {
    const title = nodes.find((node) => node.id === id)?.data.title;
    return typeof title === "string" ? title : id;
  };
  const select = (id: string) => {
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })));
  };

  const count = selection.nodes.length + selection.edges.length;
  let subject;
  if (count === 0) {
    subject = (
      <Panel title="The graph">
        <KeyValue
          label="The graph"
          rows={[
            { key: "Nodes", value: String(nodes.length) },
            { key: "Connections", value: String(edges.length) },
          ]}
        />
        <p>Select a node or a connection to inspect it.</p>
      </Panel>
    );
  } else if (count > 1) {
    subject = (
      <Panel title={`${String(count)} selected`}>
        <Button tone="danger">Remove all {count}</Button>
      </Panel>
    );
  } else if (selection.nodes[0] !== undefined) {
    const node = selection.nodes[0];
    const state = states[node.id] ?? { tone: "quiet", word: "idle" };
    subject = (
      <Panel title={name(node.id)}>
        <Pill tone={state.tone} label={state.word} />
        <KeyValue label="Facts" rows={[{ key: "Type", value: "step" }]} />
        <Button tone="danger">Remove</Button>
      </Panel>
    );
  } else if (selection.edges[0] !== undefined) {
    const edge = selection.edges[0];
    subject = (
      <Panel title={`${name(edge.source)} to ${name(edge.target)}`}>
        <div style={{ display: "flex", gap: "var(--pb-space-2)", flexWrap: "wrap" }}>
          <Button
            onClick={() => {
              select(edge.source);
            }}
          >
            {name(edge.source)} out
          </Button>
          <Button
            onClick={() => {
              select(edge.target);
            }}
          >
            {name(edge.target)} in
          </Button>
        </div>
        <Button tone="danger">Remove</Button>
      </Panel>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: "var(--pb-space-3)" }}>
      <div style={{ height: "240px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={setSelection}
          nodeTypes={storyNodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 16, y: 24, zoom: 0.8 }}
        />
      </div>
      <aside aria-label="Inspector">{subject}</aside>
    </div>
  );
}

/** Selecting nothing, a node, a connection or several changes the inspector's subject. */
export const InspectorSubjects: Story = {
  render: () => (
    <ReactFlowProvider>
      <Inspecting />
    </ReactFlowProvider>
  ),
  play: async ({ canvas, userEvent }) => {
    const inspector = canvas.getByRole("complementary", { name: "Inspector" });
    await expect(inspector).toHaveTextContent("The graph");
    await userEvent.click(await canvas.findByRole("group", { name: "Step 1" }));
    await waitFor(() => expect(inspector.querySelector("h2")).toHaveTextContent("Step 1"));
    await expect(inspector).toHaveTextContent("waiting: nothing reaches out");
  },
};

const first = `name "step 1";
limit 4;
`;
const changed = `name "step 1";
limit 8;
`;

/** A draft that goes stale when its own text changes underneath, with Reload as the way back. */
function Draft() {
  const [source, setSource] = useState(first);
  const [base, setBase] = useState(first);
  const [draft, setDraft] = useState(first);
  const stale = source !== base;
  return (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <div>
        <Button
          size="sm"
          onClick={() => {
            setSource(source === first ? changed : first);
          }}
        >
          Change it underneath
        </Button>
      </div>
      {stale && (
        <Banner
          tone="warn"
          actions={
            <Button
              size="sm"
              onClick={() => {
                setDraft(source);
                setBase(source);
              }}
            >
              Reload
            </Button>
          }
        >
          This text changed while you were editing it. Reload to take the new text; your draft is kept until you do.
        </Banner>
      )}
      <CodeEditor aria-label="Step 1's text" value={draft} onChange={setDraft} />
    </div>
  );
}

/** Editing text: the draft is never overwritten; a change underneath makes it stale, and Reload takes the new text. */
export const StaleDraft: Story = {
  render: () => <Draft />,
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("textbox", { name: "Step 1's text" });
    await userEvent.type(box, "# mine");
    await userEvent.click(canvas.getByRole("button", { name: "Change it underneath" }));
    await expect(
      await canvas.findByText(/This text changed while you were editing it/, { selector: ".pb-banner-text" }),
    ).toBeVisible();
    await expect(box).toHaveValue(`${first}# mine`);
    await userEvent.click(canvas.getByRole("button", { name: "Reload" }));
    await expect(box).toHaveValue(changed);
    await expect(canvas.queryByText(/This text changed/)).toBeNull();
  },
};

/** A read-only graph: every edit switched off, a quiet banner saying why, and one item locked with its reason. */
export const ReadOnlyGraph: Story = {
  render: () => (
    <StoryCanvas
      height={240}
      nodes={[
        ...pair(1, false),
        box("locked", 0, 130, {
          title: "Step 2",
          subtitle: "step",
          status: (
            <Badge tone="muted" title="Locked: another person is editing it">
              locked
            </Badge>
          ),
        }),
      ]}
      edges={[between(0, "wire", {})]}
      edgeTypes={edgeTypes}
      flowProps={{ nodesConnectable: false, nodesDraggable: false, deleteKeyCode: null }}
    >
      <FlowPanel position="top-right">
        <Banner tone="quiet">Read only: this graph is a saved copy. Open the current graph to edit it.</Banner>
      </FlowPanel>
    </StoryCanvas>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByText(/Read only: this graph is a saved copy/, { selector: ".pb-banner-text" }),
    ).toBeVisible();
    await found(canvasElement, ".react-flow__handle");
    await expect(canvasElement.querySelectorAll(".react-flow__handle.connectable")).toHaveLength(0);
    await expect(canvas.getByText("locked")).toHaveClass("pb-badge");
  },
};

/** The connection's three states, as the top bar's status pill words them. */
export const Connection: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--pb-space-3)", alignItems: "center" }}>
      <Pill tone="ok" label="live" />
      <Pill tone="quiet" pulse label="connecting…" />
      <Pill tone="err" label="lost: retrying in 5 s" />
    </div>
  ),
  play: async ({ canvas }) => {
    for (const word of ["live", "connecting…", "lost: retrying in 5 s"]) {
      await expect(canvas.getByText(word)).toBeVisible();
    }
  },
};
