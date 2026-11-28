import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { DiffView } from "./DiffView";

const config = `--- a/settings.conf
+++ b/settings.conf
@@ -1,5 +1,6 @@
 [output]
-rate = 44100
+rate = 48000
+channels = 2
 
 [input]
 gain = 0.8
`;

const layout = `diff --git a/views/layout.json b/views/layout.json
index 3b18e51..a4c2f09 100644
--- a/views/layout.json
+++ b/views/layout.json
@@ -2,3 +2,3 @@
   "columns": 3,
-  "dense": false
+  "dense": true
 }
\\ No newline at end of file
`;

const added = `--- /dev/null
+++ b/notes/readme.txt
@@ -0,0 +1,2 @@
+A new file,
+two lines long.
`;

const files = [
  { path: "config/settings.conf", diff: config },
  { path: "views/layout.json", diff: layout },
  { path: "notes/readme.txt", diff: added },
];

const meta = {
  title: "Composites/DiffView",
  component: DiffView,
  args: { files, onToggle: fn() },
} satisfies Meta<typeof DiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each file a section under its name, then its folder in quieter words; a press on the heading folds it. */
export const Files: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "settings.conf config" });
    await expect(toggle).toHaveAttribute("title", "config/settings.conf");
    await expect(canvas.getByText("config")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(args.onToggle).toHaveBeenCalledWith("config/settings.conf", false);
    await expect(canvas.getByText("+rate = 48000")).not.toBeVisible();
  },
};

/** One unified diff, whole, without a heading. */
export const Text: Story = { args: { files: undefined, diff: config } };

/** Some files folded by the app, which holds the fold. */
export const Collapsed: Story = {
  args: { collapsed: ["views/layout.json", "notes/readme.txt"] },
  render: (args) => {
    const [collapsed, setCollapsed] = useState(args.collapsed ?? []);
    return (
      <DiffView
        {...args}
        collapsed={collapsed}
        onToggle={(path, open) => {
          setCollapsed((was) => (open ? was.filter((other) => other !== path) : [...was, path]));
          args.onToggle?.(path, open);
        }}
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "layout.json views" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Tab}");
    await expect(canvas.getByRole("button", { name: "settings.conf config" })).toHaveFocus();
  },
};

/** A long line scrolls sideways, from the keyboard too; the change bars run its whole length. */
export const Wide: Story = {
  args: {
    files: undefined,
    diff: `@@ -1 +1 @@\n-${"a long value that keeps going ".repeat(8)}\n+${"a longer value that keeps on going ".repeat(8)}\n`,
  },
  render: (args) => (
    <div style={{ width: "320px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/** Right-to-left text: each line's change bar and its narrower padding at the inline start, the right. */
export const RightToLeft: Story = {
  args: { files: undefined, diff: config },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const line = canvasElement.querySelector('.pb-diff-line[data-kind="add"]');
    if (line === null) throw new Error("no added line");
    const style = getComputedStyle(line);
    await expect(style.borderRightWidth).toBe("3px");
    await expect(parseFloat(style.paddingRight)).toBeLessThan(parseFloat(style.paddingLeft));
  },
};

const deep = "workspace/projects/studio/src/config/lights";

/** In a narrow column, a deep folder is cut from its start, so its last folders and the file's name stay in view. */
export const LongPath: Story = {
  args: { files: [{ path: `${deep}/settings.conf`, diff: config }] },
  render: (args) => (
    <div style={{ width: "280px" }}>
      <DiffView {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const toggle = canvas.getByRole("button", { name: `settings.conf ${deep}` });
    const folder = canvasElement.querySelector(".pb-diff-folder");
    if (!(folder instanceof HTMLElement)) throw new Error("no folder");
    await expect(folder.scrollWidth).toBeGreaterThan(folder.clientWidth);
    // Cut at its start: the folder's right edge, its last part, lines up with the line's; the root is what overflows.
    const path = folder.firstElementChild?.getBoundingClientRect();
    const box = folder.getBoundingClientRect();
    if (path === undefined) throw new Error("no path");
    await expect(Math.abs(path.right - box.right)).toBeLessThan(1);
    await expect(path.left).toBeLessThan(box.left);
    await expect(toggle.getBoundingClientRect().width).toBeLessThanOrEqual(280);
  },
};

/** Right-to-left: the name at the right, the folder after it to its left, still cut from the path's start. */
export const FilesRightToLeft: Story = {
  args: { files: [{ path: `${deep}/settings.conf`, diff: config }, ...files.slice(1)] },
  render: (args) => (
    <div dir="rtl" style={{ width: "280px" }}>
      <DiffView {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    canvas.getByRole("button", { name: `settings.conf ${deep}` });
    const name = canvasElement.querySelector(".pb-diff-name")?.getBoundingClientRect();
    const folder = canvasElement.querySelector(".pb-diff-folder");
    if (name === undefined || !(folder instanceof HTMLElement)) throw new Error("no heading");
    await expect(folder.getBoundingClientRect().right).toBeLessThanOrEqual(name.left);
    const path = folder.firstElementChild?.getBoundingClientRect();
    if (path === undefined) throw new Error("no path");
    await expect(Math.abs(path.right - folder.getBoundingClientRect().right)).toBeLessThan(1);
  },
};

/** No files: nothing to show. */
export const Empty: Story = { args: { files: [] } };

/** Every kind of line and both forms together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "16px" }}>
      <DiffView diff={layout} />
      <DiffView files={files} collapsed={["notes/readme.txt"]} onToggle={args.onToggle} />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
