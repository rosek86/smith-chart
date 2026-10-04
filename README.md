# Smithkit

**`smithkit`** is a framework-independent JavaScript and TypeScript library for
interactive SVG Smith charts, RF calculations, and S11 measurement exploration.

## Features

- Labeled resistance, reactance, conductance, and susceptance grids.
- Configurable constant-Q and constant-VSWR circles.
- Zoom, pan, view reset, and cursor readings.
- Named traces with colors, visibility, and draggable markers that snap to samples.
- Marker comparisons: frequency, complex impedance, and wrapped phase differences.
- Physical impedance/admittance conversions and DOM-independent RF readings.
- Twelve parameter scales mounted independently of chart zoom.
- Four peripheral rulers for phase and electrical length.
- One-port Touchstone 1.x import with RI, MA, and DB representations.
- ESM modules and TypeScript declarations.

## Installation

To install the current source version before a registry release:

```sh
git clone https://github.com/rosek86/smithkit.git
cd smithkit
npm ci
npm pack
```

Install the resulting archive in your application:

```sh
npm install /path/to/smithkit/smithkit-0.1.0.tgz
```

Building requires Node.js 24 or later. Browser applications need SVG, ES2022,
and an ESM-compatible build tool. No library stylesheet is required.

## Quick start

Give the container an explicit size and run the code after it is mounted:

```html
<div id="smith" style="width: 100%; max-width: 700px; aspect-ratio: 1;"></div>
```

```ts
import { Smith } from 'smithkit';

const chart = new Smith(50); // Reference impedance in ohms; defaults to 50.
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
coefficient Γ as `[real, imaginary]`. Samples are copied and validated. Frequencies
must be finite and non-negative; both coordinates must be finite. A trace must
contain at least one sample.

Each new trace receives one marker on its first sample. Drag markers to select
samples, scroll to zoom, and drag the chart to pan. Markers stay above all sample
points. `chart.resetView()` restores the initial view, including peripheral rulers.

Construct `Smith` only in a browser, such as your framework's mount hook. Importing
the package and using its calculation or parsing functions does not require a DOM.
`draw(selector | HTMLElement)` moves the existing SVG when called again. A missing
container throws. Call `chart.destroy()` on unmount; it removes the SVG, releases
event handlers, and cancels queued notifications. Repeated destruction is safe.

## Traces and markers

Trace and marker IDs are opaque strings, unique within a chart and never reused
there. They survive renaming, hiding, updating samples, and removing other items.
They are not persistent across chart instances or page reloads.

```ts
const markerA = chart.getTraces().find((trace) => trace.id === traceId)!.markers[0].id;
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
| `addTrace(samples, options?)`         | Returns a trace ID. Options: nonblank `name`, solid CSS `color`, and `visible`.                                          |
| `getTraces()`                         | Detached `TraceInfo` snapshots: ID, name, color, visibility, sample count, and marker metadata.                          |
| `setTraceOptions(id, options)`        | Updates the supplied options only. Invalid options throw before any change.                                              |
| `updateTrace(id, samples)`            | Replaces samples and preserves identity, appearance, and markers. Empty/invalid input throws without changing the trace. |
| `removeTrace(id)`                     | Removes the trace and its markers.                                                                                       |
| `clearTraces()`                       | Removes all traces and their markers.                                                                                    |
| `addMarker(traceId, sampleIndex = 0)` | Returns a marker ID, or `undefined` if the trace is missing.                                                             |
| `getMarker(id)`                       | Returns a `MarkerSnapshot`, or `undefined` if missing.                                                                   |
| `setMarkerSample(id, sampleIndex)`    | Selects an existing sample and queues a marker notification.                                                             |
| `removeMarker(id)`                    | Removes one marker without renumbering the remaining markers.                                                            |
| `compareMarkers(a, b)`                | Returns B − A, or `undefined` if either marker is missing.                                                               |
| `referenceImpedanceOhms`              | Read-only reference impedance. Must be positive and finite.                                                              |

Update/remove methods return a boolean: `false` means the ID was not found.
Sample indices must be zero-based integers within the trace; invalid indices throw
`RangeError`. Markers snap to the nearest Γ after sample replacement, choosing the
earlier sample in a tie. No interpolation is performed.

Trace snapshots contain `markers: { id, number, sampleIndex }[]`. `number` is the
stable display number within that trace. A `MarkerSnapshot` includes the common
RF reading fields below plus `traceId`, `markerId`, `markerNumber`, `sampleIndex`,
and `frequencyHz`.

Hiding a trace hides its points and markers while retaining measurements for
comparisons. Hiding or deleting a dragged marker/trace ends the drag. Mutations
after destruction throw; trace/marker lookups return empty or missing results.

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
  // Marker, MarkerDragStart, and MarkerDragEnd always carry a MarkerSnapshot.
  console.log(event.data.markerId, event.data.frequencyHz);
});

// On component unmount:
unsubscribe();
chart.destroy();
```

The event types are `Cursor` (`'cursor'`), `Marker` (`'marker'`),
`MarkerDragStart` (`'marker-drag-start'`), and `MarkerDragEnd` (`'marker-drag-end'`).
Cursor movement is suspended during marker dragging. Drag start/end events fire
synchronously; marker position notifications are queued and report the latest
snapshot at delivery. Removed markers cannot deliver queued position events.
Trace metadata changes do not emit marker events; refresh metadata after mutations.
Destruction suppresses application callbacks.

`chart.cursorReading` returns the last cursor position. Cursor and marker readings
share `SmithReading`; `readReflection(gamma, referenceImpedanceOhms = 50)` produces
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
`RangeError` in the public RF functions. Unrepresentable complex conversion
results are `undefined`.

## Calculations without a chart

```ts
import { Complex, readReflection, impedanceToReflection } from 'smithkit';

