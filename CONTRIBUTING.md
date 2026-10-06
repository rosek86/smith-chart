# Contributing

This repository develops the `smithkit` library and a separate demonstration app.
User-facing API documentation belongs in [README.md](README.md). Agent-specific
working rules live in [AGENTS.md](AGENTS.md).

## Local development

Use Node.js 24 LTS, as specified in `.nvmrc`, and the committed npm lockfile:

```sh
nvm use
npm ci
npm run dev
```

The development server opens the demo. Node.js 24 is a development toolchain
requirement, not a browser requirement for applications using the library.

| Command                 | Purpose                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run lint`          | Check JavaScript and TypeScript with ESLint; warnings fail the check.                      |
| `npm run lint:fix`      | Apply automatic ESLint fixes.                                                              |
| `npm run format`        | Format source, configuration, demo assets, and documentation with Prettier.                |
| `npm run format:check`  | Check formatting without changing files.                                                   |
| `npm run typecheck`     | Check library, demo, tests, and configuration types.                                       |
| `npm run build`         | Build ESM modules and TypeScript declarations in `dist/lib/`.                              |
| `npm run build:demo`    | Build the demo site in `dist/demo/`.                                                       |
| `npm run preview`       | Preview the built demo.                                                                    |
| `npm test`              | Run calculation, parser, scale, and deployment tests.                                      |
| `npm run check`         | Check formatting, lint, check types, run unit tests, and build both library and demo.      |
| `npm run test:e2e`      | Run browser tests against the built demo under `/smith-app/`.                              |
| `npm run check:package` | Pack and install the library in an isolated consumer; verify ESM imports and declarations. |
| `npm pack`              | Rebuild the library and create an installable `.tgz` archive.                              |

For browser tests, run `npm run build:demo` and `npx playwright install chromium`
first. To use an installed Chrome instead, run
`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Run WebKit coverage with
`npm run test:e2e:webkit` after `npx playwright install webkit`. CI runs both
Chromium and WebKit. Native pointer assertions allow device-pixel rounding;
SVG text bounds use DOM geometry so text anchors are included.

## Architecture

```text
src/
  index.ts                 public package exports
  Smith.ts                 chart composition, events, and public API
  rf.ts                    public DOM-independent readings and physical conversions
  measurements.ts          trace/marker types and comparisons
  samples.ts               trace input contract
  layers.ts                public layer controls
  SmithConstantCircle.ts   internal normalized RF calculations and circle geometry
  SmithArcsDefs.ts          compatibility facade for grid definitions
  grid/                    normalized geometry, compact grid bands, and label rules
  complex/                 complex numbers, independent of the DOM
  shapes/                  geometry types
  arcs/                    tick definitions
  draw/                    SVG elements and D3 layers
  scales/                  independent parameter-scale renderer and definitions
  io/                      Touchstone parser, independent of the UI
demo/                      application UI, CSS, and file handling
tests/                     unit, deployment, and browser tests
scripts/                   library build and demo deployment tools
```

`src/index.ts` exposes the library API without starting the demo. `index.html`
and `demo/main.ts` are the demo entry points. Keep file selection and other
application controls in the demo; parsers and calculations belong in the library.

`Smith` owns the square chart SVG and its zoom transform. `SmithScales` mounts
its own responsive container; the demo connects it to cursor events. Keep scale
rendering outside the chart transform and RF scale mappings in `radialScales.ts`.
The demo throttles moving cursor/marker readouts to one update per 33 ms, using
the latest position even during continuous movement. Clearing readouts and
switching tabs cancel pending updates and render immediately. `SmithScales.update`
remains synchronous for library consumers.

The library build uses TypeScript to emit ESM JavaScript and declarations with
matching paths. Relative source imports use `.js` extensions so consumers can
resolve emitted files with both NodeNext and bundler module resolution. D3 remains
a package dependency. `@types/d3` is also a dependency because public declarations
reference D3 types. Demo CSS is not part of the library, which renders SVG directly.

## Conventions

Use English for documentation, code comments, UI labels, descriptions, and error
messages. Use descriptive private fields without a leading underscore. Before the first release, prioritize clear public names and consistent units over
compatibility with historical APIs. Update the demo, tests, and public examples
together when changing API behavior.

