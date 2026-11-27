import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, within } from "storybook/test";
import { Button } from "../../primitives";
import { underTouch } from "../../test/touch-rules";
import { ChangeList, type QueuedChange } from "./ChangeList";

const queue: QueuedChange[] = [
  { id: "add-mix", change: "added", label: "mix-2", detail: "mixer" },
  { id: "gain", change: "changed", label: "Tone 1", detail: "gain 0.8 → 1.2" },
  { id: "rename", change: "renamed", label: "out-main", detail: "was sink-1" },
  { id: "wire", change: "removed", label: "Tone 1: left → out-main: in" },
];

/** An app's queue: a row's Drop takes its change away, Discard all of them; Check and Save are the app's. */
function Queue({ start = queue }: { start?: QueuedChange[] }) {
  const [changes, setChanges] = useState(start);
  return (
    <div style={{ maxWidth: "420px" }}>
      <ChangeList
        changes={changes}
        onDrop={(id) => {
          setChanges((current) => current.filter((change) => change.id !== id));
        }}
        actions={
          <>
            <Button size="sm" disabled={changes.length === 0}>
              Check
            </Button>
            <Button
              size="sm"
              disabled={changes.length === 0}
              onClick={() => {
                setChanges([]);
              }}
            >
              Discard
            </Button>
            <Button size="sm" tone="primary" disabled={changes.length === 0 || changes.some((c) => c.refused)}>
              Save
            </Button>
          </>
        }
      />
    </div>
  );
}

const meta = {
  title: "Composites/ChangeList",
  render: (args) => <Queue {...args} />,
} satisfies Meta<typeof Queue>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Four queued changes, each with its Badge and a Drop; dropping one takes it out and the count follows. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("4 changes");
    await userEvent.click(canvas.getByRole("button", { name: "Drop", description: /gain 0\.8/ }));
    await expect(canvas.getByRole("status")).toHaveTextContent("3 changes");
    await expect(canvas.queryByText("gain 0.8 → 1.2")).toBeNull();
  },
};

/** Under the example harbor brand in dark. */
export const DefaultHarborDark: Story = { ...Default, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const DefaultEmberLight: Story = { ...Default, globals: { brand: "ember", theme: "light" } };

/** A check refused one change: it is marked, with its reason in words, and Save is unavailable until it changes. */
export const Refused: Story = {
  args: {
    start: queue.map((change) =>
      change.id === "gain" ? { ...change, refused: "gain must be at most 1 (E21)" } : change,
    ),
  },
  play: async ({ canvas }) => {
    const row = canvas.getByText("Refused: gain must be at most 1 (E21)").closest("li");
    await expect(row).toHaveAttribute("data-refused");
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
  },
};

/** No changes: the count says so, in the status line that was there all along. */
export const Empty: Story = {
  args: { start: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("No changes");
    await expect(canvas.queryByRole("list")).toBeNull();
  },
};

/** A change it does not know is drawn neutrally, by its own word. */
export const UnknownChange: Story = {
  args: { start: [{ id: "move", change: "moved", label: "sink-1", detail: "to the second group" }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("moved")).toHaveAttribute("data-tone", "moved");
  },
};

/** On touch, each Drop is a full target. */
export const Touch: Story = {
  play: async ({ canvas }) => {
    await underTouch(async () => {
      for (const drop of canvas.getAllByRole("button", { name: "Drop" })) {
        await expect(drop.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
      }
    });
  },
};

/** Its words through labels. */
export const Labels: Story = {
  render: () => (
    <ChangeList
      changes={queue.slice(0, 2)}
      onDrop={() => {}}
      labels={{ added: "neu", changed: "geändert", count: (n) => `${String(n)} Änderungen`, drop: "Verwerfen" }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("2 Änderungen");
    await expect(canvas.getAllByRole("button", { name: "Verwerfen" })).toHaveLength(2);
  },
};

/** In right-to-left text the Badge is at the inline start, on the right, and Drop at the inline end. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={{ maxWidth: "420px" }}>
      <ChangeList changes={queue.slice(0, 1)} onDrop={() => {}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole("listitem");
    const badge = row.querySelector(".pb-badge")?.getBoundingClientRect();
    const drop = within(row).getByRole("button").getBoundingClientRect();
    await expect((badge?.left ?? 0) > drop.left).toBe(true);
  },
};
