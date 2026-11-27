import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Banner, DiffView } from "../../composites";
import { CanvasTools } from "../../graph";
import { AppShell } from "../../shell";
import { StoryCanvas } from "../../test/story-canvas";
import { CloseGlyph, IconButton } from "../icon-button";
import { ThemeSwitch } from "../theme-switch";
import { ToolGroup } from "../tool-group";
import { Glyph } from "./Glyph";

/** An app's own glyph on the grid, beside patchbay's. */
const lock = (
  <Glyph>
    <path d="M4 7h8v6H4zM6 7V5a2 2 0 0 1 4 0v2" />
  </Glyph>
);

const meta = {
  title: "Primitives/Glyph",
  component: Glyph,
  args: { children: <path d="M3 8h10M8 3v10" /> },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof Glyph>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One glyph: a 16 px box, its lines within the middle 12 px, at a 1.75 stroke with round caps. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg");
    await expect(svg?.getBoundingClientRect().width).toBe(16);
    await expect(svg?.getBoundingClientRect().height).toBe(16);
  },
};

const diff = "@@ -1 +1 @@\n-gain 0.8\n+gain 1.2\n";

/**
 * Every glyph patchbay draws, with an app's own beside them: the close glyph, the theme switch, a diff's fold chevron,
 * the drawer's chevron, the canvas tools, and a text glyph in a tool group. Each SVG is 16 px, and its shapes lie
 * within the middle 12 px.
 */
export const Every: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--pb-space-3)" }}>
      <div style={{ display: "flex", gap: "var(--pb-space-2)", alignItems: "center" }}>
        <IconButton label="Close">
          <CloseGlyph />
        </IconButton>
        <ThemeSwitch choice="system" onChoose={() => {}} />
        <IconButton label="Lock the view">{lock}</IconButton>
        <ToolGroup label="Text glyphs">
          <IconButton label="Add">+</IconButton>
        </ToolGroup>
      </div>
      <Banner tone="warn" onDismiss={() => {}}>
        A banner with its Dismiss.
      </Banner>
      <DiffView files={[{ path: "graph/main.conf", diff }]} />
      <div style={{ height: "160px" }}>
        <AppShell
          drawer={{
            header: <span>Log</span>,
            content: <p>Lines</p>,
            open: false,
            onOpen: () => {},
            height: 120,
            onHeight: () => {},
          }}
        >
          <StoryCanvas height={100} nodes={[]}>
            <CanvasTools onTidy={() => {}} onMinimap={() => {}} />
          </StoryCanvas>
        </AppShell>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const glyphs = [...canvasElement.querySelectorAll<SVGSVGElement>("svg.pb-glyph")];
    // Close, theme, lock, the banner's Dismiss, the diff's chevron, the drawer's, and five canvas tools.
    await expect(glyphs.length).toBeGreaterThanOrEqual(11);
    for (const svg of glyphs) {
      const box = svg.getBoundingClientRect();
      await expect([box.width, box.height]).toEqual([16, 16]);
      await expect(getComputedStyle(svg).strokeWidth).toBe("1.75px");
      await expect(getComputedStyle(svg).strokeLinecap).toBe("round");
      for (const shape of svg.querySelectorAll<SVGGraphicsElement>("path, circle")) {
        const b = shape.getBBox();
        await expect(b.x).toBeGreaterThanOrEqual(1.99);
        await expect(b.y).toBeGreaterThanOrEqual(1.99);
        await expect(b.x + b.width).toBeLessThanOrEqual(14.01);
        await expect(b.y + b.height).toBeLessThanOrEqual(14.01);
      }
    }
    const text = canvasElement.querySelector(".pb-tool-group .pb-icon-button-glyph");
    await expect(text === null ? "" : getComputedStyle(text).fontSize).toBe("16px");
  },
};

/** Under the example harbor brand in dark. */
export const EveryHarborDark: Story = { ...Every, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const EveryEmberLight: Story = { ...Every, globals: { brand: "ember", theme: "light" } };
