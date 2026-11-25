// The theme switch: one button that cycles system, light and dark. Its word is shown beside the icon, and its
// accessible name always says the choice, so it is never just a glyph; the icon is SVG, since a font may lack a ◐
// character. The choice is the app's (useTheme keeps it); the switch only says it and asks for the next. At phone
// width the word gives way to the icon alone, and the name still says the choice.
import type { ComponentPropsWithRef } from "react";
import type { ThemeChoice } from "../../hooks/use-theme/useTheme";
import "./ThemeSwitch.css";

export type { ThemeChoice };

/** The switch's words, each replaceable. */
export interface ThemeSwitchLabels {
  /** What the switch is: "Theme". */
  theme: string;
  system: string;
  light: string;
  dark: string;
  /** Said of system in the tooltip: "follows the system's setting". */
  systemHint: string;
  /** Before the next choice in the tooltip: "click for". */
  clickFor: string;
}

export const defaultThemeSwitchLabels: ThemeSwitchLabels = {
  theme: "Theme",
  system: "system",
  light: "light",
  dark: "dark",
  systemHint: "follows the system's setting",
  clickFor: "click for",
};

const order: readonly ThemeChoice[] = ["system", "light", "dark"];

/** The choice a press moves to: system, light, dark and back. */
function following(choice: ThemeChoice): ThemeChoice {
  return order[(order.indexOf(choice) + 1) % order.length] ?? "system";
}

export type ThemeSwitchProps = Omit<ComponentPropsWithRef<"button">, "children" | "onClick" | "type" | "title"> & {
  /** The theme now. */
  choice: ThemeChoice;
  /** Called with the next choice in the cycle when the switch is pressed. */
  onChoose: (next: ThemeChoice) => void;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<ThemeSwitchLabels>;
};

/** The switch's tooltip: what the theme is and what a press does. */
export function themeSwitchTitle(choice: ThemeChoice, labels: ThemeSwitchLabels = defaultThemeSwitchLabels): string {
  const hint = choice === "system" ? ` (${labels.systemHint})` : "";
  return `${labels.theme}: ${labels[choice]}${hint}; ${labels.clickFor} ${labels[following(choice)]}`;
}

export function ThemeSwitch({ choice, onChoose, labels, className, ...rest }: ThemeSwitchProps) {
  const words = { ...defaultThemeSwitchLabels, ...labels };
  return (
    <button
      {...rest}
      type="button"
      className={className === undefined ? "pb-theme-switch" : `pb-theme-switch ${className}`}
      title={themeSwitchTitle(choice, words)}
      aria-label={`${words.theme}: ${words[choice]}`}
      onClick={() => {
        onChoose(following(choice));
      }}
    >
      <svg className="pb-theme-switch-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
      <span className="pb-theme-switch-word">{words[choice]}</span>
    </button>
  );
}
