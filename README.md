<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
    <img alt="patchbay" src="docs/assets/logo.svg" width="440">
  </picture>
</p>

patchbay is a React component library for apps that draw a live graph and let people edit it:
patch editors, pipeline and workflow builders, signal-flow and routing tools, dashboards over a
running engine. It gives you design tokens with light and dark themes, a brand mechanism so your
app keeps its own look, and accessible components that work from the keyboard and on a phone.

patchbay draws and handles interaction. Your app keeps its data, its protocol and its editing
model: components take props and report what the person did through callbacks.

**Status:** early (0.x). The tokens, the primitives, the first composites and hooks and the level
meter are built; the rest of the composites, the app shell and the React Flow graph components are
designed in [`docs/design/patchbay.md`](docs/design/patchbay.md) and not built yet. Expect breaking changes
between minor versions until 1.0.

## Install

```bash
npm install @mcurcio/patchbay react react-dom
```

React 19 is a peer dependency. The graph layer will also need `@xyflow/react` 12, and the code
views can highlight [knobly](https://github.com/mcurcio/knobly) text if you install `knobly`; both
are optional.

## Quickstart

Load the tokens once, at your app's entry, then use the components:

```tsx
import "@mcurcio/patchbay/tokens.css";
import "@mcurcio/patchbay/base.css"; // optional: body font, background and focus ring from the tokens
import { Button, Field, Pill, TextInput, ThemeSwitch } from "@mcurcio/patchbay/primitives";
import { useTheme } from "@mcurcio/patchbay/hooks";

export function Example() {
  const [theme, setTheme] = useTheme(); // "system" | "light" | "dark", kept in localStorage
  return (
    <form>
      <ThemeSwitch choice={theme} onChoose={setTheme} />
      <Field label="Name" hint="Letters and digits">
        <TextInput name="name" />
      </Field>
      <Pill tone="ok" label="running" />
      <Button tone="primary" type="submit">
        Save
      </Button>
    </form>
  );
}
```

The theme follows the system until the person picks one; `data-theme="light"` or `"dark"` on
`<html>` chooses it. `themeScript()` from `/hooks` gives the inline script that applies a kept
choice before the first paint.

## Your own look: brands

A brand is a stylesheet of your own that overrides patchbay's `--pb-` tokens under
`:root[data-brand="your-app"]`, for light and dark. Load it after `tokens.css` and set
`data-brand` on `<html>`. [`docs/tokens.md`](docs/tokens.md) lists every token and says how to
write a brand; [`examples/brands/`](examples/brands/) has two worked examples.

## Documentation

- [`docs/tokens.md`](docs/tokens.md): the tokens, the themes, writing a brand, and the contrast rules
- [`docs/components.md`](docs/components.md): every built component and hook, with props, keyboard
  and touch behaviour
- Storybook: every component's states under each example brand and theme (`pnpm storybook` in a
  clone)

## Contributing

Bug reports, ideas and pull requests are welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md), and
please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues: [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE)
