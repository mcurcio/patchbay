// A token's colour as the browser computes it, for a story's play function to compare a drawn colour with: a probe
// element inside the story's root (so the brand and theme in force apply) takes the token as its text colour.

/** The computed colour of `--pb-<name>` under `root`, in the form `getComputedStyle` gives a drawn colour. */
export function tokenColor(root: Element, name: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(--pb-${name})`;
  root.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}
