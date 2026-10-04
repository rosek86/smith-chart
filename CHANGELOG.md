# Changelog

## 0.1.0 — Unreleased

- Improve grid visibility with stronger default strokes and keep VSWR stroke widths fixed during zoom.

- Introduce Smithkit as an ESM library with TypeScript declarations and a separate D3 demo.
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
