import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { Field } from "../../primitives";
import { CodeEditor, type CodeEditorProps } from "./CodeEditor";
import type { CodeDiagnostic, CodeSpan } from "./highlight";

const sample = `# The mixer's settings
@set rate 48000;

mixer {
\tchannels 2;
\tname "main";
\tgain $rate;
}
`;

const long = Array.from(
  { length: 300 },
  (_, index) =>
    `stage${String(index + 1)} { input "source ${String(index + 1)}"; gain ${String((index % 9) / 10)}; } # ${"a note that runs on ".repeat(index % 7 === 0 ? 6 : 1)}`,
).join("\n");

const diagnostics: CodeDiagnostic[] = [
  { line: 6, column: 7, severity: "error", message: "a name must be one word", code: "E12" },
  { line: 7, severity: "warning", message: "gain reads the rate" },
  { line: 1, severity: "note", message: "a heading comment" },
];

/** A neutral app highlighter: "key = value" lines, with "#" comments and bracketed sections. */
function iniHighlight(text: string): CodeSpan[] {
  const spans: CodeSpan[] = [];
  let at = 0;
  for (const line of text.split("\n")) {
    const comment = line.indexOf("#");
    if (/^\s*\[/.test(line)) spans.push({ start: at, end: at + line.length, class: "directive" });
    else {
      const eq = line.indexOf("=");
      if (eq > 0 && (comment === -1 || eq < comment)) {
        spans.push({ start: at, end: at + eq, class: "keyword" });
        spans.push({ start: at + eq, end: at + eq + 1, class: "punctuation" });
        const end = comment === -1 ? line.length : comment;
        const value = line.slice(eq + 1, end);
        spans.push({ start: at + eq + 1, end: at + end, class: /^\s*\d/.test(value) ? "number" : "string" });
      }
    }
    if (comment !== -1) spans.push({ start: at + comment, end: at + line.length, class: "comment" });
    at += line.length + 1;
  }
  return spans;
}

const ini = `[output]
rate = 48000
device = front speakers # the default
[input]
gain = 0.8
`;

/** The editor holding its own text, as an app does. */
function Held(args: CodeEditorProps) {
  const [text, setText] = useState(args.value);
  return (
    <CodeEditor
      {...args}
      value={text}
      onChange={(next) => {
        setText(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta = {
  title: "Composites/CodeEditor",
  component: CodeEditor,
  args: { value: sample, language: "knobly", "aria-label": "Settings", rows: 10, onChange: fn(), onCaret: fn() },
  render: (args) => <Held {...args} />,
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** knobly text, highlighted once the knobly peer has loaded; every edit goes to onChange. */
export const Editor: Story = {
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-class="keyword"]')).toHaveTextContent("@set"));
    const box = canvas.getByRole<HTMLTextAreaElement>("textbox", { name: "Settings" });
    await userEvent.click(box);
    box.setSelectionRange(sample.length, sample.length);
    await userEvent.keyboard("# end");
    await expect(args.onChange).toHaveBeenLastCalledWith(`${sample}# end`);
    await expect(args.onCaret).toHaveBeenLastCalledWith({ line: 9, column: 6, offset: sample.length + 5 });
  },
};

/** Tab indents and Shift+Tab outdents; Escape, then Tab, moves the focus on. */
export const TabKey: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "8px" }}>
      <Held {...args} />
      <button type="button">After</button>
    </div>
  ),
  play: async ({ args, canvas, userEvent }) => {
    const box = canvas.getByRole<HTMLTextAreaElement>("textbox", { name: "Settings" });
    await userEvent.click(box);
    box.setSelectionRange(0, 0);
    await userEvent.keyboard("{Tab}");
    await expect(args.onChange).toHaveBeenLastCalledWith(`\t${sample}`);
    await expect(box).toHaveFocus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await expect(args.onChange).toHaveBeenLastCalledWith(sample);
    await expect(box).toHaveFocus();
    await userEvent.keyboard("{Escape}{Tab}");
    await expect(canvas.getByRole("button", { name: "After" })).toHaveFocus();
  },
};

/** Diagnostics: a mark in the gutter (a circle for an error, a diamond for a warning, a ring for any other), a wavy
 * line under the text, and the words read with the editor; a press on a mark puts the caret there. */
export const Diagnostics: Story = {
  args: { diagnostics },
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const box = canvas.getByRole("textbox", { name: "Settings" });
    await expect(box).toHaveAccessibleDescription(/Line 6, column 7: error E12: a name must be one word/);
    const mark = canvasElement.querySelector('.pb-code-gutter-mark[data-mark="error"]');
    await expect(mark).toHaveAttribute("title", "Line 6, column 7: error E12: a name must be one word");
    if (mark === null) throw new Error("no error mark");
    await userEvent.click(mark);
    await expect(box).toHaveFocus();
    await expect(args.onCaret).toHaveBeenLastCalledWith({ line: 6, column: 7, offset: sample.indexOf('"main"') });
  },
};

/** Read-only: the read-only surface, no edits, and Tab moves on. */
export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Settings" })).toHaveAttribute("readonly");
  },
};

/** The app's own highlighter, here for "key = value" text. */
export const AppHighlighter: Story = {
  args: { value: ini, language: undefined, highlight: iniHighlight, rows: 6 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-class="comment"]')).toHaveTextContent("# the default");
  },
};

/** Long text in a fixed height: it scrolls both ways, and the copy and the gutter follow. */
export const LongText: Story = {
  args: { value: long, rows: undefined },
  render: (args) => (
    <div style={{ display: "grid", height: "320px", maxWidth: "560px" }}>
      <Held {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const box = canvas.getByRole("textbox", { name: "Settings" });
    box.scrollTop = 600;
    box.scrollLeft = 80;
    box.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(canvasElement.querySelector(".pb-code-gutter")?.scrollTop).toBe(box.scrollTop));
    await expect(canvasElement.querySelector(".pb-code-layer")?.scrollLeft).toBe(box.scrollLeft);
  },
};

/** In a Field, which names it and adds its hint and error to its description. */
export const InField: Story = {
  args: { "aria-label": undefined, diagnostics: diagnostics.slice(0, 1) },
  render: (args) => (
    <Field label="Settings" hint="Applied when saved" error="One error">
      <Held {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Settings" })).toHaveAccessibleDescription(
      /^Applied when saved One error Tab indents/,
    );
  },
};

/** No text: one numbered line. */
export const Empty: Story = { args: { value: "", rows: 3, placeholder: "Write the settings here" } };

/** Each state together, for a glance under each brand and theme. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "640px" }}>
      <Held {...args} diagnostics={diagnostics} />
      <Held {...args} readOnly rows={4} />
      <Held {...args} value={ini} language={undefined} highlight={iniHighlight} rows={6} lineNumbers={false} />
    </div>
  ),
};

/** The same set under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
