import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { usePersistentState } from "../../hooks";
import { Button, Dialog, IconButton, Panel, Pill, ThemeSwitch, ToolGroup } from "../../primitives";
import { AppShell, type AppShellProps } from "./AppShell";
import { clampDrawerHeight, clampInspectorWidth } from "./bounds";

/** A stand-in canvas: the workspace's dotted surface. */
function Canvas() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        color: "var(--pb-muted)",
        backgroundImage: "radial-gradient(var(--pb-line) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      Canvas
    </div>
  );
}

function Settings() {
  return (
    <Panel title="transform_1" level={2}>
      <p style={{ margin: 0 }}>The selected node&apos;s settings.</p>
    </Panel>
  );
}

function Log() {
  return (
    <div style={{ padding: "8px 12px", fontFamily: "var(--pb-font-code)", fontSize: "var(--pb-text-sm)" }}>
      <div>12:00:01 started</div>
      <div>12:00:02 linked out to in</div>
      <label style={{ display: "block", marginTop: "8px" }}>
        Note <input aria-label="Note" defaultValue="" />
      </label>
    </div>
  );
}

const topBar = {
  brand: "patchbay",
  status: <Pill tone="ok" label="Connected" />,
  start: (
    <ToolGroup label="Edit">
      <IconButton label="Add a node">+</IconButton>
      <IconButton label="Undo">↶</IconButton>
    </ToolGroup>
  ),
  end: <ThemeSwitch choice="system" onChoose={() => {}} />,
};

type Seed = { inspectorOpen?: boolean; width?: number; drawerOpen?: boolean; height?: number };

/** The shell with its sizes and open states held by the story, as an app holds them. */
function Held({ seed = {}, ...props }: Partial<AppShellProps> & { seed?: Seed; children?: ReactNode }) {
  const [inspectorOpen, setInspectorOpen] = useState(seed.inspectorOpen ?? true);
  const [width, setWidth] = useState(seed.width ?? 320);
  const [drawerOpen, setDrawerOpen] = useState(seed.drawerOpen ?? true);
  const [height, setHeight] = useState(seed.height ?? 180);
  return (
    <AppShell
      topBar={{
        ...topBar,
        start: (
          <Button
            size="sm"
            aria-pressed={inspectorOpen}
            onClick={() => {
              setInspectorOpen(!inspectorOpen);
            }}
          >
            Inspector
          </Button>
        ),
      }}
      inspector={{ content: <Settings />, open: inspectorOpen, onOpen: setInspectorOpen, width, onWidth: setWidth }}
      drawer={{ header: "Log", content: <Log />, open: drawerOpen, onOpen: setDrawerOpen, height, onHeight: setHeight }}
      {...props}
    >
      {props.children ?? <Canvas />}
    </AppShell>
  );
}

