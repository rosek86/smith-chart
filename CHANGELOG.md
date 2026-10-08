# Changelog

## 0.4.0 — 2026-10-08

- Add `Smith.setOptions(SmithOptions)` for validated configuration patches, preserving omitted settings and renormalizing existing data when reference impedance changes. Share validation with the constructor and layer controls.

- Group constructor configuration into `appearance`, `interaction`, `grid` (including `grid.layers`), `circles`, and `peripheralScales`; reject unknown structural keys without retaining interim flat aliases. Keep the physical reference impedance at the top level.
- Align layer/peripheral visibility and grid-label setter validation with constructor booleans; reject invalid values before changing presentation.
- Reject chart export `scaleReadout` without included radial `scales` with `TypeError` for both SVG and PNG.
- Complete the pre-1.0 API review with verified configuration precedence, event delivery, errors, export semantics, integration evidence, and a defined compatibility policy for 1.x.

- **Breaking:** default to static presentation: standard impedance grid with labels, no peripheral scales, zoom disabled, and cursor tracking disabled. The demo enables its interactive features explicitly.
- Add `interaction.cursor` constructor configuration and `setCursorEnabled()` with pending-reading cancellation and independent marker controls.

- **Breaking:** replace the positional `Smith(referenceImpedanceOhms, appearance)` constructor with optional `SmithOptions`, covering reference impedance, appearance, zoom, peripheral scales, shared grid settings, per-layer overrides, and Q/VSWR values. See [the migration guide](docs/migration-0.4.md).
- **Breaking:** traces no longer create a marker automatically. Use `addMarker(traceId, sampleIndex?)` explicitly; update demo and interactive examples accordingly.
- Add `Smith.setGridDetail()` to update all four grid layers together and `CircleLayer.setValues()` to replace Q/VSWR values with validation and copied input.

- Add a navigable integration gallery linked from the demo, with runnable static chart, marker, theme, export, and lifecycle examples using the public API; verify the grouped configuration and runtime updates through public APIs.

## 0.3.0 — 2026-10-08

- Add optional SVG/PNG marker legends with trace colors/names, marker numbers, selectable readings and markers, wrapped descriptions, and independent controls in the demo export dialog.

- Select a specific marker or no readings for demo scale exports, with trace, marker, and frequency printed in the image; add independent scale readout overrides for SVG/PNG exports.

- Add PNG export for charts and radial scales with configurable dimensions/backgrounds, an optional visible-trace legend, and combined report images with scales centered below the chart; default to 3200 px width in the demo and share PNG/SVG options in one Export dialog.
- Start the demo in dark mode; allow SVG reports to use the same size, background, legend, and combined layout options as PNG.

- Group demo appearance, layers, grid detail, labels, and reference impedance in an accessible Chart settings dialog.

- Add `GridLayer.setLabelsVisible(boolean)` and a shared demo checkbox to toggle grid labels independently of grid lines, preserving the setting across updates and SVG export.

- Add basic, standard, and detailed impedance/admittance grids, with principal circles and matching labels in basic mode and a shared demo selector.
- **Breaking:** replace `GridLayer.setMinorVisible(boolean)` with `setDetail('basic' | 'standard' | 'detailed')`. Migrate `false` to `'standard'` and `true` to `'detailed'`; the default remains detailed.

- Add shared light/dark appearance presets and typed overrides for charts, scales, cursors, markers, and automatic trace palettes, with live updates and a demo theme selector.
- Preserve configured backgrounds and resolved theme styling in standalone SVG exports.

- Extract the internal `SvgChartRenderer` from `Smith`, separating SVG composition, view updates, and rendering lifecycle from the public chart API without changing chart behavior.

## 0.2.0 — 2026-10-07

- Add keyboard marker selection/navigation, accessible sample and frequency readings, visible focus, constant-size touch targets, `focusMarker`, and `MarkerSelect` events.
- Keep markers and focus indicators above chart labels; add a focus action to the demo marker selector.

- Group peripheral rulers into outlined phase and electrical-length bands, preserving all scale captions and values.
- Preserve zero and the highest labeled axis value when thinning impedance/admittance labels, including combined grids.
- Adapt grid labels to the available space, preserving a minimum readable font size, prioritizing key values, and hiding collisions on small charts while keeping labels stable during zoom.

