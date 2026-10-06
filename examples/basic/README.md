# Basic consumer example

A standalone application importing only the installed `smithkit` package. It has
no source aliases, relative imports into the library, or dependency on demo code.
Use Node.js 24 and npm.

From this directory, install the published package and start the example:

```sh
npm install
npm run dev
```

The example can also be copied into a separate project and run with the same commands.

To test local library changes instead, build an archive from the repository root:

```sh
npm ci
npm pack
cd examples/basic
npm install --no-save --package-lock=false ../../smithkit-0.1.0.tgz
npm run dev
```

When running a copied example, use the archive's absolute path instead.

- **Mount chart** demonstrates creating an instance, configuring layers, adding a
  trace and marker, and subscribing to events. Repeated mounting cleans up first.
- **Replace sweep** updates samples while preserving the marker's frequency.
- **Compact chart** resizes the host; point radii remain constant in CSS pixels.
- **Unmount chart** unsubscribes and calls `destroy()` before removing references.

`npm run build` produces a standalone site in `dist/`. The repository's
`check:example` command installs the release archive in a temporary copy, compiles
this consumer against the installed types, builds it, and exercises these controls
in Chromium and WebKit.
