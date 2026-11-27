import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeSwitch, themeSwitchTitle } from "./ThemeSwitch";
import css from "./ThemeSwitch.css?raw";

describe("ThemeSwitch", () => {
  it("is named by the choice and shows its word", () => {
    render(<ThemeSwitch choice="dark" onChoose={() => undefined} />);
    const button = screen.getByRole("button", { name: "Theme: dark" });
    expect(button).toHaveTextContent("dark");
    expect(button).toHaveAttribute("type", "button");
  });

  it("asks for the next choice: system, light, dark and back", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    const { rerender } = render(<ThemeSwitch choice="system" onChoose={onChoose} />);
    await user.click(screen.getByRole("button"));
    rerender(<ThemeSwitch choice="light" onChoose={onChoose} />);
    await user.click(screen.getByRole("button"));
    rerender(<ThemeSwitch choice="dark" onChoose={onChoose} />);
    await user.click(screen.getByRole("button"));
    expect(onChoose.mock.calls).toEqual([["light"], ["dark"], ["system"]]);
  });

  it("is pressed from the keyboard", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ThemeSwitch choice="light" onChoose={onChoose} />);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onChoose.mock.calls).toEqual([["dark"], ["dark"]]);
  });

  it("says what the theme is and what a press does", () => {
    expect(themeSwitchTitle("system")).toBe("Theme: system (follows the system's setting); click for light");
    expect(themeSwitchTitle("light")).toBe("Theme: light; click for dark");
    expect(themeSwitchTitle("dark")).toBe("Theme: dark; click for system");
    render(<ThemeSwitch choice="light" onChoose={() => undefined} />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Theme: light; click for dark");
  });

  it("takes the app's words, keeping the defaults it does not replace", () => {
    render(
      <ThemeSwitch
        choice="system"
        onChoose={() => undefined}
        labels={{ theme: "Thème", system: "système", light: "clair" }}
      />,
    );
    const button = screen.getByRole("button", { name: "Thème: système" });
    expect(button).toHaveTextContent("système");
    expect(button).toHaveAttribute("title", "Thème: système (follows the system's setting); click for clair");
  });

  it("passes native props and keeps its own class", () => {
    render(<ThemeSwitch choice="dark" onChoose={() => undefined} className="mine" data-testid="t" disabled />);
    const button = screen.getByTestId("t");
    expect(button).toHaveClass("pb-theme-switch", "mine");
    expect(button).toBeDisabled();
  });

  it("hides the word at phone width and is a 36 px target on touch", () => {
    expect(css).toMatch(/@media \(max-width: 599\.98px\)[\s\S]*?\.pb-theme-switch-word \{\s*display: none;/);
    expect(css).toMatch(/@media \(hover: none\) and \(pointer: coarse\)[\s\S]*?min-width: 36px/);
  });

  it("is drawn by a neutral Button, so its hover, motion, touch height and forced colours are Button's", () => {
    render(<ThemeSwitch choice="dark" onChoose={() => undefined} />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("pb-button", "pb-theme-switch");
    expect(button).toHaveAttribute("data-tone", "neutral");
    // None of Button's look is copied here: no face, edge, transition, hover or forced-colours rule of its own.
    expect(css).not.toMatch(/background|border|transition|:hover|forced-colors|tap-highlight/);
  });
});
