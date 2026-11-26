// The sizes the shell holds its panes to (docs/components.md#appshell): an inspector 280–560 px wide, and a drawer
// from 120 px to 70 % of the window's height. Pure, so an app can check a kept size with the same rules before it
// draws (as usePersistentState's check).

/** The inspector's width in px. */
export const inspectorBounds = { min: 280, max: 560 } as const;

/** The drawer's height: at least `min` px, at most `maxShare` of the window's height. */
export const drawerBounds = { min: 120, maxShare: 0.7 } as const;

/** `px` as whole px within `min` and `max`; a value that is not a finite number is `min`. */
function clamp(px: number, min: number, max: number): number {
  if (!Number.isFinite(px)) return min;
  return Math.min(max, Math.max(min, Math.round(px)));
}

/** The inspector's width as drawn for an asked `px`: whole px within 280–560. */
export function clampInspectorWidth(px: number): number {
  return clamp(px, inspectorBounds.min, inspectorBounds.max);
}

/** The tallest the drawer may be in a window `windowHeight` px high: 70 % of it, and never below the least. */
export function drawerMaxHeight(windowHeight: number): number {
  const share = Number.isFinite(windowHeight) ? Math.floor(windowHeight * drawerBounds.maxShare) : 0;
  return Math.max(drawerBounds.min, share);
}

/** The drawer's height as drawn for an asked `px` in a window `windowHeight` px high. */
export function clampDrawerHeight(px: number, windowHeight: number): number {
  return clamp(px, drawerBounds.min, drawerMaxHeight(windowHeight));
}
