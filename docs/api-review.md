# Public API review for 0.1.0

This review records the API decisions for version 0.1.0, including trace/marker
management and measurement comparison. The 0.2.0 API groups standalone
operations into classes; see [the migration guide](migration-0.2.md).

## Decisions

- Favor clarity over compatibility with historical APIs. There are no deprecated
  aliases or index-based public trace operations.
- `addTrace`, `updateTrace`, `removeTrace`, and `clearTraces` form one lifecycle API.
  Markers are managed through chart methods and stable IDs. No mutable renderer
  instances are returned to callers.
- `TraceSample` explicitly names `frequencyHz` and `reflectionCoefficient`.
  Touchstone parsing produces `samples` and `referenceImpedanceOhms`.
- Cursor and marker readings share `SmithReading`. Physical quantities include
  units in their names: ohms, siemens, hertz, degrees, and decibels. The demo alone
  converts siemens into millisiemens for display.
- Marker events always contain a complete `MarkerSnapshot`. Event types are
  discriminated string values; no casts or optional identity fields are needed.
- `onEvent` supports independent subscriptions with returned unsubscribe functions.
  Destruction suppresses callbacks and clears subscriptions.
- `chart.layers` provides visibility, minor-grid, style, and circle-value controls.
  `chart.peripheralScales` exposes visibility and indicator updates. Neither
  exposes internal SVG wrappers.
- Public RF functions operate on physical units and do not require a DOM.
  `SmithConstantCircle` remains an internal implementation of normalized math and
  geometry. Its historical abbreviated methods are not package exports.
- Input validation precedes mutation. Empty trace input is rejected for both add
  and update; deletion is explicit. Missing IDs return false/undefined as described
  in the README.

- `updateTrace` defaults to nearest-frequency marker selection. Callers can opt
  into sample-index selection (clamped on shrink) or nearest-reflection selection.
  Ties select the earliest input sample; renormalization always retains indices.

## Numerical conventions

- Open-circuit impedance, short-circuit admittance, and undefined phase/Q are
  `undefined`. Finite points near singularities are not clipped by a fixed epsilon.
- Meaningful infinite scalar limits are retained. Passive-only quantities are
  undefined for active loads. Non-finite public RF inputs throw `RangeError`.
- Reference impedance is positive and finite. Z and Y conversions round-trip in
  physical units, including non-default reference impedances.
- Comparisons use B − A. Phase is wrapped to [−180°, 180°); undefined phase or
  impedance does not suppress a valid frequency difference.
- Marker position events are queued and resolve the latest snapshot. Multiple
  updates for one marker coalesce before delivery. Metadata changes are read back
  explicitly after management methods.

## Verification

Unit tests cover conversions, units, singularities, active loads, and comparison
sign/wrapping. Browser tests cover sample validation, stable IDs, copied input,
subscriptions, lifecycle cleanup, trace controls, dragging, hiding, and comparison
updates. The package check installs a tarball in a separate consumer, checks
NodeNext/Bundler declarations, and imports calculation/parsing helpers without DOM
globals. README TypeScript examples are checked against the packaged declarations.

[Complex tests](../tests/complex.test.ts) compare supported operations against
independent Python `cmath` reference values and check principal branches,
signed zeros, poles, and non-finite inputs. Arithmetic tests also cover extreme
finite magnitudes, subnormal values, product cancellation, and selected power
identities. This is targeted regression coverage, not an exhaustive numerical
certification of every operation and input.

## Remaining scope

- Renormalization supports positive real reference impedances and preserves
  physical impedance and selected sample indices. Complex reference impedances
  and multiport support remain separate features.
- Cross-browser visual limitations are tracked in CONTRIBUTING.md.

## Release contract checks

The isolated package consumer compiles positive and negative API examples with
NodeNext and Bundler resolution. Marker update tests verify all three strategies,
atomic validation, ID/metadata retention, and independent/coalesced notifications.
Version 0.1.0 was published to npm on 2026-10-06. Its archive and verification
manifest are attached to the [GitHub Release](https://github.com/rosek86/smithkit/releases/tag/v0.1.0).
