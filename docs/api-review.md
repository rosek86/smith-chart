# Public API review and compatibility policy

Reviewed against **0.4.0** and the unreleased compact trace input additions,
including the installed integration examples. Version 0.3.0 used positional constructor arguments,
interactive defaults, and an automatic marker. See [migration to 0.4](migration-0.4.md).
This review defines the compatibility scope intended for **1.x**; it does not
publish 1.0 or retroactively promise compatibility for 0.x releases.

## Decision

Keep one public entry point, `smithkit`, and a small class-based API. The examples
can be implemented without renderer access. The remaining configuration mismatch
was corrected by grouping constructor options by responsibility. Do not introduce
a general scene API, backend abstraction, session serialization, or a second
configuration schema for this release.

The reviewed shape is the candidate API for 1.0. During 0.x, breaking changes still
require a minor release, migration instructions, and updates to the examples.
Use real consumer feedback to identify necessary changes before declaring 1.0,
rather than treating additional features as prerequisites.

## Configuration by responsibility

```ts
const chart = new Smith({
  referenceImpedanceOhms: 50,
  appearance: { theme: 'dark' },
  interaction: { zoom: true, cursor: true },
  grid: {
    detail: 'standard',
    labelsVisible: true,
    style: { majorWidth: 1.5 },
    layers: {
      resistance: { style: { stroke: '#60a5fa' } },
      conductance: { visible: true, detail: 'basic' },
    },
  },
  circles: { vswr: { visible: true, values: [2, 3] } },
  peripheralScales: { visible: true },
});
```

| Responsibility             | Constructor                                                        | Later changes                                                                                                     |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Physical reference         | `referenceImpedanceOhms`                                           | `renormalize()` preserves physical impedance                                                                      |
| Visual defaults            | `appearance`                                                       | `setAppearance()` replaces preset/overrides                                                                       |
| Interaction                | `interaction.zoom`, `interaction.cursor`                           | `setZoomEnabled()`, `setCursorEnabled()`                                                                          |
| Impedance/admittance grid  | `grid.detail`, `grid.labelsVisible`, `grid.style`, `grid.layers`   | `setGridDetail()` or individual `layers` controls                                                                 |
| Auxiliary constant circles | `circles.q`, `circles.vswr`                                        | `layers.q`, `layers.vswr`                                                                                         |
| Peripheral rulers          | `peripheralScales.visible`, `captionsVisible`, `tickLabelsVisible` | `peripheralScales.setVisible()`, `setCaptionsVisible()`, `setTickLabelsVisible()`; `update()` supplies indicators |

The reference impedance remains a single top-level physical quantity rather than
an otherwise empty RF group. `grid.layers` contains only resistance, reactance,
conductance, and susceptance. Q/VSWR belong to `circles`, since they have values and
visibility but no grid detail or label-density setting. Peripheral rulers are
shown/hidden as one group. The runtime `layers` collection remains a flat set of
controls: callers need not traverse configuration objects to change one layer.

`appearance` describes how features look; `interaction` determines whether zoom
and cursor tracking run. A marker's appearance does not create that marker.
Traces and markers are added separately with `addTrace()` and `addMarker()`.
Report options belong to each export call, not the chart constructor.

`setOptions(SmithOptions)` applies the same grouped schema as a patch. Omitted and
`undefined` fields retain their current values, including nested fields. Empty
groups are no-ops. Within each call, shared grid settings precede per-layer overrides;
a later shared setting replaces that field on all four grids. Styles patch fields,
circle lists replace, and `appearance` replaces its preset/overrides as a unit,
matching `setAppearance()`. Reference changes renormalize measurements.

Validation of the complete patch and reference conversion precedes presentation
changes. Invalid input or an impossible conversion leaves the live chart unchanged.
Updates retain traces, markers, identity, selection, and the current view. Consumer
callbacks must not throw; this guarantee is about validation, not rollback of
arbitrary side effects from application callbacks.

### Defaults and precedence

