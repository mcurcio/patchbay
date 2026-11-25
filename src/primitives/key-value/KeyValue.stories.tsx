import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { KeyValue } from "./KeyValue";

const meta = {
  title: "Primitives/KeyValue",
  component: KeyValue,
  args: {
    label: "Facts",
    rows: [
      { key: "Interval", value: "30 s" },
      { key: "Batch", value: "256 items" },
      { key: "Latency", value: "42 ms" },
    ],
  },
} satisfies Meta<typeof KeyValue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByLabelText("Facts");
    await expect(list.tagName).toBe("DL");
    await expect(within(list).getAllByRole("term")).toHaveLength(3);
  },
};

/** Values tinted by their tone; a tone the list does not know leaves its value plain. */
export const Tones: Story = {
  args: {
    rows: [
      { key: "Healthy", value: "yes", tone: "ok" },
      { key: "Retries", value: "3 in the last minute", tone: "warn" },
      { key: "Synced", value: "no", tone: "err", title: "Hover: why it matters" },
      { key: "Idle", value: "since 12:04", tone: "quiet" },
      { key: "Schedule", value: "off", tone: "off" },
      { key: "Mystery", value: "plain", tone: "unheard-of" },
    ],
  },
};

/** A long value wraps beside its key; the keys keep their column. */
export const LongValues: Story = {
  args: {
    rows: [
      { key: "Path", value: "/var/lib/some/very/long/path/that/keeps/going/and/going/without/a/space.json" },
      { key: "Note", value: "A value long enough to wrap onto a second line in a narrow panel, which it does." },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
};

/** Values that are elements: a link, code. */
export const RichValues: Story = {
  args: {
    rows: [
      { key: "Link", value: <a href="#target">target</a> },
      { key: "Code", value: <code>E_GONE</code> },
    ],
  },
};

export const Empty: Story = { args: { rows: [] } };
