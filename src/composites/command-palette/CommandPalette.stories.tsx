import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { Button } from "../../primitives";
import { type Command, type CommandPaletteProps, CommandPalette } from "./CommandPalette";

const commands: Command[] = [
  { id: "add", label: "Add a node", group: "Edit", keys: "Shift+A", hint: "Pick a type, then place it", run: fn() },
  { id: "delete", label: "Delete the selection", group: "Edit", keys: ["Delete", "Backspace"], run: fn() },
  { id: "undo", label: "Undo", group: "Edit", keys: "Mod+Z", run: fn() },
  { id: "fit", label: "Fit view", group: "View", keys: "Shift+1", hint: "Every node in sight", run: fn() },
  { id: "zoom-in", label: "Zoom in", group: "View", keys: "Mod+=", run: fn() },
  { id: "zoom-out", label: "Zoom out", group: "View", keys: "Mod+-", run: fn() },
  { id: "save", label: "Save", group: "File", keys: "Mod+S", run: fn() },
  { id: "export", label: "Export as text", group: "File", disabled: true, hint: "Nothing to export yet", run: fn() },
  { id: "keys", label: "Show the keys", group: "Help", keys: "Shift+?", run: fn() },
];

/** The palette over app state, with a button that opens it again, as an app holds it. */
function Held(args: CommandPaletteProps) {
  const [open, setOpen] = useState(args.open);
  return (
    <div style={{ minHeight: "480px" }}>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open the palette
      </Button>
      <CommandPalette
        {...args}
        open={open}
        onClose={() => {
          args.onClose();
          setOpen(false);
        }}
      />
    </div>
  );
}

const meta = {
  title: "Composites/CommandPalette",
  component: CommandPalette,
  render: (args) => <Held {...args} />,
  args: { open: true, onClose: fn(), commands, platform: "other" },
  // The palette covers the page; give the docs page room for it.
  parameters: { docs: { story: { inline: false, height: "520px" } } },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Centred near the top, every command in its group, the first active. */
export const Centred: Story = {
  play: async () => {
    const field = screen.getByRole("combobox", { name: "Commands" });
    await expect(field).toHaveFocus();
    await expect(screen.getByRole("option", { name: /^Add a node/ })).toHaveAttribute("aria-selected", "true");
  },
};

/** Typing ranks the commands and marks the matched letters; the arrows move and Enter runs. */
export const Typing: Story = {
  args: { open: false },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open the palette" }));
    await userEvent.keyboard("zo");
    const options = screen.getAllByRole("option");
    await expect(options.map((option) => option.querySelector(".pb-palette-label")?.textContent)).toEqual([
      "Zoom in",
      "Zoom out",
    ]);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(commands[5]?.run).toHaveBeenCalled();
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Open the palette" })).toHaveFocus());
  },
};

/** Anchored at a point (where a press on the canvas was), kept inside the window. */
export const Anchored: Story = { args: { at: { x: 120, y: 60 } } };

/** Anchored past the window's corner: moved back inside it. */
export const AnchoredAtTheEdge: Story = { args: { at: { x: 4000, y: 4000 } } };

/** Keys drawn for an Apple platform. */
export const ApplePlatform: Story = { args: { platform: "apple" } };

/** No command matches the query. */
export const NoMatch: Story = {
  play: async ({ userEvent }) => {
    await userEvent.keyboard("qqq");
    await expect(screen.getByRole("status")).toHaveTextContent("No command matches “qqq”");
  },
};

/** The app's words, through `labels`: the name, the placeholder, no match, and the keys' names. */
export const Labels: Story = {
  args: {
    labels: {
      palette: "Befehle",
      placeholder: "Befehl eingeben",
      noMatch: (query) => `Kein Befehl passt zu „${query}“`,
      keyNames: { Delete: "Entf", Backspace: "Rück" },
    },
  },
  play: async ({ userEvent }) => {
    // The palette fades in from transparent, so this asks for presence, not visibility.
    await expect(screen.getByRole("dialog", { name: "Befehle" })).toBeInTheDocument();
    await expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Befehl eingeben");
    await expect(screen.getByRole("option", { name: /Delete the selection/ })).toHaveTextContent("Entf");
    await userEvent.keyboard("qqq");
    await expect(screen.getByRole("status")).toHaveTextContent("Kein Befehl passt zu „qqq“");
  },
};

/** No commands at all. */
export const Empty: Story = { args: { commands: [] } };

/** Tab closes it, as a combobox's list closes, and the focus goes back. */
export const TabCloses: Story = {
  args: { open: false },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open the palette" }));
    await expect(screen.getByRole("combobox")).toHaveFocus();
    await userEvent.keyboard("{Tab}");
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Open the palette" })).toHaveFocus());
  },
};

/** At phone width the centred box takes the width less the gutters. */
export const Phone: Story = { globals: { viewport: { value: "phone" } } };

/** Typed, so marks, hints, keys, a disabled command and the active one show together under each brand and theme. */
export const All: Story = {
  play: async ({ userEvent }) => {
    await userEvent.keyboard("e");
    await expect(screen.getAllByRole("option").length).toBeGreaterThan(3);
  },
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
