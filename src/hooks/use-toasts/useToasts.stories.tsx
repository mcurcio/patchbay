import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { Toaster } from "../../composites";
import { Button } from "../../primitives";
import { useToasts } from "./useToasts";

/** Buttons that show toasts into a Toaster: the same key coalesces, and each goes after its duration. */
function ToastsDemo({ duration }: { duration?: number }) {
  const toasts = useToasts({ duration });
  return (
    <div style={{ position: "relative", height: "420px", background: "var(--pb-surface)" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Button onClick={() => toasts.show({ tone: "ok", text: "Saved." })}>Save</Button>
        <Button
          onClick={() =>
            toasts.show({
              tone: "err",
              text: "The edit was refused.",
              key: "refused",
              action: { label: "Retry", run: () => {} },
            })
          }
        >
          Refuse
        </Button>
        <Button onClick={toasts.clear}>Clear</Button>
      </div>
      <Toaster {...toasts.toasterProps} />
    </div>
  );
}

const meta = {
  title: "Hooks/useToasts",
  component: ToastsDemo,
} satisfies Meta<typeof ToastsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three refusals in a row are one toast that counts up; the stack clears. */
export const All: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    for (let each = 0; each < 3; each += 1) await userEvent.click(canvas.getByRole("button", { name: "Refuse" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent("The edit was refused. ×3, 3 times");
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(canvas.queryByRole("region", { name: "Notifications" })).toBeNull();
  },
};

/** A short duration: the toast goes by itself. */
export const Expiry: Story = {
  args: { duration: 300 },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Saved.");
    await waitFor(() => expect(canvas.queryByRole("status")).toBeNull());
  },
};

/** Under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
