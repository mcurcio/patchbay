// The theme: system, light or dark, written to data-theme on <html> (docs/tokens.md#the-theme). System removes the
// attribute, so tokens.css's prefers-color-scheme rule decides. The choice is kept in localStorage through
// usePersistentState, under a key the app names (its own prefix), and themeScript gives the app's index.html a tiny
// inline script that applies the kept choice before the first paint, so a dark page never flashes light.
import { useLayoutEffect } from "react";
import { type PersistentStateOptions, usePersistentState } from "../use-persistent-state/usePersistentState";

export type ThemeChoice = "system" | "light" | "dark";

/** The switch's cycle order. */
export const themeChoices: readonly ThemeChoice[] = ["system", "light", "dark"];

/** The page follows the system until the person chooses. */
export const defaultTheme: ThemeChoice = "system";

/** The key used when the app names none. */
export const defaultThemeKey = "patchbay/theme";

/** The choice after `choice` in the cycle system, light, dark. */
export function nextTheme(choice: ThemeChoice): ThemeChoice {
  const at = themeChoices.indexOf(choice);
  return themeChoices[(at + 1) % themeChoices.length] ?? defaultTheme;
}

/** A kept value that is one of the three choices, else undefined. */
export function checkTheme(value: unknown): ThemeChoice | undefined {
  return themeChoices.find((choice) => choice === value);
}

/** Writes the choice onto the root it is given (the page's <html>): system removes data-theme. */
export function applyTheme(root: { dataset: DOMStringMap }, choice: ThemeChoice): void {
  if (choice === "system") delete root.dataset["theme"];
  else root.dataset["theme"] = choice;
}

/**
 * The body of an inline <script> for the app's index.html, run before the page draws: it applies the choice kept
 * under `key`, as useTheme keeps it, and does nothing when storage is blocked or the value is not light or dark.
 */
export function themeScript(key: string = defaultThemeKey): string {
  // JSON names the key as a string literal; "<" is escaped so the text cannot close the script element.
  const name = JSON.stringify(key).replace(/</g, "\\u003c");
  return (
    `try{var c=JSON.parse(localStorage.getItem(${name}));` +
    `if(c==="light"||c==="dark")document.documentElement.setAttribute("data-theme",c)}catch(e){}`
  );
}

export interface UseThemeOptions extends PersistentStateOptions {
  /** The localStorage key the choice is kept under: the app's own, with its prefix. */
  key?: string;
  /** Where data-theme is written; the page's <html> by default. */
  root?: { dataset: DOMStringMap };
}

/** The theme choice and its setter; the choice is kept, and written to data-theme on <html> before paint. */
export function useTheme(options: UseThemeOptions = {}): [ThemeChoice, (choice: ThemeChoice) => void] {
  const { key = defaultThemeKey, root, storage } = options;
  const [choice, setChoice] = usePersistentState<ThemeChoice>(
    key,
    defaultTheme,
    checkTheme,
    storage === undefined ? {} : { storage },
  );
  useLayoutEffect(() => {
    applyTheme(root ?? document.documentElement, choice);
  }, [root, choice]);
  return [choice, setChoice];
}