- Add `Smith.toSvg()` and `SmithScales.toSvg()` to export standalone SVG snapshots with resolved styles, current view/layout, and separate download buttons in the demo.

- Preserve the stacking order of overlapping traces when replacing their samples.
- Reorganize library internals by responsibility, separate trace selection state from SVG rendering, and share complex division between arithmetic and RF conversions.
- **Breaking:** replace standalone calculation, parsing, formatting, and comparison exports with static methods on `RfCalculations`, `Touchstone`, `SmithFormatter`, and `MarkerMeasurements`. See [the migration guide](docs/migration-0.2.md).
- Use classes for internal grid/scale definitions and layer adapters; enforce the library convention with ESLint.

## 0.1.1 — 2026-10-06

- Render grid and scale labels above all chart lines, preserving label visibility and styling during zoom and layer changes.

- Refresh the npm README with installation instructions for the published package.

## 0.1.0 — 2026-10-06

- Publish the demo directly at https://rosek86.github.io/smithkit/.
- Add an independently installed consumer example covering mounting, data updates, event subscriptions, resizing, and cleanup.
- Prepare a tested npm archive and manifest through one release command, with Chromium/WebKit verification and repeat-publication integrity checks.
- Add demo checkboxes for grouped peripheral scales and detailed impedance/admittance grids.
- Allow disabling zoom and pan gestures while preserving the current view, marker controls, and programmatic reset.

- Preserve marker frequency by default on trace replacement; expose explicit frequency, sample-index, and reflection selection strategies.
- Stabilize complex multiplication/division, logarithms, roots, reciprocals, and common power cases at extreme finite magnitudes.
- Export standalone formatters and typed equivalent series-component calculations; remove duplicate complex component accessors.
- Accept readonly trace samples and numeric style lengths; keep point radii fixed in CSS pixels across container resize.
- Coalesce pending position notifications per marker while retaining synchronous drag lifecycle events.
- Add nearest-frequency marker selection, configurable points/line/both trace rendering, and dense-point rendering optimization.
- Add positive-real reference impedance renormalization for traces and imported measurements, preserving physical impedance and marker sample indices.

- Replace the historical index-based API with stable trace/marker IDs, typed event subscriptions, and renderer-independent layer controls.
- Use explicit units in `TraceSample`, `SmithReading`, marker snapshots, and Touchstone results; export physical RF conversion functions.
- Remove legacy API aliases and internal drawing/math exports. Update the demo and validate README examples against the packaged API.

- Add stable trace/marker management, named and colored traces, visibility controls, and marker comparisons in the demo.
- Export a DOM-independent comparison helper with wrapped phase differences and explicit result units.
- Preserve finite impedance/admittance readings near open/short limits and return undefined Q at a short circuit.
- Add attenuation and current-transmission rulers, bringing the independent scale panel to twelve axes.
- Add chart-mounted phase and electrical-length rulers with cursor/marker indicators and zoom-aware framing.
- Improve grid visibility with stronger default strokes and keep VSWR stroke widths fixed during zoom.

- Introduce Smithkit as an ESM library with TypeScript declarations and a separate demo.
- Add Touchstone 1.x single-port import and labeled radial scales.
- Separate parameter scales into `SmithScales`, with cursor dots and independent mounting; chart zoom and pan affect only the square chart SVG.
- Emit an empty cursor event on pointer leave and cancel pending cursor notifications.
- Suspend chart cursor tracking during marker drags and expose `MarkerDragStart`/`MarkerDragEnd` events.
- Combine demo cursor and marker readouts in a shared scales panel with manual tabs and temporary marker selection during dragging.
- Add chart destruction, element-based mounting, and dataset update/removal/clearing.
- Validate and copy dataset input; preserve markers and color when replacing samples.
- Separate grid definitions and normalized geometry from shared SVG rendering.
- Add formatting, linting, calculation and browser tests, and package consumer checks.
- Prepare GitHub Pages demo deployment and npm release automation.
- Correct frequency/wavelength conversion.
- Implement all fourteen previously missing complex hyperbolic, reciprocal, and inverse functions, with documented principal branches and numerical tests.
- Adopt feature branches and pull requests targeting `main`.
