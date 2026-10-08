# Basic consumer example

A standalone application importing only the installed `smithkit` package. It has
no source aliases, relative imports into the library, or dependency on demo code.
Use Node.js 24 and npm.

This example targets the upcoming 0.4.0 API. Before publication, build an archive
from the repository root and install it in the example directory:

```sh
npm ci
npm pack
cd examples/basic
npm install --no-save --package-lock=false ../../smithkit-0.3.0.tgz
npm run dev
```

After 0.4.0 is published, run `npm install` and `npm run dev` from this directory.
The example can also be copied into a separate project. When testing a copied
example against the local checkout, use the archive's absolute path instead.

- **Mount chart** demonstrates creating an instance, configuring layers, adding a
  trace and marker, and subscribing to events. Repeated mounting cleans up first.
- **Replace sweep** updates samples while preserving the marker's frequency.
- **Compact chart** resizes the host; point radii remain constant in CSS pixels.
- **Unmount chart** unsubscribes and calls `destroy()` before removing references.

`npm run build` produces a standalone site in `dist/`. The repository's
`check:example` command installs the release archive in a temporary copy, compiles
this consumer as part of the full examples gallery against the installed types, builds it, and exercises these controls
in Chromium and WebKit.