- `new Smith()` is a static presentation: 50 Ω, light theme, standard impedance
  grid with labels, no admittance/Q/VSWR layers or peripheral rulers, no zoom or
  cursor tracking. Traces do not create markers.
- Omitted/`undefined` fields use defaults; `{}` groups do not reset other groups.
  `false` and empty circle arrays are meaningful overrides. `null` is not an
  omission in constructor options.
- Resolve appearance, apply shared `grid` settings, then apply `grid.layers`
  overrides by field. Explicit styles take precedence over the theme and remain
  after later theme changes. Options and circle arrays are not retained by reference.
- `setAppearance()` replaces its preset and overrides. Layer `setStyle()` and
  `setTraceOptions()` patch fields. `setValues()` replaces the whole circle list,
  copies it, removes duplicates, and validates before mutation.
- `setGridDetail()` affects all four grids, including hidden ones, without changing
  visibility, explicit styles, label visibility, or the current view.
- Cursor tracking, zoom, and explicitly added markers are independent. Disabling
  zoom preserves the view; `resetView()` still works. Disabling cursor tracking
  hides geometry, cancels queued readings, and clears the readout. Enabling waits
  for a new pointer movement. `cursorReading` retains the last position.

`SmithScales` is a separate component whose constructor takes only
`SmithAppearance`. It does not inherit chart options or listen to chart events
implicitly. Consumers select the source reading with `update(Complex | null)`.
Keeping this constructor focused avoids grid/interaction options that do not apply.

## Data, identity, and lifecycle

`TraceSample` uses `frequencyHz` and a dimensionless voltage
`reflectionCoefficient: [real, imaginary]`. Input samples are copied; all
coordinates and frequencies must be finite, and frequencies non-negative.
An empty trace is invalid. Names and colors are trace metadata, not sample data.

`addTrace` and `updateTrace` also accept `readonly TraceTuple[]` with
`[frequencyHz, re, im]` entries, or packed `Float64Array` triples in the same order.
`TraceInput` names the union of these formats and `TraceSamples`. Arrays must be
homogeneous; packed input length must be a positive multiple of three. Array views
copy only their own elements. All inputs are defensively copied and validated before
mutation; callers may reuse their buffers after the synchronous call returns.
There is no borrowed/zero-copy buffer mode. Output readings/events and RF/parser
object-sample APIs are unchanged. Input order and first-sample tie breaking are
preserved regardless of format or frequency sorting.

Trace/marker IDs are opaque, chart-local strings, stable across sample replacement
and renormalization, and never reused within a chart. Do not depend on their text
prefixes. Marker display numbers start at 1 per trace and are not reused after
removal. Markers select actual samples; no interpolation is implied.

`updateTrace()` defaults to nearest-frequency selection, with input-order tie
breaking. `sample-index` clamps when the trace shrinks; `reflection` selects the
nearest complex point. Renormalization retains sample indices and physical Z.
`getTraces()` and `getMarker()` return detached snapshots, not renderer objects.

Mount after the host exists and has measurable dimensions. `draw()` can move an
existing component. `destroy()` is idempotent and releases listeners/observers;
retained layer controls, mutations, subscriptions, and exports then throw.
Trace/marker lookups return empty/missing results after destruction. Reference
impedance and last cursor position remain readable. There is no implicit DOM
requirement for importing the package or using RF/math/parsing classes.

## Events

`onEvent()` returns an unsubscribe function. Registering the same callback twice
creates independent subscriptions. Each payload is discriminated by
`SmithEventType`; marker payloads include trace/marker identity, sample index,
frequency, and the complete RF reading.

