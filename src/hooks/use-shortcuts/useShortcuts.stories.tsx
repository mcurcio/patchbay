import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { Button, TextInput } from "../../primitives";
import { detectPlatform, keyLabel, type Platform, type Shortcut, useShortcuts } from "./useShortcuts";

const kbd = {
  display: "inline-block",
  minWidth: "1.5em",
  padding: "0 var(--pb-space-1)",
  border: "1px solid var(--pb-line-strong)",
  borderRadius: "var(--pb-radius-control)",
  background: "var(--pb-sunken)",
  fontFamily: "var(--pb-font-code)",
  textAlign: "center",
} as const;

const page = {
  display: "grid",
  gap: "var(--pb-space-3)",
  maxWidth: "480px",
  padding: "var(--pb-space-4)",
  background: "var(--pb-surface)",
  color: "var(--pb-text)",
  fontFamily: "var(--pb-font-ui)",
  fontSize: "var(--pb-text-md)",
} as const;

type DemoProps = {
  /** The platform the labels and Mod follow; the browser's by default. */
  platform?: Platform;
};

/** A page with a table of bindings, a text field, an area inside React Flow's nokey class, and what last ran. */
function ShortcutsDemo({ platform }: DemoProps) {
  const [last, setLast] = useState("Nothing yet");
  const said = (words: string) => () => {
    setLast(words);
  };
  const bindings: (Shortcut & { label: string })[] = [
    { keys: "Mod+K", label: "Open the palette", run: said("Open the palette"), inTextFields: true },
    { keys: "Mod+Z", label: "Undo", run: said("Undo") },
    { keys: ["Delete", "Backspace"], label: "Delete the selection", run: said("Delete the selection") },
    { keys: "Shift+?", label: "Show the keys", run: said("Show the keys") },
    { keys: "Escape", label: "Clear the selection", run: said("Clear the selection") },
  ];
  useShortcuts(bindings, platform === undefined ? {} : { platform });
  const labelled = platform === undefined ? {} : { platform };
  return (
    <div style={page}>
      <table style={{ borderCollapse: "collapse" }}>
        <caption style={{ textAlign: "start", fontWeight: 600 }}>Keys</caption>
        <tbody>
          {bindings.map((binding) => (
            <tr key={binding.label}>
              <th scope="row" style={{ textAlign: "start", fontWeight: 400, padding: "var(--pb-space-1) 0" }}>
                {binding.label}
                {binding.inTextFields === true ? " (also while typing)" : ""}
              </th>
              <td style={{ padding: "var(--pb-space-1) var(--pb-space-2)" }}>
                {(typeof binding.keys === "string" ? [binding.keys] : binding.keys).map((keys) => (
                  <kbd key={keys} style={{ ...kbd, marginInlineEnd: "var(--pb-space-1)" }}>
                    {keyLabel(keys, labelled)}
                  </kbd>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TextInput aria-label="A text field" placeholder="Keys typed here stay here" />
      <div className="nokey" style={{ display: "flex", gap: "var(--pb-space-2)", alignItems: "center" }}>
        <Button size="sm">Inside nokey</Button>
        <span style={{ color: "var(--pb-muted)" }}>React Flow&apos;s nokey area counts as a text field</span>
      </div>
      <Button size="sm">Outside</Button>
      <p role="status" style={{ margin: 0 }}>
        Last: {last}
      </p>
    </div>
  );
}

const meta = {
  title: "Hooks/useShortcuts",
  component: ShortcutsDemo,
} satisfies Meta<typeof ShortcutsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The browser's platform: press the keys listed with focus on the page, then in the text field. */
export const All: Story = {
  play: async ({ canvas, userEvent }) => {
    const status = canvas.getByRole("status");
    const mod = detectPlatform() === "apple" ? "Meta" : "Control";
    await userEvent.click(canvas.getByRole("button", { name: "Outside" }));
    await userEvent.keyboard("{Delete}");
    await expect(status).toHaveTextContent("Last: Delete the selection");
    await userEvent.keyboard("{Shift>}?{/Shift}");
    await expect(status).toHaveTextContent("Last: Show the keys");
    // In a text field, single keys and chords that did not opt in stay with the field; the palette's chord acts.
    await userEvent.click(canvas.getByRole("textbox", { name: "A text field" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
    await expect(status).toHaveTextContent("Last: Show the keys");
    await userEvent.keyboard(`{${mod}>}k{/${mod}}`);
    await expect(status).toHaveTextContent("Last: Open the palette");
    // Inside React Flow's nokey class, the same.
    await userEvent.click(canvas.getByRole("button", { name: "Inside nokey" }));
    await userEvent.keyboard("{Delete}");
    await expect(status).toHaveTextContent("Last: Open the palette");
  },
};

/** The labels on an Apple platform. */
export const Apple: Story = {
  args: { platform: "apple" },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("⌘K")).toHaveLength(1);
    await expect(canvas.getByText("⇧?")).toBeVisible();
  },
};

/** The labels elsewhere. */
export const Other: Story = {
  args: { platform: "other" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ctrl+K")).toBeVisible();
    await expect(canvas.getByText("Shift+?")).toBeVisible();
  },
};

/** Under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
