// Key bindings for a whole page (docs/components.md#useshortcuts): a table of bindings, each a key string such as
// "Mod+K" (Cmd on Apple platforms, Ctrl elsewhere) and what it runs, read by one window listener. Single keys and
// Escape never act while the person types in a text field; a chord (a key with Mod, Ctrl, Alt or Meta) acts there
// only when its binding opts in. Elements inside React Flow's `nokey` class count as text fields, as React Flow
// counts them, so the canvas's Delete and Backspace and the app's never both act on one press.
import { useEffect, useRef } from "react";

/** Apple platforms use Cmd for Mod and draw modifiers as symbols; every other platform uses Ctrl. */
export type Platform = "apple" | "other";

export type Shortcut = {
  /**
   * The key, or several keys that do the same: modifiers then the key, joined by "+" ("Mod+K", "Shift+?",
   * "Delete", "Mod+Shift+Z"). Modifiers are Mod, Ctrl, Alt, Shift and Meta (any case); the key is a
   * KeyboardEvent key name ("Escape", "ArrowUp", "Space") or the character it types. A string naming a
   * modifier it does not know never matches.
   */
  keys: string | readonly string[];
  /** What the binding does; called with the keydown event. */
  run: (event: KeyboardEvent) => void;
  /** Lets a chord act while focus is in a text field. Single keys and Escape never do, whatever this says. */
  inTextFields?: boolean;
  /** False turns the binding off without removing it from the table. */
  enabled?: boolean;
  /** Acts on the key's auto-repeat too; by default only the first press of a held key acts. */
  repeat?: boolean;
  /** False leaves the browser's own action for the key in place; by default a matched press prevents it. */
  preventDefault?: boolean;
};

export type UseShortcutsOptions = {
  /** False turns every binding off (while a dialog the bindings must not reach is open, say). */
  enabled?: boolean;
  /** Overrides the platform read from the browser. */
  platform?: Platform;
};

