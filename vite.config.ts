// Vite builds the library into dist/ (one ES module per layer, its CSS beside it, the token and
// brand stylesheets copied as written); Vitest runs two projects: "unit" (jsdom, src/**/*.test.ts(x))
// and "storybook" (every story as a test in Chromium, with its play function and the a11y check).
import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

/** The JS layers, each a subpath export of its own ("@mcurcio/patchbay/primitives"). */
const layers = ["primitives", "composites", "shell", "graph", "hooks"] as const;

/** Every peer dependency, and anything under one ("react/jsx-runtime"), stays an import. */
const peers = Object.keys(pkg.peerDependencies);
const external = (id: string) => peers.some((peer) => id === peer || id.startsWith(`${peer}/`));

/**
 * The token, base and brand stylesheets ship as written, not bundled: an app loads tokens.css, then
 * its brand (then base.css if it wants it), then its own CSS, and a brand's selectors must reach the browser unchanged.
 */
function copyStylesheets(): Plugin {
  return {
    name: "patchbay:copy-stylesheets",
    apply: "build",
    generateBundle() {
      for (const file of ["tokens.css", "base.css"]) {
        this.emitFile({ type: "asset", fileName: file, source: readFileSync(src(`tokens/${file}`), "utf8") });
      }
      for (const file of readdirSync(src("brands")).filter((name) => name.endsWith(".css"))) {
        this.emitFile({
          type: "asset",
          fileName: `brands/${file}`,
          source: readFileSync(src(`brands/${file}`), "utf8"),
        });
      }
    },
  };
}

/**
 * Library mode drops a chunk's CSS imports from its JS; put them back, so importing a layer loads
 * its stylesheet (dist/primitives.js starts with `import "./primitives.css"`). package.json marks
 * CSS as a side effect so no bundler drops that import.
 */
function importOwnCss(): Plugin {
  return {
    name: "patchbay:import-own-css",
    apply: "build",
    // After every renderChunk, when Vite has listed each chunk's CSS. The imports go on the first
    // line, so the source map's lines still match.
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const css = [...(chunk.viteMetadata?.importedCss ?? [])];
        const from = posix.dirname(chunk.fileName);
        const imports = css.map((file) => `import "./${posix.relative(from, file)}";`);
        if (imports.length > 0) chunk.code = imports.join("") + chunk.code;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStylesheets(), importOwnCss()],
  build: {
    target: "es2022",
    sourcemap: true,
    cssCodeSplit: true,
    lib: {
      entry: Object.fromEntries(layers.map((layer) => [layer, src(`${layer}/index.ts`)])),
      formats: ["es"],
    },
    rolldownOptions: {
      external,
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
  test: {
    // An empty layer has no tests yet; an empty run passes.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["src/test/setup.ts"],
          // Vitest blanks every stylesheet by default, even one imported "?raw"; the token tests
          // read the token, brand and component stylesheets as text.
          css: { include: [/\/src\/.*\.css/] },
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: fileURLToPath(new URL("./.storybook", import.meta.url)) })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
