// Every story is drawn under the brand and theme the toolbar picks, set as data-brand and data-theme
// on the preview's <html>, as an app sets them on its own page. "none" is the base theme alone; the
// others are the example brands in examples/brands/, which the package does not ship.
import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/tokens/tokens.css";
import "../examples/brands/ember.css";
import "../examples/brands/harbor.css";
import "../src/tokens/base.css";

const brands = ["none", "ember", "harbor"] as const;
const themes = ["system", "light", "dark"] as const;

/** Applies the toolbar's brand and theme to the document before the story draws. */
const withBrandAndTheme: Decorator = (Story, context) => {
  const root = document.documentElement;
  const brand: unknown = context.globals["brand"];
  const theme: unknown = context.globals["theme"];
  // "none" is no attribute at all: the base tokens alone.
  if (typeof brand === "string" && brand !== "none") root.dataset["brand"] = brand;
  else delete root.dataset["brand"];
  // "system" is no attribute at all: the theme follows prefers-color-scheme.
  if (theme === "light" || theme === "dark") root.dataset["theme"] = theme;
  else delete root.dataset["theme"];
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    brand: {
      description: "An example brand (data-brand on <html>; none is the base theme)",
      toolbar: { title: "Brand", icon: "paintbrush", items: [...brands], dynamicTitle: true },
    },
    theme: {
      description: "The theme (data-theme on <html>; system follows the OS)",
      toolbar: { title: "Theme", icon: "contrast", items: [...themes], dynamicTitle: true },
    },
  },
  initialGlobals: { brand: "none", theme: "system" },
  decorators: [withBrandAndTheme],
  parameters: {
    // The shell's three widths (wide, narrow below 760 px, phone below 600 px).
    viewport: {
      options: {
        wide: { name: "Wide", styles: { width: "1280px", height: "800px" } },
        narrow: { name: "Narrow", styles: { width: "700px", height: "800px" } },
        phone: { name: "Phone", styles: { width: "390px", height: "844px" } },
      },
    },
    // An accessibility violation fails the story's test, not just its panel.
    a11y: { test: "error" },
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
