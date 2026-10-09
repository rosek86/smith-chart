# Integration examples

[Open the gallery](https://rosek86.github.io/smithkit/examples/index.html) from the
main demo's **Examples** link. Each page demonstrates one library task and displays
the TypeScript it executes, rather than a separately maintained snippet.

| Example                                     | Public API focus                                         |
| ------------------------------------------- | -------------------------------------------------------- |
| [Large trace](large-trace/main.ts)          | 100,000 packed samples, zoom, full-data marker selection |
| [Static chart](static/main.ts)              | constructor options, `draw`, grid detail, traces         |
| [External marker controls](markers/main.ts) | stable marker IDs, `onEvent`, sample selection, focus    |
| [Themes and overrides](appearance/main.ts)  | `setOptions`, presets, overrides                         |
| [Report export](export/main.ts)             | SVG/PNG, image size, background, marker legends          |
| [Mount, update, and destroy](basic/main.ts) | subscriptions, data replacement, resize, cleanup         |

Use Node.js 24 and npm. This directory can be copied into a separate project.

The compact-input examples (static, markers, and large trace) require the current
local package until those additions are released. To run this gallery now:

```sh
# From the repository root:
npm pack
cd examples
npm install
npm install --no-save --package-lock=false ../smithkit-0.4.0.tgz
npm run dev
```

Use the archive's absolute path when running a copied gallery. The declared
`smithkit@^0.4.0` dependency alone does not yet include compact trace inputs.

`npm run build` creates the complete standalone gallery in `dist/`. It imports the
installed `smithkit` package and has no aliases to repository source. The basic
example also remains runnable independently from its own directory.

The pages use ordinary HTML elements and containers with an explicit size. A white
host background keeps the light theme's dark labels readable: the light preset's
SVG background is transparent. The dark preset supplies its own opaque background.
For framework integration, create the chart after mounting the host element, retain
returned IDs/subscriptions, and call the unsubscribe functions and `destroy()`
when unmounting. The lifecycle example shows this explicitly. The other examples
keep the chart alive for the lifetime of the page, including browser back/forward
navigation.

The repository's `check:example` command installs the exact packed library into a
temporary copy of this gallery, compiles it against the installed declarations,
builds it, and checks the integrations in Chromium and WebKit.