const meta = {
  title: "Shell/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  args: { children: <Canvas /> },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every part, held by the story: drag or key the splitters, show and hide the drawer. */
export const Wide: Story = {
  render: () => <Held />,
  play: async ({ canvas, userEvent }) => {
    const inspector = canvas.getByRole("complementary", { name: "Inspector" });
    await expect(inspector).toHaveStyle({ width: "320px" });
    const splitter = canvas.getByRole("separator", { name: "Resize the inspector" });
    splitter.focus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(inspector).toHaveStyle({ width: "336px" });
    await expect(splitter).toHaveAttribute("aria-valuenow", "336");

    const drawer = canvas.getByRole("region", { name: "Drawer" });
    await expect(drawer).toHaveStyle({ height: "180px" });
    canvas.getByRole("separator", { name: "Resize the drawer" }).focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(drawer).toHaveStyle({ height: "196px" });

    // Hidden and shown again, the body keeps what was typed.
    await userEvent.type(canvas.getByRole("textbox", { name: "Note" }), "kept");
    await userEvent.click(canvas.getByRole("button", { name: "Hide the drawer" }));
    await expect(canvas.queryByRole("textbox", { name: "Note" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Show the drawer" }));
    await expect(canvas.getByRole("textbox", { name: "Note" })).toHaveValue("kept");

    await userEvent.click(canvas.getByRole("button", { name: "Inspector" }));
    await expect(canvas.queryByRole("complementary")).toBeNull();
  },
};

export const InspectorClosed: Story = { render: () => <Held seed={{ inspectorOpen: false }} /> };

export const DrawerClosed: Story = { render: () => <Held seed={{ drawerOpen: false }} /> };

/** A top bar and a canvas, nothing else. */
export const BarOnly: Story = { args: { topBar } };

/** Just the canvas, inside the safe-area insets. */
export const CanvasOnly: Story = {};

/** Below 760 px the inspector is a sheet over the canvas's right edge; Escape inside it closes it. */
export const Narrow: Story = {
  globals: { viewport: { value: "narrow" } },
  render: () => <Held />,
  play: async ({ canvas, userEvent }) => {
    const sheet = await canvas.findByRole("dialog", { name: "Inspector" });
    await expect(sheet).toHaveAttribute("data-side", "right");
    await expect(canvas.queryByRole("complementary")).toBeNull();
    // The app's own toggle closes and opens it, and so does the sheet's close button.
    await userEvent.click(canvas.getByRole("button", { name: "Inspector" }));
    await expect(canvas.queryByRole("dialog")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Inspector" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Close" }));
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

/** Below 600 px the inspector rises from the bottom, at most 62 % of the workspace. */
export const Phone: Story = {
  globals: { viewport: { value: "phone" } },
  render: () => <Held />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("dialog", { name: "Inspector" })).toHaveAttribute("data-side", "bottom");
  },
};

/**
 * Escape's order: a dialog the app opens is modal and holds the focus, so it takes Escape first and the inspector's
 * sheet stays; the sheet closes on Escape only while the focus is inside it.
 */
export const EscapeOrder: Story = {
  globals: { viewport: { value: "narrow" } },
  render: function Render() {
    const [dialog, setDialog] = useState(false);
    return (
      <>
        <Held
          topBar={{
            ...topBar,
            start: (
              <Button
                size="sm"
                onClick={() => {
                  setDialog(true);
                }}
              >
                Settings
              </Button>
            ),
          }}
        />
        <Dialog
          open={dialog}
          onClose={() => {
            setDialog(false);
          }}
          title="Settings"
        >
          <p style={{ margin: 0 }}>The app&apos;s own dialog.</p>
        </Dialog>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("dialog", { name: "Inspector" });
    await userEvent.click(canvas.getByRole("button", { name: "Settings" }));
    await waitFor(() => expect(document.querySelector(".pb-dialog")).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(document.querySelector(".pb-dialog")).toBeNull());
    await expect(canvas.getByRole("dialog", { name: "Inspector" })).toBeInTheDocument();
    // Escape inside the sheet closes it.
    canvas.getByRole("button", { name: "Close" }).focus();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByRole("dialog", { name: "Inspector" })).toBeNull();
  },
};

/** Sizes the app kept from a larger window: drawn within the bounds, and not written back until the person drags. */
export const OutOfBounds: Story = {
  args: {
    inspector: { content: <Settings />, open: true, onOpen: fn(), width: 9000, onWidth: fn() },
    drawer: { header: "Log", content: <Log />, open: true, onOpen: fn(), height: 9000, onHeight: fn() },
  },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("complementary")).toHaveStyle({ width: "560px" });
    await expect(canvas.getByRole("separator", { name: "Resize the drawer" })).toHaveAttribute(
      "aria-valuenow",
      String(clampDrawerHeight(9000, window.innerHeight)),
    );
    await expect(args.inspector?.onWidth).not.toHaveBeenCalled();
  },
};

/** The app's words for the shell's own. */
export const Labels: Story = {
  render: () => (
    <Held
      labels={{
        inspector: "Eigenschaften",
        drawer: "Protokoll",
        resizeInspector: "Eigenschaften anpassen",
        resizeDrawer: "Protokoll anpassen",
        showDrawer: "Protokoll zeigen",
        hideDrawer: "Protokoll verbergen",
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("complementary", { name: "Eigenschaften" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Protokoll verbergen" })).toBeInTheDocument();
  },
};

/** In right-to-left text the inspector is at the inline end, the left, and its splitter mirrors. */
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  render: () => <Held />,
  play: async ({ canvas, userEvent }) => {
    const inspector = canvas.getByRole("complementary");
    canvas.getByRole("separator", { name: "Resize the inspector" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(inspector).toHaveStyle({ width: "336px" });
  },
};

const isOpen = (value: unknown) => (typeof value === "boolean" ? value : undefined);
const isNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/**
 * The shell keeps nothing; an app keeps its sizes and open states with usePersistentState, here under the story's
 * own keys, so a reload keeps them. The kept width is checked with the shell's own bounds.
 */
export const Kept: Story = {
  render: function Render() {
    const [inspectorOpen, setInspectorOpen] = usePersistentState("patchbay-story/shell/inspector-open", true, isOpen);
    const [width, setWidth] = usePersistentState("patchbay-story/shell/inspector-width", 320, (value) => {
      const px = isNumber(value);
      return px === undefined ? undefined : clampInspectorWidth(px);
    });
    const [drawerOpen, setDrawerOpen] = usePersistentState("patchbay-story/shell/drawer-open", true, isOpen);
    const [height, setHeight] = usePersistentState("patchbay-story/shell/drawer-height", 180, isNumber);
    return (
      <AppShell
        topBar={topBar}
        inspector={{ content: <Settings />, open: inspectorOpen, onOpen: setInspectorOpen, width, onWidth: setWidth }}
        drawer={{
          header: "Log",
          content: <Log />,
          open: drawerOpen,
          onOpen: setDrawerOpen,
          height,
          onHeight: setHeight,
        }}
      >
        <Canvas />
      </AppShell>
    );
  },
};

/** Every part, for a glance under each brand and theme. */
export const All: Story = { render: () => <Held /> };

/** The same under the example harbor brand in dark, so the accessibility check covers its contrast too. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