const gamma = impedanceToReflection(Complex.from(75, 25), 50)!;
const reading = readReflection(gamma, 50);
console.log(reading.impedanceOhms?.toVector()); // Approximately [75, 25].
console.log(reading.admittanceSiemens?.toVector());
```

| Function                                                                 | Input and output                                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `reflectionToImpedance(gamma, referenceImpedanceOhms = 50)`              | Γ → physical Z in Ω.                                                                                            |
| `impedanceToReflection(impedanceOhms, referenceImpedanceOhms = 50)`      | Physical Z in Ω → Γ.                                                                                            |
| `reflectionToAdmittance(gamma, referenceImpedanceOhms = 50)`             | Γ → physical Y in S.                                                                                            |
| `admittanceToReflection(admittanceSiemens, referenceImpedanceOhms = 50)` | Physical Y in S → Γ.                                                                                            |
| `readReflection(gamma, referenceImpedanceOhms = 50)`                     | Complete `SmithReading`.                                                                                        |
| `compareMarkerReadings(a, b)`                                            | Compare readings without a chart. Each input needs `frequencyHz`, `reflectionCoefficient`, and `impedanceOhms`. |

Comparison results contain `frequencyDeltaHz`, `impedanceDeltaOhms`, and
`phaseDeltaDegrees`. Phase differences use B − A wrapped to **[−180°, 180°)**:
179° → −179° gives +2°; an exact half turn gives −180°. Phase is undefined if
either Γ is zero or non-finite. Impedance differences are undefined if either Z
is singular or non-finite. Frequencies must be finite and non-negative. This is
a point comparison, not sweep phase unwrapping or group delay.

`Complex.from(re, im)` constructs complex numbers. Arithmetic (`add`, `sub`,
`mul`, `div`, `pow`) returns new values. The class also provides `abs`, `arg`
(radians), and static functions such as `Complex.conj`, `Complex.sqrt`,
`Complex.exp`, `Complex.log`, and trigonometric/hyperbolic functions and inverses. `toVector()` returns `[real, imaginary]`; `toString(dp)` formats
a Cartesian value. See the exported declarations for all operations.

Chart formatting helpers are `formatNumber(value)` (SI prefixes),
`formatComplex(value, unit?, dp?)`, `formatComplexPolar(value, unit?, dp?)`, and
`getReactanceComponentValue(gamma, frequencyHz)` (equivalent series L/C).

## Grid layers

Resistance and reactance are initially visible. Conductance, susceptance, Q,
and VSWR layers start hidden. All controls are under `chart.layers`:

```ts
chart.layers.resistance.setVisible(false);
chart.layers.reactance.setVisible(false);
chart.layers.conductance.setVisible(true);
chart.layers.susceptance.setVisible(true);
chart.layers.conductance.setMinorVisible(false);
chart.layers.susceptance.setStyle({ stroke: '#64748b', textColor: '#2a7f62' });
chart.layers.vswr.addValue(4);
chart.layers.vswr.setVisible(true);
```

The four grid layers support `setVisible`, `setMinorVisible`, and
`setStyle(Partial<GridStyle>)`. Style fields: `stroke`, `majorWidth`, `minorWidth`,
`textColor`, `textFontFamily`, `textFontSize`. Partial updates retain other settings.

`layers.q` and `layers.vswr` support `setVisible`,
`setStyle({ stroke?, strokeWidth? })`, `addValue`, and `removeValue`.
Q values must be positive and finite; VSWR values must be finite and at least 1.
Duplicate additions and removal of absent values have no effect.

Grid labels use normalized values; readings use physical units. Strokes default
to slate gray with 1 px major and 0.6 px minor lines. Stroke widths stay constant
under zoom; label sizes use SVG user units. Layer controls do not expose drawing
objects or SVG nodes.

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

`chart.peripheralScales` supports `setVisible(boolean)` and `update(Complex | null)`.
Its four rulers zoom with the chart: reflection phase, voltage transmission phase,
wavelengths toward generator, and wavelengths toward load. Wavelength rulers start
at the negative real axis, with 0.5 λ per revolution (generator clockwise, load
counterclockwise). These are electrical-length coordinates modulo 0.5 λ.
Reflection phase and wavelength coordinates are undefined at perfect match;
transmission phase is undefined at Γ = −1.

Scale conventions follow the [complete Smith chart reference](https://www.uiyinc.com/assets/The-Complete-Smith-Chart-Black-Magic-Design.jpg)
and [CERN's Smith chart introduction](https://arxiv.org/abs/1201.4068).

## Touchstone import

`parseTouchstone(text)` returns `{ samples, referenceImpedanceOhms }`. It accepts
one-port Touchstone 1.x, converts RI/MA/DB into Cartesian Γ and all frequencies
into Hz, and throws for unsupported or invalid input.

```ts
import { Smith, parseTouchstone } from 'smithkit';

async function showMeasurement(file: File): Promise<Smith> {
  const { samples, referenceImpedanceOhms } = parseTouchstone(await file.text());
  const chart = new Smith(referenceImpedanceOhms);
  chart.draw('#smith');
  chart.addTrace(samples, { name: file.name });
  return chart;
}
```

Omitted options use Touchstone defaults: GHz, S, MA, 50 Ω. Imported files must
match an existing chart's reference impedance. Automatic renormalization,
multiport data, and Touchstone 2.x are not supported.

## Development and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for development, testing, release, and demo
hosting instructions. Licensed under [MIT](LICENSE).
