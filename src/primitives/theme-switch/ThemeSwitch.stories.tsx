import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { ThemeSwitch, type ThemeChoice } from "./ThemeSwitch";

const meta = {
  title: "Primitives/ThemeSwitch",
  component: ThemeSwitch,
  args: { choice: "system", onChoose: fn() },
  argTypes: { choice: { control: "inline-radio", options: ["system", "light", "dark"] } },
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Theme: system" }));
    await expect(args.onChoose).toHaveBeenCalledWith("light");
  },
};

export const Light: Story = { args: { choice: "light" } };

export const Dark: Story = { args: { choice: "dark" } };

/** The app's own words. */
export const Labels: Story = {
  args: { choice: "dark", labels: { theme: "Thème", system: "système", light: "clair", dark: "sombre" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Thème: sombre" })).toHaveTextContent("sombre");
  },
};

/** Held by the story, as an app holds it: each press moves to the next choice (the page's theme is the toolbar's). */
export const Cycling: Story = {
  render: function Render(args) {
    const [choice, setChoice] = useState<ThemeChoice>("system");
    return (
      <ThemeSwitch
        {...args}
        choice={choice}
        onChoose={(next) => {
          args.onChoose(next);
          setChoice(next);
        }}
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(button).toHaveAccessibleName("Theme: light");
    await userEvent.click(button);
    await expect(button).toHaveAccessibleName("Theme: dark");
    await userEvent.click(button);
    await expect(button).toHaveAccessibleName("Theme: system");
  },
};

/** At phone width only the icon shows; the name still says the choice. */
export const Phone: Story = {
  args: { choice: "light" },
  globals: { viewport: { value: "phone" } },
};
