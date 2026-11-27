// A desktop browser matches no coarse pointer, so a story that checks a touch look applies the page's own touch rules
// (every rule inside a `(hover: none) and (pointer: coarse)` block, docs/foundations.md#density-and-touch, F35) to the
// whole page while it measures, then takes them away.

/** The page's touch rules, as written in the stylesheets the story loaded. */
function touchRules(): string {
  const rules: string[] = [];
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSMediaRule) || !rule.conditionText.includes("pointer: coarse")) continue;
      for (const inner of rule.cssRules) rules.push(inner.cssText);
    }
  }
  if (rules.length === 0) throw new Error("no touch rules on the page");
  return rules.join("\n");
}

/** Runs `check` with the page's touch rules applied, as on a touch screen. */
export async function underTouch(check: () => Promise<void>): Promise<void> {
  const style = document.createElement("style");
  style.textContent = touchRules();
  document.head.append(style);
  try {
    await check();
  } finally {
    style.remove();
  }
}