/** The platform the page runs on, from the browser; "other" without one. */
export function detectPlatform(given?: Navigator): Platform {
  const nav = given ?? (typeof navigator === "undefined" ? undefined : navigator);
  if (nav === undefined) return "other";
  const data = (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const name = data?.platform || nav.platform || nav.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(name) ? "apple" : "other";
}

type Parsed = {
  /** Lower case, aliases resolved: what a keydown's key is compared with. */
  key: string;
  /** The key as the string wrote it, for a label of a key with no name of its own. */
  written: string;
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

const modifierNames: Record<string, keyof Omit<Parsed, "key" | "written">> = {
  mod: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  shift: "shift",
  meta: "meta",
  cmd: "meta",
  command: "meta",
};

const keyAliases: Record<string, string> = { space: " ", spacebar: " ", esc: "escape", plus: "+" };

/** Reads a key string; undefined when it names a modifier it does not know, or no key. */
function parseKeys(keys: string): Parsed | undefined {
  let rest = keys === " " ? "Space" : keys.trim();
  let key: string;
  // "+" as the key itself: "Mod++" or a lone "+".
  if (rest === "+") return { key: "+", written: "+", mod: false, ctrl: false, alt: false, shift: false, meta: false };
  if (rest.endsWith("++")) {
    key = "+";
    rest = rest.slice(0, -2);
  } else {
    const at = rest.lastIndexOf("+");
    key = rest.slice(at + 1);
    rest = at < 0 ? "" : rest.slice(0, at);
  }
  if (key === "") return undefined;
  const lower = key.toLowerCase();
  const parsed: Parsed = {
    key: keyAliases[lower] ?? lower,
    written: key,
    mod: false,
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };
  for (const part of rest === "" ? [] : rest.split("+")) {
    const name = modifierNames[part.trim().toLowerCase()];
    if (name === undefined) return undefined;
    parsed[name] = true;
  }
  return parsed;
}

/** A chord holds Mod, Ctrl, Alt or Meta; Shift alone is typing. */
function isChord(parsed: Parsed): boolean {
  return parsed.mod || parsed.ctrl || parsed.alt || parsed.meta;
}

/** A character that Shift itself makes ("?", "!"), whose binding need not name Shift. */
function isShiftedCharacter(key: string): boolean {
  return key.length === 1 && key.toLowerCase() === key.toUpperCase() && key !== " ";
}

type KeyEventLike = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

function matchesParsed(event: KeyEventLike, parsed: Parsed, platform: Platform): boolean {
  const wantCtrl = parsed.ctrl || (parsed.mod && platform !== "apple");
  const wantMeta = parsed.meta || (parsed.mod && platform === "apple");
  if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta || event.altKey !== parsed.alt) return false;
  if (!(isShiftedCharacter(parsed.key) && !parsed.shift) && event.shiftKey !== parsed.shift) return false;
  const pressed = event.key.toLowerCase();
  if (pressed === parsed.key) return true;
  // A letter or digit the layout or Alt turned into another character (Alt+K is "˚" on a Mac, K is "к" on a Russian
  // layout) is found by its physical key; a Latin letter that differs is another key (Q on an AZERTY layout).
  if (/^[a-z]$/.test(pressed) || !/^[a-z0-9]$/.test(parsed.key)) return false;
  return event.code === (/[a-z]/.test(parsed.key) ? `Key${parsed.key.toUpperCase()}` : `Digit${parsed.key}`);
}

/** Whether a keydown matches a key string (or any of several) on the platform. */
export function matchesKeys(
  event: KeyEventLike,
  keys: string | readonly string[],
  platform: Platform = detectPlatform(),
): boolean {
  const list = typeof keys === "string" ? [keys] : keys;
  return list.some((one) => {
    const parsed = parseKeys(one);
    return parsed !== undefined && matchesParsed(event, parsed, platform);
  });
}

const notTextInputs = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/**
 * Whether keys pressed at the target belong to it: a text input, a textarea, a select, editable content, or anything
 * inside an element with React Flow's `nokey` class.
 */
export function isTextTarget(target: EventTarget | null): boolean {
  if (target === null || typeof (target as Element).closest !== "function") return false;
  const element = target as HTMLElement;
  if (element.closest(".nokey") !== null) return true;
  const tag = element.tagName.toLowerCase();
  if (tag === "input") return !notTextInputs.has(((element as HTMLInputElement).type || "text").toLowerCase());
  if (tag === "textarea" || tag === "select") return true;
  if (element.isContentEditable) return true;
  return element.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

type LabelOptions = {
  /** The platform the label is for; the browser's by default. */
  platform?: Platform;
  /** Replaces the words for keys and modifiers, by their names ("Escape", "Ctrl", "Space"). */
  names?: Readonly<Record<string, string>>;
};

const appleModifiers = { ctrl: "⌃", alt: "⌥", shift: "⇧", meta: "⌘" } as const;
const otherModifiers = { ctrl: "Ctrl", alt: "Alt", shift: "Shift", meta: "Meta" } as const;

const sharedKeys: Record<string, string> = {
  " ": "Space",
  escape: "Esc",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  pageup: "Page Up",
  pagedown: "Page Down",
  home: "Home",
  end: "End",
};
const appleKeys: Record<string, string> = { enter: "↩", backspace: "⌫", delete: "⌦", tab: "⇥" };
const otherKeys: Record<string, string> = { enter: "Enter", backspace: "Backspace", delete: "Delete", tab: "Tab" };

const knownNames = [
  "Escape",
  "Enter",
  "Tab",
  "Backspace",
  "Delete",
  "Insert",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
];
const canonicalNames: Record<string, string> = Object.fromEntries<string>([
  ...knownNames.map((name): [string, string] => [name.toLowerCase(), name]),
  [" ", "Space"],
]);

/** A parsed key's KeyboardEvent name, as `names` is keyed: "Escape", "ArrowUp", "Space", "K", "F5". */
function canonicalName(parsed: Parsed): string {
  return canonicalNames[parsed.key] ?? (parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.written);
}

/**
 * The key string as people read it: "⌘K" on Apple platforms and "Ctrl+K" elsewhere, "⇧⌘Z" and "Ctrl+Shift+Z". A
 * string it cannot read is shown as written.
 */
export function keyLabel(keys: string, options: LabelOptions = {}): string {
  const { platform = detectPlatform(), names = {} } = options;
  const parsed = parseKeys(keys);
  if (parsed === undefined) return keys;
  const apple = platform === "apple";
  const ctrl = parsed.ctrl || (parsed.mod && !apple);
  const meta = parsed.meta || (parsed.mod && apple);
  const words = apple ? appleModifiers : otherModifiers;
  const modifiers: string[] = [];
  // Apple's order is ⌃⌥⇧⌘; elsewhere Ctrl, Alt, Shift, Meta.
  if (ctrl) modifiers.push(names["Ctrl"] ?? words.ctrl);
  if (parsed.alt) modifiers.push(names["Alt"] ?? words.alt);
  if (parsed.shift) modifiers.push(names["Shift"] ?? words.shift);
  if (meta) modifiers.push(names["Meta"] ?? words.meta);
  const lookup = parsed.key;
  const canonical = canonicalName(parsed);
  const named = names[canonical] ?? (apple ? appleKeys[lookup] : otherKeys[lookup]) ?? sharedKeys[lookup] ?? canonical;
  return apple ? [...modifiers, named].join("") : [...modifiers, named].join("+");
}

const ariaKeys: Record<string, string> = { " ": "Space", "+": "Plus" };

/** The key strings as an `aria-keyshortcuts` value: "Meta+K" on Apple platforms, "Control+K" elsewhere. */
export function ariaKeyShortcuts(keys: string | readonly string[], platform: Platform = detectPlatform()): string {
  const list = typeof keys === "string" ? [keys] : keys;
  return list
    .flatMap((one) => {
      const parsed = parseKeys(one);
      if (parsed === undefined) return [];
      const parts: string[] = [];
      if (parsed.ctrl || (parsed.mod && platform !== "apple")) parts.push("Control");
      if (parsed.alt) parts.push("Alt");
      if (parsed.shift) parts.push("Shift");
      if (parsed.meta || (parsed.mod && platform === "apple")) parts.push("Meta");
      parts.push(ariaKeys[parsed.key] ?? canonicalName(parsed));
      return [parts.join("+")];
    })
    .join(" ");
}

/** The first binding in the table that this keydown should run, if any. */
export function findShortcut(
  event: KeyboardEvent,
  bindings: readonly Shortcut[],
  platform: Platform = detectPlatform(),
): Shortcut | undefined {
  // A press a component already handled (a dialog's Escape) or one inside an input method's composition is not ours.
  if (event.defaultPrevented || event.isComposing || event.key === "Process") return undefined;
  const inText = isTextTarget(event.target);
  for (const binding of bindings) {
    if (binding.enabled === false) continue;
    if (event.repeat && binding.repeat !== true) continue;
    const list = typeof binding.keys === "string" ? [binding.keys] : binding.keys;
    for (const one of list) {
      const parsed = parseKeys(one);
      if (parsed === undefined || !matchesParsed(event, parsed, platform)) continue;
      if (inText && !(binding.inTextFields === true && isChord(parsed) && parsed.key !== "escape")) continue;
      return binding;
    }
  }
  return undefined;
}

/**
 * Binds the table's keys on the window while the component is mounted. The table may change every render; the
 * listener always reads the latest. The first binding that matches a press runs, and only it.
 */
export function useShortcuts(bindings: readonly Shortcut[], options: UseShortcutsOptions = {}): void {
  const { enabled = true, platform } = options;
  const latest = useRef({ bindings, platform });
  useEffect(() => {
    latest.current = { bindings, platform };
  });
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const { bindings: table, platform: chosen } = latest.current;
      const binding = findShortcut(event, table, chosen ?? detectPlatform());
      if (binding === undefined) return;
      if (binding.preventDefault !== false) event.preventDefault();
      binding.run(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled]);
}
