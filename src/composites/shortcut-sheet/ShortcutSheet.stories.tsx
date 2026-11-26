import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen } from "storybook/test";
import { type ShortcutLine, ShortcutSheet } from "./ShortcutSheet";

const shortcuts: ShortcutLine[] = [
  { keys: "Mod+K", label: "Open the palette", group: "General" },
  { keys: "Shift+?", label: "Show the keys", group: "General" },
  { keys: "Escape", label: "Clear the selection", group: "General" },
  { keys: "Shift+A", label: "Add a node", group: "Edit" },
  { keys: ["Delete", "Backspace"], label: "Delete the selection", group: "Edit" },
  { keys: "Mod+Z", label: "Undo", group: "Edit" },
  { keys: "Mod+Shift+Z", label: "Redo", group: "Edit" },
  { keys: "Shift+1", label: "Fit view", group: "View" },
  { keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], label: "Move the selection", group: "View" },
];

const meta = {
  title: "Composites/ShortcutSheet",
  component: ShortcutSheet,
  args: { open: true, onClose: fn(), shortcuts, platform: "other" },
  // The sheet covers the page; give the docs page room for it.
  parameters: { docs: { story: { inline: false, height: "640px" } } },
} satisfies Meta<typeof ShortcutSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One section per group, each key as people read it; Escape asks to close. */
export const Open: Story = {
  play: async ({ args, userEvent }) => {
    await expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    await expect(screen.getByRole("region", { name: "Edit" })).toHaveTextContent("Delete or Backspace");
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Keys drawn for an Apple platform. */
export const ApplePlatform: Story = { args: { platform: "apple" } };

/** A note under the lists. */
export const WithNote: Story = {
  args: { children: "Single keys do nothing while you type in a field; chords marked so still act." },
};

/** The app's words, through `labels`: the title, "or", Close and the keys' names. */
export const Labels: Story = {
  args: {
    labels: { title: "Tastenkürzel", or: "oder", close: "Schließen", keyNames: { Delete: "Entf", Backspace: "Rück" } },
  },
  play: async () => {
    await expect(screen.getByRole("dialog", { name: "Tastenkürzel" })).toBeInTheDocument();
    await expect(screen.getByRole("region", { name: "Edit" })).toHaveTextContent("Entf oder Rück");
    await expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  },
};

/** No shortcuts. */
export const Empty: Story = { args: { shortcuts: [] } };

/** At phone width. */
export const Phone: Story = { globals: { viewport: { value: "phone" } } };

/** Every part together, for a glance under each brand and theme. */
export const All: Story = { args: { children: "A note under the lists." } };

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