| Event                              | Delivery and meaning                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Cursor` with a reading            | Queued pointer-position update when tracking is enabled                                                               |
| `Cursor` with `undefined`          | Synchronous clearing on pointer leave, cursor disable, marker drag start, or renormalization when tracking is enabled |
| `Marker`                           | Queued position reading; also emitted after explicit marker creation                                                  |
| `MarkerSelect`                     | Synchronous focus or pointer/keyboard engagement; does not itself mean a position change                              |
| `MarkerDragStart`, `MarkerDragEnd` | Synchronous mouse/touch gesture lifecycle                                                                             |

Repeated queued updates to the same marker coalesce and deliver the latest
snapshot; different markers have independent notifications. Cursor moves coalesce
separately. Exact timer delays and notification counts during continuous movement
are not part of the contract. Removed markers cannot deliver stale queued readings.
Disabled cursors do not emit readings, including during marker interactions.

Trace metadata changes do not emit a synthetic marker event: refresh metadata
after such mutations. Removing a dragged trace/marker ends its gesture.
Destroying a chart suppresses further application callbacks. Callbacks should not
throw or mutate event payloads: consumer exceptions are not isolated, and payloads
are detached from chart state but not frozen or copied for every listener.

## Results and errors

Missing identity is an expected lookup result, not an exception. For ID-based
operations, lifecycle validation comes first; on a live chart, a missing ID is
resolved before validating the remaining arguments.

| Operation / invalid input                                                                                                             | Result                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Missing trace in `addMarker()`; missing marker in `getMarker()`; missing comparison endpoint                                          | `undefined`                                                 |
| Missing trace/marker in update, remove, focus, or selection methods                                                                   | `false`                                                     |
| Hidden/unmounted marker in `focusMarker()`                                                                                            | `false`                                                     |
| Invalid constructor or patch object/group or unknown structural key; non-boolean interaction/visibility                               | `TypeError`                                                 |
| Invalid theme, appearance shape/color/font, trace mode/name/color, marker-selection strategy                                          | `TypeError`                                                 |
| Invalid reference impedance, sample/frequency/index, positive numeric style/appearance dimension, Q/VSWR value                        | `RangeError`                                                |
| Invalid grid detail, marker-legend ID/field, export dimension/background/size limit                                                   | `RangeError`                                                |
| `scaleReadout` without included `scales` in chart export                                                                              | `TypeError`                                                 |
| Destroyed instance, missing mount host, unmounted/zero-size export, invalid Touchstone content, unavailable browser export facilities | `Error` (browser operations can also raise platform errors) |

The classes above are operation-specific contracts, not a universal JSON-schema
validator. Consumers should branch on error classes rather than message text.
Messages, stack traces, and parser wording may improve between releases.
Grid/circle text styles must be strings; their CSS interpretation is browser-owned
(including CSS variables), unlike validated solid theme/trace colors.
TypeScript declares the supported inputs; arbitrary malformed objects outside that
surface are not promised identical diagnostics across releases.

Validated trace updates, numeric style updates, circle replacements, and appearance
updates reject before changing their live values. A failed constructor returns no
instance and disconnects any allocated renderer resources. Visibility setters now
validate booleans just like constructor options, instead of coercing strings.

## Export contract

`Smith.toSvg()` and `SmithScales.toSvg()` return standalone SVG strings
synchronously. Their `toPng()` counterparts return `Promise<Blob>` with PNG data;
validation/lifecycle failures become promise rejections. Both formats capture the
mounted view without changing live geometry, readings, theme, or selection.

Shared `width`, `height`, and `background` options describe the output image.
One dimension preserves aspect ratio; both fit and center without cropping or
stretching. Dimensions must be integers from 1 to 8192; final output is also
limited to 32 megapixels. SVG dimensions affect layout/intrinsic size, not vector
resolution. Omitted backgrounds preserve the configured backgrounds.

For chart exports, `legend` includes visible traces. `markerLegend` independently
selects marker fields/IDs from visible traces. Empty selections mean empty;
unknown IDs/fields throw. `scales` adds independently mounted radial scales centered
below the chart; `scaleReadout` requires `scales` and overrides only the exported
reading. On `SmithScales`, the same reading override is named `readout`.
`null` reflection coefficient exports empty scale readings. No cursor/marker is
chosen automatically by the library. Downloads and filenames belong to consumers.

The public contract is the image format, options, readings, and composition rules.
SVG string equality, element order/classes/IDs, exact label positions, raster
antialiasing, and identical fonts across browsers are not guaranteed.

## Evidence from integrations

| Integration                                    | API boundary exercised                                      | Automated evidence                                                              |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Static chart](../examples/static/main.ts)     | Defaults, explicit data, no implicit markers or interaction | `chart-options.spec.ts`, `examples.spec.ts`                                     |
| [Marker controls](../examples/markers/main.ts) | Explicit IDs, events, keyboard focus, sample selection      | `marker-accessibility.spec.ts`, `marker-update.spec.ts`, `measurements.spec.ts` |
| [Appearance](../examples/appearance/main.ts)   | Theme replacement, layer precedence, cursor opt-in          | `appearance.spec.ts`, `chart-options.spec.ts`                                   |
| [Reports](../examples/export/main.ts)          | SVG/PNG snapshots, marker legends, download owned by caller | `svg-export.spec.ts`, `png-export.spec.ts`, `marker-legend.spec.ts`             |
| [Lifecycle](../examples/basic/main.ts)         | Mount, update, subscriptions, resize, destroy               | `lifecycle.spec.ts`, isolated consumer check                                    |

The [browser suites](../tests/browser/) also verify invalid input, no mutation on
rejection, event cancellation, hidden layers, and export behavior in Chromium and
WebKit. [Package verification](../scripts/check-package.mjs) installs an archive,
checks ESM imports without a DOM, compiles positive/negative NodeNext and Bundler
types, and type-checks README examples. [Example verification](../scripts/check-example.mjs)
builds and runs an independently installed gallery without source aliases.

RF and complex-number tests cover physical units, singularities, active loads,
reference conversion, wrapped phase differences, extreme magnitudes, and Python
`cmath` reference cases. This is targeted regression evidence, not a proof of all
numerical inputs or browser rendering behavior.

## Compatibility scope for 1.x

Once 1.0 is released, the following become the stable consumer contract:

- Documented exports from the package root, callable signatures, configuration
  groups, option names/types/defaults, patch semantics, and documented return/error behavior.
- Trace/marker identity and lifetime rules, physical units, data ownership,
  replacement/renormalization semantics, and numerical singularity conventions.
- Event discriminants/payload fields, synchronous versus queued delivery,
  per-marker coalescing, cancellation, and unsubscribe/destruction behavior.
- Supported grid detail levels, appearance overrides, visibility semantics,
  export formats/options, and component independence.

A **major** release is required for removals/renames, stronger required inputs,
changed defaults or units, changed missing-ID/error behavior for supported inputs,
new required members of exported data/control interfaces, or incompatible event/return semantics. Adding a variant to a documented closed
union or event enum also requires a major release because consumers may switch
exhaustively. A **minor** release may add class methods, optional configuration, or
optional result fields while preserving existing behavior. A **patch** release
may fix bugs against this contract, improve diagnostics, and adjust visual layout
or numerical accuracy within the documented conventions.

The compatibility promise does **not** cover deep imports, private/protected
members, subclass overrides of chart/component implementation methods, renderer/SVG internals, D3 objects, generated DOM selectors/CSS variables,
exact SVG bytes/pixels, demo controls/URLs, dependency versions, event timer
intervals, or error-message text. The root package exports are the supported
boundary; use appearance/layer APIs instead of editing generated DOM.

The supported browser/runtime and TypeScript floors should be recorded with 1.0.
Raising those floors in 1.x is a major change. The checked baseline today is a
browser with SVG and ES2022, an ESM build, NodeNext/Bundler declarations, and the
Chromium/WebKit engines used in CI; the tests do not establish support for every
older browser or TypeScript version.

## Gates before declaring 1.0

1. Exercise the grouped 0.4 API in real consumer projects; resolve reported contract ambiguities before freezing it.
2. Keep package, isolated examples, and both browser suites required for releases.
   Confirm published-archive behavior, not just the demo's source alias.
3. Record minimum runtime/compiler support and the agreed compatibility policy in
   the 1.0 release notes. No further architectural rewrite is required by this review.

Complex reference impedances, multiport Touchstone, additional renderers, and
application session storage are outside the present scope. Their absence does not
block 1.0; future additions must respect the public boundary above.
