import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";
import { expect, waitFor } from "storybook/test";
import { type LiveSubscribe, useLiveValue } from "./useLiveValue";

/** A counter that ticks 20 times a second while anything listens: a hot value outside React state. */
function counter() {
  let value = 0;
  const listeners = new Set<() => void>();
  let timer: number | undefined;
  const subscribe: LiveSubscribe = (listener) => {
    listeners.add(listener);
    timer ??= window.setInterval(() => {
      value += 1;
      for (const each of listeners) each();
    }, 50);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
  };
  return { subscribe, read: () => value };
}

const source = counter();

/** Paints the count into a text node through a ref; the component renders once. */
function LiveCount() {
  const output = useRef<HTMLOutputElement>(null);
  useLiveValue(source.subscribe, source.read, (value) => {
    if (output.current !== null) output.current.textContent = String(value);
  });
  return (
    <p style={{ color: "var(--pb-text)", fontFamily: "var(--pb-font-ui)", fontSize: "var(--pb-text-md)" }}>
      Frames read: <output ref={output} aria-label="Count" />
    </p>
  );
}

const meta = {
  title: "Hooks/useLiveValue",
  component: LiveCount,
} satisfies Meta<typeof LiveCount>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The count moves while the component never re-renders. */
export const All: Story = {
  play: async ({ canvas }) => {
    const output = canvas.getByLabelText("Count");
    const first = Number(output.textContent);
    await waitFor(() => expect(Number(output.textContent)).toBeGreaterThan(first));
  },
};

/** Under the example harbor brand in dark. */
export const AllHarborDark: Story = { ...All, globals: { brand: "harbor", theme: "dark" } };

/** And under the example ember brand in light. */
export const AllEmberLight: Story = { ...All, globals: { brand: "ember", theme: "light" } };
