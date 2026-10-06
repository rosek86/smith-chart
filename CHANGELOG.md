# Changelog

## 0.1.0 — Unreleased

- Preserve marker frequency by default on trace replacement; expose explicit frequency, sample-index, and reflection selection strategies.
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
