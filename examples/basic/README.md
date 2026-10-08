# Basic consumer example

A standalone application importing only the installed `smithkit` package. It has
no source aliases, relative imports into the library, or dependency on demo code.
Use Node.js 24 and npm.

Install the declared `smithkit@^0.4.0` dependency and start the example:

```sh
npm install
npm run dev
```

To test local library changes, run `npm pack` from the repository root, then
`npm install --no-save --package-lock=false ../../smithkit-0.4.0.tgz` here.
The example can be copied into a separate project; use the archive's absolute path
when testing a copied example against the local checkout.

- **Mount chart** demonstrates creating an instance, configuring layers, adding a
  trace and marker, and subscribing to events. Repeated mounting cleans up first.
- **Replace sweep** updates samples while preserving the marker's frequency.
- **Compact chart** resizes the host; point radii remain constant in CSS pixels.
- **Unmount chart** unsubscribes and calls `destroy()` before removing references.

`npm run build` produces a standalone site in `dist/`. The repository's
`check:example` command installs the release archive in a temporary copy, compiles
this consumer as part of the full examples gallery against the installed types, builds it, and exercises these controls
in Chromium and WebKit.