Always use braces for control-flow bodies, including single-line guards and loops.
The ESLint `curly` rule enforces this; Prettier formats the resulting blocks.

ESLint uses a flat configuration in `eslint.config.mjs` with recommended JavaScript
and TypeScript rules, browser/Node globals for the relevant files, and a rule
forbidding leading underscores on private fields. Prettier owns formatting;
`eslint-config-prettier` disables conflicting lint rules. Formatting uses two-space
indentation, single quotes, semicolons, trailing commas, and a 100-column print width.
Generated output and dependency directories are ignored. The npm lockfile is also
excluded from Prettier because npm maintains its formatting.

Run `npm run lint:fix` and `npm run format` before `npm run check`. CI runs the same
checks and rejects lint warnings or formatting differences. No Git hooks are required.

### TypeScript tooling compatibility

The `@typescript/native` npm alias provides TypeScript 7 and the `tsc` command used
for builds and type checking. The `typescript` alias points to
`@typescript/typescript6`, which supplies the compiler API required by
`typescript-eslint`. This follows Microsoft's
[side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
Keep both aliases until ESLint's TypeScript tooling supports the new compiler API;
do not replace the compatibility package with TypeScript 7 directly.

For documentation-only changes, review links and examples and run
`git diff --check`. For code changes, run `npm run check` and relevant browser
tests. For package changes, pack the library and install the archive in a separate
consumer project to verify runtime imports and TypeScript declarations.

## Pull request workflow

Create a feature branch from `main`, commit and push to that branch, and open a
pull request targeting `main`. Do not push changes directly to `main` or merge a
pull request without an explicit request. Include the behavior change and relevant
validation in the PR description. CI runs checks for PRs; demo deployment follows
only after changes reach the default branch.

## Complex-number validation

`tests/complex.test.ts` covers arithmetic at extreme finite magnitudes, logarithms, roots, hyperbolic and reciprocal
operations, their principal branches, signed zeros, poles, and large/small finite
arguments. Independent expected values are stored in
`tests/fixtures/complex-reference.json` and generated with Python's standard
[`cmath`](https://docs.python.org/3/library/cmath.html) module. Python is not needed
for the normal test suite. To regenerate the fixtures:

```sh
python3 scripts/generate-complex-reference.py
npx prettier tests/fixtures/complex-reference.json --write
npm test -- tests/complex.test.ts
```

The generator explicitly preserves signed zeros when forming `1/z` for inverse
reciprocal functions, because Python's complex division can discard them. Reference
comparisons use relative error for nonzero components, so tiny values are tested
rather than hidden by a blanket absolute tolerance. Other transcendental operations still need broader numerical coverage.

## Packaging and releases

See [the 0.1.0 API review](docs/api-review.md) for API decisions, units,
identity and lifecycle contracts, and remaining release considerations.

`npm pack` runs the library build through `prepack`. Only `dist/lib/`, the README,
the license, and package metadata are included. Demo assets and internal instructions
are excluded. Building the library does not clear the demo output, and vice versa.

Before publishing a release, verify the package name, ownership, version, API
compatibility, and package contents. A local build or pack does not publish anything
to npm. Run `npm run check:package` to automate isolated consumer verification. CI runs
this check too. The release workflow publishes verified archives using npm trusted
publishing; account setup and the first publication are described in
[docs/releases.md](docs/releases.md).

## Known technical debt

- Dense grid labels can overlap at small sizes. Grid bands and label rules live in
  `src/grid/`; SVG rendering is shared by `SmithGridLayer`. Changes need visual checks,
  especially near chart edges and on narrow screens.
- Reference impedances are positive real ohm values. Complex reference impedances,
  multiport data, and Touchstone 2.x are not supported. The demo can renormalize
  imported data and existing traces using the public library helpers.
- The separate legacy `smith-app-ng` application needs its own Angular, D3, and
  TypeScript migration before consuming this library version.

## Demo hosting

The demo is deployed separately to `rosek86/smith-app` using GitHub Pages.
See [docs/deployment.md](docs/deployment.md) for credentials, workflow setup,
disabling deployments, and restoring the old site.
