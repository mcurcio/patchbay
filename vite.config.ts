// Vite builds the library into dist/ (one ES module per layer, its CSS beside it, the token and
// base stylesheets copied as written, and dist/testing.js); Vitest runs two projects: "unit"
// (jsdom, src/**/*.test.ts(x)) and "storybook" (every story as a test in Chromium, with its play function and the a11y check).
import { readFileSync } from "node:fs";
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

/**
 * Every JS entry, each a subpath export of its own: the layers, and "testing", the checks an app runs in its own tests
 * (docs/tokens.md#writing-a-brand), which draws nothing and imports no layer and no test runner.
 */
const entries = [...layers, "testing"] as const;

/** Every peer dependency, and anything under one ("react/jsx-runtime"), stays an import. */
const peers = Object.keys(pkg.peerDependencies);
const external = (id: string) => peers.some((peer) => id === peer || id.startsWith(`${peer}/`));

/**
 * The token and base stylesheets ship as written, not bundled: an app loads tokens.css, then its own
 * brand stylesheet (docs/tokens.md#writing-a-brand), then base.css if it wants it, then its own CSS,
 * so the cascade's order is the app's to set.
 */
function copyStylesheets(): Plugin {
  return {
    name: "patchbay:copy-stylesheets",
    apply: "build",
    generateBundle() {
      for (const file of ["tokens.css", "base.css"]) {
        this.emitFile({ type: "asset", fileName: file, source: readFileSync(src(`tokens/${file}`), "utf8") });
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

/**
 * A layer that uses another (a composite drawn with primitives) imports it through that layer's index
 * ("../../primitives"), and the build keeps that an import of the other layer's module ("./primitives.js"), so each
 * component's code and CSS ship once, in its own layer's files. Reaching past another layer's index would copy its
 * code into a shared chunk, so the build refuses it.
 */
function layersImportLayers(): Plugin {
  const layerOf = (file: string) => {
    const match = /\/src\/([^/]+)\//.exec(file.replaceAll("\\", "/"));
    return match !== null && (layers as readonly string[]).includes(match[1] ?? "") ? match[1] : undefined;
  };
  return {
    name: "patchbay:layers-import-layers",
    apply: "build",
    // Before Vite's own resolver, which would otherwise resolve the import to the other layer's source.
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (importer === undefined || !source.startsWith(".")) return null;
      const from = layerOf(importer);
      if (from === undefined) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved === null || resolved.external) return resolved;
      const to = layerOf(resolved.id);
      if (to === undefined || to === from) return resolved;
      if (resolved.id.replaceAll("\\", "/") !== src(`${to}/index.ts`).replaceAll("\\", "/")) {
        this.error(`${importer} reaches into the ${to} layer (${source}); import it from "../../${to}" instead`);
      }
      return { id: `./${to}.js`, external: true };
    },
  };
}

/**
 * The browsers the stylesheets are written for (README.md#browsers): the oldest of each that has every selector and
 * function they use, :dir() (Chromium 120, Safari 16.4), :has() (Firefox 121) and color-mix(). Below a browser that
 * has :dir(), the build would rewrite it into a list of right-to-left :lang()s, which a page that sets dir="rtl" with
 * another language does not match (docs/ux-rules.md#right-to-left, U70).
 */
const cssBrowsers = ["chrome120", "edge120", "firefox121", "safari16.4"];

/**
 * The build writes the stylesheets' selectors as they are: none of patchbay's stylesheets uses :lang(), so one in the
 * built CSS is a :dir() the build lowered (cssBrowsers), and the build stops rather than ship it.
 */
function keepDirSelectors(): Plugin {
  return {
    name: "patchbay:keep-dir-selectors",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== "asset" || !file.fileName.endsWith(".css")) continue;
        const css = typeof file.source === "string" ? file.source : new TextDecoder().decode(file.source);
        if (css.includes(":lang(")) {
          this.error(`${file.fileName} has a :lang() selector: the build lowered a :dir(); see cssBrowsers`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStylesheets(), importOwnCss(), layersImportLayers(), keepDirSelectors()],
  build: {
    target: "es2022",
    cssTarget: cssBrowsers,
    sourcemap: true,
    cssCodeSplit: true,
    lib: {
      entry: Object.fromEntries(entries.map((entry) => [entry, src(`${entry}/index.ts`)])),
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
          // read the token, component and example brand stylesheets as text.
          css: { include: [/\/src\/.*\.css/, /\/examples\/brands\/.*\.css/] },
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: fileURLToPath(new URL("./.storybook", import.meta.url)) })],
        // The code views import knobly's highlighter only when a story asks for it; found that late, Vite would
        // optimise it mid-run and reload the page under the tests, so it is optimised up front.
        optimizeDeps: { include: ["knobly/highlight"] },
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
