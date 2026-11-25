// Storybook is patchbay's catalogue, its documentation and a test surface: every story also runs as a test
// (vite.config.ts, the "storybook" project).
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  core: { disableTelemetry: true },
  // vite.config.ts is the library's build; Storybook builds an app from it, so it drops the
  // library's output plugins, library mode and the library's output options (which keep React
  // external).
  viteFinal(config) {
    const plugins = (config.plugins ?? []).flat().filter((plugin) => {
      const name = plugin && typeof plugin === "object" && "name" in plugin ? plugin.name : "";
      return !name.startsWith("patchbay:");
    });
    const { lib, rolldownOptions, ...build } = config.build ?? {};
    return { ...config, plugins, build };
  },
};

export default config;
