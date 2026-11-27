import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { expect, waitFor } from "storybook/test";
import { underTouch } from "../../test/touch-rules";
import { type CodeCaret, type CodeDiagnostic, CodeEditor } from "../code-editor";
import { DiagnosticList, type DiagnosticListProps } from "./DiagnosticList";

const sample = `# The mixer's settings
@set rate 48000;

mixer {
\tchannels 2;
\tname "main room";
\tgain $rate;
}
`;

const diagnostics: CodeDiagnostic[] = [
  { line: 6, column: 7, severity: "error", message: "a name must be one word", code: "E12" },
  { line: 7, severity: "warning", message: "gain reads the rate, which is far above 1 and will clip every channel" },
  { line: 1, severity: "note", message: "a heading comment" },
];

/** An editor with the list under it, as an app lays them out; a row puts the caret at its place. */
function Demo(props: Omit<DiagnosticListProps, "editor">) {
  const [value, setValue] = useState(sample);
  const [caret, setCaret] = useState<CodeCaret | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  return (
    <div style={{ display: "grid", gap: "var(--pb-space-2)", maxWidth: "560px" }}>
      <CodeEditor
        aria-label="Settings"
        value={value}
        onChange={setValue}
        diagnostics={props.diagnostics}
        onCaret={setCaret}
        rows={9}
        ref={editor}
      />
      <DiagnosticList {...props} editor={editor} />
      <p style={{ margin: 0, color: "var(--pb-muted)", fontSize: "var(--pb-text-sm)" }}>
        {caret === null ? "No caret yet" : `Caret at line ${String(caret.line)}, column ${String(caret.column)}`}
      </p>
    </div>
  );
}

const meta = {
  title: "Composites/DiagnosticList",
  component: DiagnosticList,
  args: { diagnostics },
  argTypes: { diagnostics: { control: false } },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof DiagnosticList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each diagnostic in words under the box, marked by its severity; a press puts the caret at its place. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("3 problems");
    await userEvent.click(canvas.getByRole("button", { name: /a name must be one word/ }));
    await expect(canvas.getByRole("textbox", { name: "Settings" })).toHaveFocus();
    await waitFor(() => expect(canvas.getByText("Caret at line 6, column 7")).toBeInTheDocument());
  },
};

/** Under the example harbor brand in dark. */
export const DefaultHarborDark: Story = { ...Default, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const DefaultEmberLight: Story = { ...Default, globals: { brand: "ember", theme: "light" } };

/** From the keyboard: Tab reaches each row, and Enter puts the caret there. */
export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const row = canvas.getByRole("button", { name: /gain reads the rate/ });
    row.focus();
    await expect(getComputedStyle(row).outlineStyle).toBe("solid");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByText("Caret at line 7, column 1")).toBeInTheDocument());
  },
};

/** None: the count says so, in the status line that was there all along. */
export const Empty: Story = {
  args: { diagnostics: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("No problems");
    await expect(canvas.queryByRole("list")).toBeNull();
  },
};

/** On touch each row is a full target, with 16 px words. */
export const Touch: Story = {
  play: async ({ canvas }) => {
    await underTouch(async () => {
      const row = canvas.getByRole("button", { name: /a heading comment/ });
      await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
      await expect(getComputedStyle(row).fontSize).toBe("16px");
    });
  },
};

/** Its words through labels. */
export const Labels: Story = {
  args: {
    labels: {
      count: (n) => `${String(n)} Meldungen`,
      diagnostic: ({ line, message }) => `Zeile ${String(line)}: ${message}`,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("3 Meldungen");
    await expect(canvas.getByRole("button", { name: "Zeile 1: a heading comment" })).toBeInTheDocument();
  },
};

/** In right-to-left text the mark sits at the inline start, on the right. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <Demo {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByRole("button", { name: /a heading comment/ });
    const mark = row.querySelector(".pb-diagnostic-mark")?.getBoundingClientRect();
    const words = row.querySelector(".pb-diagnostic-words")?.getBoundingClientRect();
    await expect((mark?.left ?? 0) > (words?.left ?? 0)).toBe(true);
  },
};
