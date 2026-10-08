# Smithkit

**`smithkit`** is a framework-independent JavaScript and TypeScript library for
interactive SVG Smith charts, RF calculations, and S11 measurement exploration.

[Try the interactive demo](https://rosek86.github.io/smithkit/) or browse the
[integration examples](https://rosek86.github.io/smithkit/examples/index.html):
static charts, marker controls, themes, report exports, and lifecycle cleanup.
Each example includes its TypeScript source.

The constructor configuration and explicit marker creation below target the next minor
release (0.4.0, not yet published). For npm 0.3.0, see the
[released README](https://github.com/rosek86/smithkit/blob/v0.3.0/README.md).
See the [0.4 migration guide](https://github.com/rosek86/smithkit/blob/main/docs/migration-0.4.md)
when upgrading.

Upgrading from 0.2.x? Version 0.3.0 replaces `GridLayer.setMinorVisible()` with
`setDetail('basic' | 'standard' | 'detailed')`. Replace `false` with `'standard'`
and `true` with `'detailed'`; `'basic'` shows only the principal circles.

Upgrading from 0.1.x? Version 0.2.0 groups calculation, parsing, formatting, and
comparison functions into classes. See the [migration guide](https://github.com/rosek86/smithkit/blob/v0.2.0/docs/migration-0.2.md)
for the changed imports.

The [API review and compatibility policy](https://github.com/rosek86/smithkit/blob/main/docs/api-review.md)
define the public contract and the compatibility scope intended for 1.0. During
0.x development, breaking changes are documented in minor releases.

## Features

- Labeled resistance, reactance, conductance, and susceptance grids.
- Configurable constant-Q and constant-VSWR circles.
- Zoom, pan, view reset, and cursor readings.
- Named traces with colors, visibility, and keyboard/touch/mouse markers that snap to samples.
- Marker comparisons: frequency, complex impedance, and wrapped phase differences.
- Physical impedance/admittance conversions and DOM-independent RF readings.
- Twelve parameter scales mounted independently of chart zoom.
- Four peripheral rulers for phase and electrical length.
- One-port Touchstone 1.x import with RI, MA, and DB representations.
- Standalone SVG and configurable PNG export of the chart and radial scales.
- ESM modules and TypeScript declarations.

## Installation

Install from npm:

```sh
npm install smithkit
```

Browser applications need SVG, ES2022, and an ESM-compatible build tool.
No library stylesheet is required. To build the library from source, see
[Contributing](https://github.com/rosek86/smithkit/blob/main/CONTRIBUTING.md).

For a complete application using the installed package, see the
[standalone integration example](https://github.com/rosek86/smithkit/tree/main/examples/basic).
It demonstrates mounting, replacing samples, event subscriptions, resizing, and cleanup.

## Quick start

Give the container an explicit size and run the code after it is mounted:

```html
<div id="smith" style="width: 100%; max-width: 700px; aspect-ratio: 1;"></div>
```

```ts
import { Smith } from 'smithkit';

const chart = new Smith({ referenceImpedanceOhms: 50 }); // Reference impedance in ohms; defaults to 50.
chart.draw('#smith');
const traceId = chart.addTrace(
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.5, -0.5] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.5, 0.5] },
  ],
  { name: 'Antenna', color: '#2563eb' },
);
```

Each `TraceSample` contains `frequencyHz` and the dimensionless voltage reflection
coefficient Γ as `[real, imaginary]`. Samples are copied and validated; readonly tuples and arrays (`as const`) are accepted. Frequencies
must be finite and non-negative; both coordinates must be finite. A trace must
contain at least one sample.

Traces start without markers. Call `chart.addMarker(traceId)` to add one at the
first sample, or pass a sample index to choose its initial position. Drag markers to select
samples with a mouse or touch. Enable zoom to scroll to zoom and drag the chart to pan. Markers
and their focus indicators stay above grid labels and sample points. `chart.resetView()` restores the initial view, including peripheral rulers.

Construct `Smith` only in a browser, such as your framework's mount hook. Importing
the package and using its calculation or parsing methods does not require a DOM.

The default chart is a static presentation: standard impedance grid with labels,
no peripheral scales, and zoom and cursor tracking disabled. Markers are optional
and remain interactive when explicitly added.

Enable interactions through constructor options or the corresponding setters:

```ts
import { Smith } from 'smithkit';

const chart = new Smith({ interaction: { zoom: true, cursor: true } });
chart.draw('#smith');

chart.setZoomEnabled(false); // Freeze the current view; page scrolling is unaffected.
chart.setCursorEnabled(false); // Hide cursor geometry and cancel pending readings.
```

Zoom controls wheel/double-click zoom and mouse/touch panning and pinch gestures;
it is independent of cursor tracking and marker interaction. `resetView()` remains
available with zoom disabled. Disabling during an active gesture freezes the view
while that gesture finishes normally.

Cursor tracking controls the cursor overlay and `Cursor` events. Disabling it
clears the current readout with one `Cursor` event carrying `undefined`, cancels
queued readings, and suppresses further cursor events. Enabling waits for a new
pointer movement. The last `cursorReading` remains available; marker controls and
events work independently.

`draw(selector | HTMLElement)` moves the existing SVG when called again. A missing
container throws. Call `chart.destroy()` on unmount; it removes the SVG, releases
event handlers, and cancels queued notifications. Repeated destruction is safe.

## Constructor configuration

`new Smith(options?)` accepts a typed `SmithOptions` object. Every field is optional:

```ts
import { Smith } from 'smithkit';

const chart = new Smith({
  referenceImpedanceOhms: 75,
  appearance: { theme: 'dark' },
  interaction: { zoom: false },
  peripheralScales: { visible: false },
  grid: {
    detail: 'basic',
    labelsVisible: true,
    style: { majorWidth: 1.5 },
    layers: {
      resistance: { style: { stroke: '#60a5fa' } },
      reactance: { labelsVisible: false },
      conductance: { visible: true, detail: 'standard' },
    },
  },
  circles: {
    q: { visible: true, values: [1, 2, 5] },
    vswr: { visible: true, values: [2, 3], style: { stroke: '#fbbf24' } },
  },
});
chart.draw('#smith');

// Update all four grids together, including hidden admittance layers.
chart.setGridDetail('standard');
// Individual overrides remain available.
chart.layers.reactance.setDetail('basic');
```

Configuration is grouped by responsibility:

| Group                    | Purpose                                                                                            | Runtime API                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `referenceImpedanceOhms` | Physical reference impedance                                                                       | `renormalize()`                                                    |
| `appearance`             | Theme, fonts, colors, marker/cursor styling                                                        | `setAppearance()`                                                  |
| `interaction`            | `zoom` and `cursor` tracking switches                                                              | `setZoomEnabled()`, `setCursorEnabled()`                           |
| `grid`                   | Shared detail, labels, styles; `layers` overrides for resistance/reactance/conductance/susceptance | `setGridDetail()`, `layers.resistance` and the other grid controls |
| `circles`                | Independent Q and VSWR values, visibility, styles                                                  | `layers.q`, `layers.vswr`                                          |
| `peripheralScales`       | Visibility of all peripheral rulers together                                                       | `peripheralScales.setVisible()`                                    |

Defaults are 50 Ω, the light theme, zoom and cursor disabled, peripheral scales hidden,
and standard grids with labels. Resistance/reactance are visible;
conductance/susceptance and Q/VSWR circles are hidden. Q defaults to
`[0.5, 1, 2, 5, 10]`; VSWR defaults to `[1.2, 1.5, 2, 3, 5, 10]`.

Shared `grid` settings apply to all four grids; `grid.layers` overrides individual
fields afterward. Styles merge by property. Explicit layer styles override theme
colors and remain in effect when `setAppearance()` changes the theme.
Options and circle arrays are copied; changing the original object does not update
the chart. Use the existing chart/layer methods for later changes. Unknown constructor groups
or structural option names throw `TypeError`; omitted fields use defaults.

Export configuration belongs to `toSvg()`/`toPng()` calls, independently of chart
construction. `scaleReadout` requires `scales`; otherwise export throws/rejects with `TypeError`.

The constructor configures presentation and interaction. Add measurement data with
`addTrace()` and optional markers with `addMarker()`; no markers are created implicitly.
Radial parameter scales remain independently mounted `SmithScales` instances.

### Updating configuration

`chart.setOptions(options)` accepts the same `SmithOptions` type as the constructor:

```ts
chart.setOptions({
  interaction: { zoom: true },
  grid: {
    detail: 'basic',
    layers: { reactance: { labelsVisible: false } },
  },
  circles: { vswr: { visible: true, values: [2, 3] } },
});
```

This is a patch: omitted and `undefined` fields retain their current values;
`{}` groups do nothing. Shared grid settings apply to all four grids first, then
per-layer overrides in the same call. A later shared setting also replaces that
field on previously customized layers. Style fields merge; circle value lists
replace. `appearance`, when provided, replaces the preset/overrides exactly like
`setAppearance()` (it is not recursively merged with the previous appearance).

The complete patch is validated before application. Invalid settings or impossible
reference conversions leave the chart unchanged. `referenceImpedanceOhms` invokes
renormalization of existing traces and retains physical impedance and marker IDs.
Other configuration updates preserve measurements, markers, selection, and view.
Options are not retained; subsequent edits to the input object have no effect.
Individual setters remain available for focused changes.

### Keyboard and touch markers

Use Tab/Shift+Tab to focus a marker. Arrow keys move through samples in input order;
Right/Up advances and Left/Down goes back. Shift+Arrow or Page Up/Down moves ten
samples, and Home/End selects the first/last sample. Navigation clamps at the ends
and also works when chart zoom is disabled. A single-sample trace remains focusable
for reading, with its slider marked disabled.

A focused marker has a contrasting outline and exposes its trace name, marker
number, sample position, and frequency to assistive technology. Hidden traces are
excluded from keyboard focus. `chart.focusMarker(id)` allows a separate marker
selector to focus the matching chart control. The demo provides a **Focus on chart**
button beside its marker selector.

Markers have a 44 CSS px circular hit area and an 18 CSS px triangle, kept constant
through zoom and container resizing. A marker touch gesture does not pan the chart;
cancelling it releases the drag state. Touch target areas may overlap for nearby
markers; use keyboard focus or the demo selector to reach an obscured marker.

## Traces and markers

Trace and marker IDs are opaque strings, unique within a chart and never reused
there. They survive renaming, hiding, updating samples, and removing other items.
They are not persistent across chart instances or page reloads.

```ts
const markerA = chart.addMarker(traceId)!; // First sample.
const markerB = chart.addMarker(traceId, 2)!; // Zero-based sample index.

chart.setTraceOptions(traceId, { name: 'Tuned antenna', visible: true });
chart.setMarkerSample(markerB, 1);
console.log(chart.getMarker(markerB)?.frequencyHz); // 1.5e9

const difference = chart.compareMarkers(markerA, markerB);
console.log(difference?.frequencyDeltaHz); // B − A, in Hz.
console.log(difference?.impedanceDeltaOhms?.toVector());
console.log(difference?.phaseDeltaDegrees);

chart.removeMarker(markerB);
```

| Method                                | Result / behavior                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `addTrace(samples, options?)`         | Returns a trace ID, without creating markers. Options: nonblank `name`, solid CSS `color`, and `visible`.                |
| `getTraces()`                         | Detached `TraceInfo` snapshots: ID, name, color, visibility, sample count, and marker metadata.                          |
| `setTraceOptions(id, options)`        | Updates the supplied options only. Invalid options throw before any change.                                              |
| `updateTrace(id, samples, options?)`  | Replaces samples and preserves identity, appearance, and markers. Empty/invalid input throws without changing the trace. |
| `removeTrace(id)`                     | Removes the trace and its markers.                                                                                       |
| `clearTraces()`                       | Removes all traces and their markers.                                                                                    |
| `addMarker(traceId, sampleIndex = 0)` | Returns a marker ID, or `undefined` if the trace is missing.                                                             |
| `getMarker(id)`                       | Returns a `MarkerSnapshot`, or `undefined` if missing.                                                                   |
| `focusMarker(id)`                     | Moves keyboard focus to a mounted, visible marker; returns `false` if missing or not focusable.                          |
| `setMarkerSample(id, sampleIndex)`    | Selects an existing sample and queues a marker notification.                                                             |
| `removeMarker(id)`                    | Removes one marker without renumbering the remaining markers.                                                            |
| `compareMarkers(a, b)`                | Returns B − A, or `undefined` if either marker is missing.                                                               |
| `referenceImpedanceOhms`              | Read-only reference impedance. Must be positive and finite.                                                              |

Update/remove methods return a boolean: `false` means the ID was not found.
Sample indices must be zero-based integers within the trace; invalid indices throw
`RangeError`. Sample replacement follows the nearest measured frequency by default.
Pass `{ markerSelection: 'sample-index' }` to retain indices (clamped to the new last
sample if the trace shrinks), or `{ markerSelection: 'reflection' }` to select the
nearest Γ. Frequency and Γ ties select the earlier sample in input order, including
unsorted sweeps and duplicate frequencies. Selection uses the actual selected sample,
not a previous requested frequency. No interpolation is performed.

```ts
chart.updateTrace(
  traceId,
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.2, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.3, 0] },
  ],
  { markerSelection: 'frequency' },
);
```

Invalid strategies throw `TypeError`; empty or invalid samples throw `RangeError`
before mutation. Unknown trace IDs return `false` without validating input.
Renormalization always preserves sample indices because it transforms the existing
sweep rather than replacing it.

Trace snapshots contain `markers: { id, number, sampleIndex }[]`. `number` is the
stable display number within that trace. A `MarkerSnapshot` includes the common
RF reading fields below plus `traceId`, `markerId`, `markerNumber`, `sampleIndex`,
and `frequencyHz`.

Hiding a trace hides its points and markers while retaining measurements for
comparisons. Hiding or deleting a dragged marker/trace ends the drag. Mutations
after destruction throw; trace/marker lookups return empty or missing results.

## Trace appearance

Pass `mode: 'points' | 'line' | 'both'`, `lineWidth`, and `pointRadius` to
`addTrace` or `setTraceOptions`. Defaults are points, 2 px line width, and 2 px point radius. Both sizes are
CSS pixels and remain constant under chart zoom and container resize. Widths and radii must be positive and finite.
`getTraces()` includes the current style.

Lines connect all samples in input order, without smoothing or frequency sorting.
A line-only trace creates one SVG path and no sample circles, suitable for dense
sweeps. Points/both render every sample for traces up to 5,000 samples. Larger traces
render one representative per point-radius-sized display cell and skip points
outside the viewport; representatives are recalculated during zoom/pan.
This only simplifies the image: all original samples remain available to markers,
snapping, readouts, and comparisons. Lines still connect every input sample.
Styles do not change marker identity or layer ordering. Hidden traces retain their style after sample replacement.
The demo exposes the same controls per trace.

## Events and readings

`onEvent(listener)` supports multiple independent subscriptions and returns an
unsubscribe function. `SmithEvent` is a discriminated union: checking `type`
narrows `data` without a cast or a property-presence test.

```ts
import { SmithEventType } from 'smithkit';

const unsubscribe = chart.onEvent((event) => {
  if (event.type === SmithEventType.Cursor) {
    // undefined when the pointer leaves or a marker drag starts.
    console.log(event.data?.impedanceOhms?.toVector());
    return;
  }
  // Marker, MarkerSelect, MarkerDragStart, and MarkerDragEnd carry a MarkerSnapshot.
  console.log(event.data.markerId, event.data.frequencyHz);
});

// On component unmount:
unsubscribe();
chart.destroy();
```

The event types are `Cursor` (`'cursor'`), `Marker` (`'marker'`),
`MarkerSelect` (`'marker-select'`),
`MarkerDragStart` (`'marker-drag-start'`), and `MarkerDragEnd` (`'marker-drag-end'`).
`MarkerSelect` fires synchronously when a marker receives focus or is engaged by
keyboard navigation or a pointer press. Use it to select the corresponding
readout; it does not indicate a position change. Keyboard changes use the normal
queued `Marker` event and do not emit drag lifecycle events.
Cursor movement is suspended during marker dragging. Drag start/end events fire
synchronously; marker position notifications are queued and report the latest
snapshot at delivery. Before delivery, repeated updates to the same marker coalesce
into one notification; different markers have independent notifications. `addMarker()`
queues an initial marker notification too; `addTrace()` does not. Removed markers cannot deliver queued
position events.
Trace metadata changes do not emit marker events; refresh metadata after mutations.
Destruction suppresses application callbacks.

`chart.cursorReading` returns the last cursor position. Cursor and marker readings
share `SmithReading`; `RfCalculations.readReflection(gamma, referenceImpedanceOhms = 50)` produces
the same reading without constructing a chart.

| Fields                                                                               | Units / meaning                                                        |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `reflectionCoefficient`                                                              | Complex, dimensionless voltage Γ.                                      |
| `impedanceOhms`, `admittanceSiemens`                                                 | Physical complex Z in Ω and Y in S. Multiply Y by 1000 for mS display. |
| `phaseDegrees`                                                                       | Phase of Γ in degrees; undefined at Γ = 0.                             |
| `vswr`, `q`                                                                          | Dimensionless voltage standing-wave ratio and \|X/R\|.                 |
| `returnLossDb`, `reflectionLossDb`                                                   | dB. Reflection loss is also called mismatch loss.                      |
| `standingWaveRatioDb`                                                                | 20 log₁₀(VSWR), in dB.                                                 |
| `attenuationDb`                                                                      | Half the return loss; interpretation described below.                  |
| `powerReflectionCoefficient`, `powerTransmissionCoefficient`                         | \|Γ\|² and 1 − \|Γ\|².                                                 |
| `voltageReflectionCoefficientMagnitude`                                              | \|Γ\|.                                                                 |
| `voltageTransmissionCoefficientMagnitude`, `currentTransmissionCoefficientMagnitude` | \|1 + Γ\| and \|1 − Γ\|, respectively.                                 |
| `standingWavePeak`, `standingWaveLossCoefficient`                                    | √VSWR and (1 + \|Γ\|²)/(1 − \|Γ\|²).                                   |

Singular Z at Γ = +1 and Y at Γ = −1 are `undefined`. Q is undefined at an open
or short, and infinite for a nonzero purely reactive impedance. Finite points near
these limits retain finite readings within the supported numeric range. An exact
infinite scalar limit is preserved: perfect match gives infinite return loss;
\|Γ\| = 1 gives infinite VSWR and reflection loss.

For active loads (\|Γ\| > 1), VSWR, standing-wave quantities, reflection loss,
attenuation, and power transmission are `undefined`. Other quantities remain
available. Non-finite complex inputs or invalid reference impedances throw
`RangeError` in the public RF methods. Unrepresentable complex conversion
results are `undefined`.

## Selecting a marker by frequency

`chart.setMarkerFrequency(markerId, frequencyHz)` selects the nearest measured
frequency and returns `true`, or `false` if the marker does not exist. It accepts
finite, non-negative Hz values; other values throw `RangeError`. It works with
unsorted sweeps and duplicate frequencies. Equal-distance ties choose the earliest
sample in input order. Requests outside the sweep select the nearest endpoint.
No interpolation or sample reordering is performed.

Read `chart.getMarker(markerId).frequencyHz` for the actual selected frequency.
The same queued `Marker` event is emitted as for sample-index selection, and
comparisons update accordingly. The demo accepts MHz and shows the selected
measurement frequency; dragging and sample selection keep that field synchronized.

## Calculations without a chart

```ts
import { Complex, RfCalculations } from 'smithkit';

const gamma = RfCalculations.impedanceToReflection(Complex.from(75, 25), 50)!;
const reading = RfCalculations.readReflection(gamma, 50);
console.log(reading.impedanceOhms?.toVector()); // Approximately [75, 25].
console.log(reading.admittanceSiemens?.toVector());
```

| Static method                                                                           | Input and output                                                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `RfCalculations.reflectionToImpedance(gamma, referenceImpedanceOhms = 50)`              | Γ → physical Z in Ω.                                                                                            |
| `RfCalculations.impedanceToReflection(impedanceOhms, referenceImpedanceOhms = 50)`      | Physical Z in Ω → Γ.                                                                                            |
| `RfCalculations.reflectionToAdmittance(gamma, referenceImpedanceOhms = 50)`             | Γ → physical Y in S.                                                                                            |
| `RfCalculations.admittanceToReflection(admittanceSiemens, referenceImpedanceOhms = 50)` | Physical Y in S → Γ.                                                                                            |
| `RfCalculations.readReflection(gamma, referenceImpedanceOhms = 50)`                     | Complete `SmithReading`.                                                                                        |
| `MarkerMeasurements.compare(a, b)`                                                      | Compare readings without a chart. Each input needs `frequencyHz`, `reflectionCoefficient`, and `impedanceOhms`. |

Comparison results contain `frequencyDeltaHz`, `impedanceDeltaOhms`, and
`phaseDeltaDegrees`. Phase differences use B − A wrapped to **[−180°, 180°)**:
179° → −179° gives +2°; an exact half turn gives −180°. Phase is undefined if
either Γ is zero or non-finite. Impedance differences are undefined if either Z
is singular or non-finite. Frequencies must be finite and non-negative. This is
a point comparison, not sweep phase unwrapping or group delay.

`Complex.from(re, im)` constructs complex numbers. Read components through `re` and `im`. Arithmetic (`add`, `sub`,
`mul`, `div`, `pow`) returns new values. The class also provides `abs`, `arg`
(radians), and static methods such as `Complex.conj`, `Complex.sqrt`,
`Complex.exp`, `Complex.log`, and trigonometric/hyperbolic functions and inverses. `toVector()` returns `[real, imaginary]`; `toString(dp)` formats
a Cartesian value. See the exported declarations for all operations.

The `SmithFormatter` class provides static methods: `SmithFormatter.number(value)` (three significant
digits and SI prefixes), `SmithFormatter.complex(value, unit?, decimalPlaces?)`, and
`SmithFormatter.polar(value, unit?, decimalPlaces?)` (phase in degrees). They work
without a chart or DOM. Complex formatters default to three fractional digits.
`SmithFormatter.number` includes spacing so you can append a unit, e.g. `SmithFormatter.number(1e9) + 'Hz'`.

`RfCalculations.reactanceToComponent(reactanceOhms, frequencyHz)` calculates an ideal equivalent
series component without formatting or constructing a chart:

```ts
import { RfCalculations, SmithFormatter } from 'smithkit';

const component = RfCalculations.reactanceToComponent(-50, 1e9);
if (component?.kind === 'capacitor') {
  console.log(SmithFormatter.number(component.capacitanceFarads) + 'F'); // 3.18 pF
} else if (component?.kind === 'inductor') {
  console.log(SmithFormatter.number(component.inductanceHenries) + 'H');
}
```

Use `reading.impedanceOhms.im` for the reactance when impedance is defined.
Zero frequency, zero reactance, and unrepresentable results return `undefined`.
Non-finite reactance or negative/non-finite frequency throws `RangeError`.
This is a single-frequency equivalence, not a fitted circuit model.

## Appearance and themes

`Smith` and `SmithScales` accept the same appearance configuration. The default
is the light preset with a transparent background. The dark preset includes a
solid dark background so its labels remain readable when embedded or exported.

```ts
import { Smith, SmithScales } from 'smithkit';
import type { SmithAppearance } from 'smithkit';

const appearance: SmithAppearance = {
  theme: 'dark',
  overrides: {
    fontFamily: 'Arial, sans-serif',
    grid: { majorWidth: 1.2 },
    cursor: { impedanceColor: '#fbbf24' },
    marker: { focusColor: '#38bdf8' },
    traceColors: ['#38bdf8', '#fb923c', '#a78bfa'],
  },
};
const chart = new Smith({ referenceImpedanceOhms: 50, appearance });
const scales = new SmithScales(appearance);
chart.draw('#smith');
scales.draw('#scales');

// Update both independent components using the same configuration.
chart.setAppearance({ theme: 'light' });
scales.setAppearance({ theme: 'light' });
```

Each `setAppearance` call replaces the previous preset and overrides; omitted
settings return to the selected preset, or light when `theme` is omitted.
Nested overrides are partial. Appearance is scoped to each component and does not
change the surrounding application's CSS or other chart instances.

| Override                   | Settings                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `background`, `fontFamily` | Component background and shared font family.                                                                                                                                         |
| `grid`                     | `stroke`, `textColor`, `majorWidth`, `minorWidth`, `fontSize`.                                                                                                                       |
| `boundary`                 | `stroke`, `width` for the Smith chart boundary.                                                                                                                                      |
| `circles`                  | `q`, `vswr` colors and shared `width`.                                                                                                                                               |
| `scales`                   | `stroke`, `boundaryColor`, `textColor`, `valueColor`, `indicatorColor`, `indicatorOutline`; `fontSize` for radial ticks, `titleFontSize`, `valueFontSize`, and `peripheralFontSize`. |
| `cursor`                   | `pointColor`, `impedanceColor`, `admittanceColor`, `pointSize` (dot diameter), `lineWidth`.                                                                                          |
| `marker`                   | `outlineColor`, `textColor`, `focusColor`, `focusHaloColor`. Marker fill follows its trace color.                                                                                    |
| `traceColors`              | Non-empty palette for automatically colored traces.                                                                                                                                  |

Colors must be solid CSS colors accepted by the library's color parser, including
hex, RGB, HSL, named colors, and `transparent`; CSS variable references are not
accepted in the configuration. Numeric values must be positive and finite.
Line widths and cursor point size are CSS pixels. Font sizes are SVG chart/scale
units and follow the existing layout; grid labels retain their adaptive minimum
size. Marker geometry and the 44 px touch target stay unchanged.

Appearance updates retain zoom, samples, marker selection/focus, layer visibility,
and scale readings. They recolor existing and future automatically colored traces.
Explicit colors passed through trace options and explicit layer styles take
precedence and survive theme changes. Applying a new appearance does not reset
those individual overrides. Invalid appearance settings throw before making changes.

SVG exports resolve the appearance without requiring theme CSS. A configured
background is included in the exported image; `transparent` preserves transparency.
The **Theme** selector in the demo's **Chart settings** dialog updates both library components and the demo UI.

## Grid layers

Resistance and reactance are initially visible. Conductance, susceptance, Q,
and VSWR layers start hidden. All controls are under `chart.layers`:

```ts
chart.layers.resistance.setVisible(false);
chart.layers.reactance.setVisible(false);
chart.layers.conductance.setVisible(true);
chart.layers.susceptance.setVisible(true);
chart.layers.conductance.setDetail('standard');
chart.layers.conductance.setLabelsVisible(false);
chart.layers.susceptance.setLabelsVisible(false);
chart.layers.susceptance.setStyle({ stroke: '#64748b', textColor: '#2a7f62' });
chart.layers.vswr.addValue(4);
chart.layers.vswr.setVisible(true);
```

The four grid layers support `setVisible`, `setLabelsVisible`, `setDetail`, and
`setStyle(Partial<GridStyle>)`. Style fields: `stroke`, `majorWidth`, `minorWidth`,
`textColor`, `textFontFamily`, `textFontSize`. Widths are positive finite numbers
in CSS pixels. Font size is a positive finite base size in chart units; adaptive
layout raises it when needed to keep the font size at least 9 CSS pixels in the
default view. Partial updates retain other settings. Invalid numeric styles throw
before any property is changed.

Use `chart.setGridDetail('basic' | 'standard' | 'detailed')` for all four grid layers,
or `layer.setDetail(...)` to override one layer:

- **Basic:** complete circles and arcs for normalized values 0.2, 0.5, 1, 2, and 5,
  with matching axis/rim labels and the zero label. Intended for small or static charts.
- **Standard** (default): the full major grid and its labels, without minor lines.
- **Detailed:** the full major and minor grid.

Changing detail preserves layer visibility, styles, and the current view. Label
collision handling still applies at every level. Peripheral scales and Q/VSWR
circles are independent. The demo's **Chart settings → Grid detail** selector updates all four grid layers.

Use `setLabelsVisible(false)` to hide a grid layer's labels while keeping its lines.
Labels default to visible. The setting persists through detail, style, theme, and
whole-layer visibility changes and is included in SVG exports. Calling
`setLabelsVisible(true)` restores labels allowed by the current detail and collision
layout; it does not show a hidden layer. The **Grid labels** checkbox in the demo’s **Chart settings** dialog controls all four grid layers together. Peripheral scale labels are unaffected.

`layers.q` and `layers.vswr` support `setVisible`,
`setStyle({ stroke?, strokeWidth? })`, `setValues`, `addValue`, and `removeValue`.
`setValues([1, 2, 5])` replaces the entire list; `setValues([])` clears it.
Input arrays are copied, duplicate values are ignored, and invalid input leaves
the previous values unchanged.
Circle stroke widths are positive finite numbers in CSS pixels.
Q values must be positive and finite; VSWR values must be finite and at least 1.
Duplicate additions and removal of absent values have no effect.

Grid labels use normalized values; readings use physical units. Strokes default
to slate gray with 1 px major and 0.6 px minor lines. Stroke widths stay constant
under zoom. Layer controls do not expose drawing objects or SVG nodes.

Grid labels adapt automatically to the chart's rendered size,
including static charts with zoom disabled. The layout prioritizes key values,
hides labels that overlap or extend beyond the default view, and prioritizes zero
and the highest labeled axis value. It recalculates on resize and layer visibility
or style changes. Zoom and pan preserve the chosen labels and scale them smoothly
with the grid. This changes only labels; grid lines and ticks remain unchanged.
SVG exports preserve the current label layout.

For small static charts, hide minor grid lines and, when unnecessary, peripheral
scales using the controls above. Very small charts necessarily show fewer values;
use a larger container for detailed readings. Peripheral labels retain their full
wording and scale with the chart. Their rulers form two outlined bands: phase
(transmission/reflection) and electrical length (toward load/generator), with a
shared tick circle inside each band.
The independent `SmithScales` panel uses its own responsive layout.

## Parameter scales

Mount `SmithScales` independently so its twelve axes stay outside chart zoom:

```ts
import { SmithScales, SmithEventType } from 'smithkit';

const scales = new SmithScales();
scales.draw('#smith-scales'); // Provide a separate mounted container.
const stopScales = chart.onEvent((event) => {
  if (event.type === SmithEventType.Cursor || event.type === SmithEventType.Marker) {
    const gamma = event.data?.reflectionCoefficient ?? null;
    scales.update(gamma);
    chart.peripheralScales.update(gamma);
  }
});

// On unmount: stopScales(); scales.destroy(); chart.destroy();
```

`update(Complex | null)` synchronizes indicators, values, tooltips, and accessible
labels. Null, non-finite, or active-load inputs hide indicators. `draw` accepts a
selector or `HTMLElement`; `destroy` is idempotent. Scales adapt to container width.

Labels follow the complete Smith chart terminology: **Reflection loss**,
**Power reflection coefficient**, **Power transmission coefficient**, and separate
**Voltage transmission coefficient** and **Current transmission coefficient**.
Ratios are dimensionless; loss/standing-wave dB axes are in dB. Transmission
indicators depend on Γ phase as well as magnitude.

Attenuation is −10 log₁₀\|Γ\|, half the return loss. Its one-way loss interpretation
assumes a matched line or attenuator terminated in an open or short: the reflected
wave traverses it twice. It does not measure insertion loss of an arbitrary load
from S11 alone. At \|Γ\| = 0.1 it reads 10 dB, while return loss reads 20 dB.

Peripheral rulers are hidden by default. Enable them with
`{ peripheralScales: { visible: true } }` or `chart.peripheralScales.setVisible(true)`.
`chart.peripheralScales` supports `setVisible(boolean)` and `update(Complex | null)`.
Its four rulers zoom with the chart: reflection phase, voltage transmission phase,
wavelengths toward generator, and wavelengths toward load. Wavelength rulers start
at the negative real axis, with 0.5 λ per revolution (generator clockwise, load
counterclockwise). These are electrical-length coordinates modulo 0.5 λ.
Reflection phase and wavelength coordinates are undefined at perfect match;
transmission phase is undefined at Γ = −1.

Scale conventions follow the [complete Smith chart reference](https://www.uiyinc.com/assets/The-Complete-Smith-Chart-Black-Magic-Design.jpg)
and [CERN's Smith chart introduction](https://arxiv.org/abs/1201.4068).

## Reference impedance and renormalization

`chart.renormalize(referenceImpedanceOhms)` changes the positive real reference
impedance and transforms every loaded Γ to preserve physical Z. Trace/marker IDs,
names, colors, visibility, frequencies, and selected sample indices are retained.
Results for all traces are validated before any change; a singular/unrepresentable
result rejects the operation without changing Z₀ or data. Active marker drags end,
cursor indicators are cleared, and marker readings are queued with the new values.
Changing to the current Z₀ has no effect. Mutations after destruction throw.

Two DOM-independent methods are available on `RfCalculations`:

- `RfCalculations.renormalizeReflection(gamma, fromOhms, toOhms)` returns the new complex Γ or
  `undefined` for a singular/unrepresentable result. Exact open and short limits
  remain Γ = +1 and −1. References must be positive, finite, real ohm values.
- `RfCalculations.renormalizeSamples(samples, fromOhms, toOhms)` returns a new sample array in
  the same order, preserving frequencies. Invalid samples or a singular result
  throw `RangeError`; the input is never modified.

For example, a matched 75 Ω load has Γ = 0 at 75 Ω and Γ = 0.2 at 50 Ω.
Renormalization changes Γ, VSWR, and loss readings; physical impedance stays 75 Ω.
Simply relabeling the same Γ with a new Z₀ would describe a different load.

The demo exposes chart Z₀ and explicitly renormalizes existing traces when applied.
Import renormalization is enabled by a labeled checkbox. Disable it to reject
files whose reference differs from the chart. Complex reference impedances and
multiport renormalization are outside the supported scope.

## Touchstone import

`Touchstone.parse(text)` returns `{ samples, referenceImpedanceOhms }`. It accepts
one-port Touchstone 1.x, converts RI/MA/DB into Cartesian Γ and all frequencies
into Hz, and throws for unsupported or invalid input.

```ts
import { Smith, Touchstone } from 'smithkit';

async function showMeasurement(file: File): Promise<Smith> {
  const { samples, referenceImpedanceOhms } = Touchstone.parse(await file.text());
  const chart = new Smith({ referenceImpedanceOhms });
  chart.draw('#smith');
  chart.addTrace(samples, { name: file.name });
  return chart;
}
```

Omitted options use Touchstone defaults: GHz, S, MA, 50 Ω. For an existing chart,
use `RfCalculations.renormalizeSamples` when the file reference differs from
`chart.referenceImpedanceOhms`. The parser itself does not renormalize data.
Multiport data and Touchstone 2.x are not supported.

## PNG and report export

`chart.toPng(options?)` and `scales.toPng(options?)` return `Promise<Blob>` with MIME
type `image/png`. Call them in a browser after mounting the components at non-zero
sizes, as with SVG export. The current view, labels, colors, markers, and scale
readings are captured without modifying the live components.

```ts
import { SmithScales } from 'smithkit';

const scales = new SmithScales();
scales.draw('#scales');
const png = await chart.toPng({ width: 3200, background: 'white', legend: true });
// Use the Blob with your application's download, preview, or upload flow.
const report = await chart.toPng({ width: 2400, scales, legend: true });
const scalePng = await scales.toPng({ width: 1200, background: 'transparent' });
```

- `width` / `height`: output pixels. Omit both to use the snapshot's natural size;
  specify one to preserve proportions. With both set, the complete image is
  centered and fitted without distortion or cropping. Padding uses the chosen
  background, or transparency when no background is specified.
- `background`: omit to keep component backgrounds, or pass a concrete CSS color
  (for example `'#fff'`) or `'transparent'` to replace them. Chart colors stay as
  configured; choose a suitable chart theme for your report background.
- `legend` (chart only): append the names and colors of visible traces. Long names
  wrap; hidden traces are omitted. Default: `false`.
- `markerLegend` (chart only): independently append marker descriptions below the chart/scales.
  Default: `false`. `true` includes every marker of visible traces, with trace name,
  marker number, frequency, and impedance. Use an options object to select `markerIds`
  and `fields` (`frequency`, `impedance`, `admittance`, `reflectionCoefficient`, `vswr`,
  `returnLoss`). Fields use Hz with SI prefixes, Ω, mS, dimensionless Γ, VSWR ratios,
  and dB respectively. Empty `markerIds` selects none; empty `fields` keeps only names
  and marker numbers. Hidden traces are always omitted, duplicate selections appear
  once, and unknown IDs/fields throw. Long descriptions wrap. Readings are captured at
  export invocation, without moving markers or changing the live view.
- `scales` (chart only): a mounted `SmithScales` instance to place centered below the chart.
  Its current responsive layout and readings are preserved. Use `scaleReadout` to
  export a specific reading independently of the live view.

```ts
// Works with toSvg() as well. Trace and marker legends are independent.
const png = await chart.toPng({
  legend: false,
  markerLegend: {
    fields: ['frequency', 'impedance', 'vswr'],
    // Omit markerIds to include all markers of visible traces.
  },
});
```

Dimensions must be positive integers, at most 8192 px per side and 32 megapixels
in total. Invalid options and unavailable/destroyed components reject the promise.
PNG export uses browser SVG decoding and Canvas 2D and releases temporary image URLs.
Fonts must be available to the browser; external font files are not embedded.
Export size increases resolution; it does not change the current label density.

The demo's **Export** dialog supports chart, scales, or a combined report,
custom dimensions/background, and independent trace and marker legends. **Include marker legend** reveals field and marker checkboxes; it is disabled for scales-only exports. The default output width is 3200 px. Choose PNG or SVG in the same dialog; both formats support these report options. The demo starts in dark mode. For exports containing parameter scales, **Scale readings** explicitly selects a marker or **None**, independently of the Cursor/Marker tab. Marker exports include the trace name, marker number, and frequency; cursor readings are not exported.

To export a specific scale reading without changing the live view, pass `readout` to
`scales.toSvg()` / `scales.toPng()`, or `scaleReadout` to a combined chart export:

```ts
import { Complex, SmithScales } from 'smithkit';

const scales = new SmithScales();
scales.draw('#scales');
const report = await chart.toPng({
  scales,
  scaleReadout: {
    reflectionCoefficient: Complex.from(0.2, 0.3),
    label: 'Antenna · Marker 1 · Frequency: 1 GHz',
  },
});
```

Use `{ reflectionCoefficient: null }` for scales without readings. Omit the override to
preserve the current readings. Labels wrap to fit the exported scales.

## SVG export

`chart.toSvg(options?)` and `scales.toSvg(options?)` return SVG strings synchronously.
They accept the same `SmithImageExportOptions` / `ImageExportOptions` as PNG export,
including size, background, legend, and scales. Omitting options preserves the
original standalone SVG snapshot. Call them after `draw()`
while the component is mounted and has a non-zero rendered size; exporting before
mounting, from a `display: none` container, or after destruction throws an error.

```ts
const svg = chart.toSvg();
const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'smith-chart.svg';
document.body.appendChild(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

The chart export preserves the current zoom/pan, layer visibility, labels, traces,
markers, and visible indicators. It captures the rendered points, including dense
trace point reduction; it is an image export, not a measurement-data export.
The scale export combines all twelve axes into one SVG using their current layout
and displayed readings. To export a marker reading, call `scales.update()` with
that marker's reflection coefficient before `scales.toSvg()`.

Files have explicit pixel dimensions and preserve the configured component background
(transparent by default). Presentation
styles are inlined so the application's stylesheet is not required. Text remains
editable, and curved captions retain their internal path references. Font files
and surrounding HTML controls/backgrounds are not embedded. Downloading is the
consumer's responsibility; the library does not create files or modify live nodes.
In the demo, choose **Export → Format → SVG**, then select chart, scales, or the combined report.

## Development and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for development, testing, release, and demo
hosting instructions. Licensed under [MIT](LICENSE).

## Numerical limits

`Complex` uses JavaScript binary64 numbers. Multiplication and division scale
intermediate products to avoid premature overflow and underflow; logarithms,
square roots, and reciprocals also handle extreme finite components. Results still
round to binary64: unrepresentable magnitudes become infinity and tiny results
can underflow to signed zero. Division by zero and reciprocals at zero return
`[NaN, NaN]`. These operations reject non-finite operands with NaN components.
The principal logarithm of zero retains its `-Infinity` real limit, and signed
zeros select the side of square-root and logarithm branch cuts. `pow(z, 0)` is one,
including zero to the zeroth power; negative powers of zero are undefined.

RF helpers validate finite inputs and use `undefined` for unrepresentable complex
readings, including an overflowing impedance difference between markers. These
conventions do not imply arbitrary precision or numerical certification of every
transcendental operation.
