# Public API review for 0.3.0

This review describes the supported entry point, `smithkit`, after the 0.3.0 release.
The [integration gallery](../examples/README.md) exercises static rendering, marker
controls, appearance, exports, and lifecycle using only public imports. These
integrations require no renderer access or additional public API.

## Surface and consistency

| Responsibility    | Public API                                        | Contract                                                                |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Chart lifecycle   | `Smith`, `draw`, `destroy`                        | Mount into a measurable host; destroy releases listeners and observers. |
| Measurements      | trace/marker methods on `Smith`                   | Stable IDs, detached readouts, explicit physical units.                 |
| Appearance        | `SmithAppearance`, `setAppearance`                | Replace the preset and overrides; default light.                        |
| Grid              | `GridLayer`, `CircleLayer`, `PeripheralScales`    | Detail, labels, styles and visibility without SVG access.               |
| Radial scales     | `SmithScales`                                     | Independently mounted; caller chooses the reading source.               |
| Reports           | `toSvg`, `toPng`, typed export options            | SVG returns a string; PNG returns a promise of a Blob.                  |
| RF/math           | `RfCalculations`, `Complex`, `MarkerMeasurements` | DOM-independent calculations; documented singularities.                 |
| Import/formatting | `Touchstone`, `SmithFormatter`                    | Class-based stateless operations.                                       |

Appearance updates replace prior overrides, while layer `setStyle` and trace
`setTraceOptions` patch their respective settings. These are different, documented
operations; examples should not imply that `setAppearance` merges with old overrides.

Report legends and scale readouts are independent options. Exports capture the
current view and readings without changing the live chart. Size/background options
are shared; chart-only options add trace/marker legends and optional radial scales.
Downloads and user interface controls remain consumer responsibilities.

## Migration

0.3.0 replaces `setMinorVisible(false/true)` with `setDetail('standard'/'detailed')`.
`'basic'` adds a sparse grid. The default remains `'detailed'`. Class-based changes
from 0.1.x are documented in the [0.2.0 migration guide](migration-0.2.md).

## Decisions

- Favor clarity over compatibility with historical APIs. There are no deprecated
  aliases or index-based public trace operations.
- `addTrace`, `updateTrace`, `removeTrace`, and `clearTraces` form one lifecycle API.
  Markers are managed through chart methods and stable IDs. No mutable renderer
  instances are returned to callers.
- `TraceSample` explicitly names `frequencyHz` and `reflectionCoefficient`.
  Touchstone parsing produces `samples` and `referenceImpedanceOhms`.
- Cursor and marker readings share `SmithReading`. Physical quantities include
  units in their names: ohms, siemens, hertz, degrees, and decibels. Presentation layers may
  display millisiemens; underlying readings remain in siemens.
- Marker events always contain a complete `MarkerSnapshot`. Event types are
  discriminated string values; no casts or optional identity fields are needed.
- `onEvent` supports independent subscriptions with returned unsubscribe functions.
  Destruction suppresses callbacks and clears subscriptions.
- `chart.layers` provides visibility, grid detail, label visibility, style, and circle-value controls.
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
The isolated examples gallery also compiles and runs against the packed library;
the root demo's source alias is not used in that check.

## Before declaring 1.0

- Keep the current entry point and typed IDs/readings stable while collecting
  feedback from consumers outside the full demo.
- Document missing-ID results (`false`/`undefined`), invalid numeric inputs
  (`RangeError`), and lifecycle/parser errors (`Error`) rather than silently
  normalizing all failure modes.
- Touchstone currently reads one-port 1.x files only. Multiport selection and
  writing files need their own API design and tests.
- Keep application features such as session storage outside the chart library
  and demonstration pages. No serialization API is required by these examples.

The 0.3.0 API is sufficient for these examples; this review does not declare a
1.0 compatibility guarantee or propose another broad refactor.
