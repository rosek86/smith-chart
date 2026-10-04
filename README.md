# Smithkit

**`smithkit`** is a framework-independent JavaScript and TypeScript library for
interactive Smith charts. It renders SVG with D3 and provides RF calculations,
S11 measurement plotting, draggable markers, and Touchstone import.

## Features

- Resistance, reactance, conductance, and susceptance grids with labels.
- Configurable constant-Q and constant-VSWR circles.
- Zoom, pan, view reset, and cursor readouts.
- Multiple S11 datasets with markers that snap to measurement samples.
- Impedance, admittance, VSWR, return loss, mismatch loss, and Q calculations.
- Ten independently mounted parameter scales with cursor indicators.
- One-port Touchstone 1.x parsing: RI, MA, and DB representations.
- ESM modules and TypeScript declarations; no framework or global D3 object required.

## Installation

To use the current source version, create a package archive from this repository:

```sh
git clone https://github.com/rosek86/smith-chart.git
cd smith-chart
npm ci
npm pack
```

Then install that archive in your application:

```sh
npm install /path/to/smith-chart/smithkit-0.1.0.tgz
```

These steps install a local build and do not depend on an npm registry release.
Building the package requires Node.js 24 or later. Applications using the chart
need a browser with SVG and ES2022 support and an ESM-compatible build tool.
D3 and its type declarations are installed as package dependencies.

## Quick start

Give the chart container an explicit size. No library stylesheet is required.

```html
<div id="smith" style="width: 100%; max-width: 700px; aspect-ratio: 1;"></div>
```

Run this code after the container is mounted:

```ts
import { Smith } from 'smithkit';

const chart = new Smith(50); // Reference impedance in ohms; defaults to 50.
chart.draw('#smith');

chart.addS1P([
  { freq: 1e9, point: [0.5, -0.5] },
  { freq: 1.5e9, point: [0, 0] },
  { freq: 2e9, point: [0.5, 0.5] },
]);
```

Each `point` is the complex reflection coefficient Γ as `[real, imaginary]`,
not impedance. Frequencies are in Hz. Markers render above every dataset’s points,
including after adding or updating datasets. A marker is added to each nonempty dataset;
drag it along the trace to select a sample. Markers show a grab cursor, changing
to grabbing during a drag. Chart cursor guides and cursor events with position data
are suspended while dragging a marker; they resume on the next pointer move after
release. `MarkerDragStart` and `MarkerDragEnd` events carry the marker payload,
so applications can temporarily show marker values in place of cursor readouts.
The demo uses these events to switch its shared scales panel to the Marker tab
during a drag, then restore the previously selected tab.
Scroll to zoom, drag the chart to pan,
and call `chart.resetView()` to restore the initial view.

The constructor creates SVG elements, so instantiate `Smith` only in a browser
(for example, inside your framework's client-side mount hook). Importing the
package and using its calculation or parsing helpers does not require a DOM.

## Parameter scales

`Smith` renders only the chart. Mount `SmithScales` in a separate container to
show VSWR, losses, power, and reflection/transmission scales independently of
chart zoom and pan. No library stylesheet is required; scales adapt to the
container width, using one column on narrow screens.

```html
<div id="smith-scales"></div>
```

```ts
import { SmithScales, SmithEventType } from 'smithkit';

const scales = new SmithScales();
scales.draw('#smith-scales');

chart.setUserActionHandler((event) => {
  if (event.type === SmithEventType.Cursor) {
    scales.update(event.data?.reflectionCoefficient ?? null);
  }
});

// In your component's unmount hook:
// scales.destroy();
// chart.destroy();
```

`update(gamma)` positions the dots for a `Complex` reflection coefficient.
Nine scales depend on `|Γ|`; voltage transmission uses `|1 + Γ|`, so its dot also
responds to phase. Values appear directly above each axis, as well as in its tooltip and accessible
label. Loss and standing-wave dB scales use dB; all other scales show dimensionless
ratios, with VSWR written as `value : 1`. `update(null)`, non-finite coordinates, and values outside the passive-load
unit circle hide the dots and reset the displayed values to a dash. Dots start hidden.

`draw` accepts a selector or an `HTMLElement` and moves the existing component
when called again. A missing container throws. Call `destroy()` independently
of the chart to remove the scales; repeated destruction is safe. Instantiate
`SmithScales` only in a browser, after the host is mounted.

## Lifecycle and datasets

Mount a chart with a selector or an `HTMLElement`. Calling `draw` again moves the
existing SVG without creating a duplicate. A missing container throws an error.
Call `destroy()` in your framework's unmount hook; it removes the SVG, cancels
pending marker notifications, and releases event handlers. Destruction is idempotent;
create a new `Smith` instance to mount again afterward.

```ts
const chart = new Smith(50);
chart.draw(document.getElementById('smith')!);
const datasetNo = chart.addS1P([{ freq: 1e9, point: [0.5, 0] }]);

if (datasetNo !== undefined) {
  chart.updateS1P(datasetNo, [{ freq: 2e9, point: [0.25, -0.1] }]);
  chart.removeS1P(datasetNo);
}
chart.clearS1P();
chart.setUserActionHandler(null); // Unsubscribe from application callbacks.
chart.destroy();
```

- `addS1P(values)` returns the dataset index, or `undefined` for empty input.
- `updateS1P(index, values)` retains the dataset's color and markers. Markers snap
  to the nearest new reflection coefficient; ties select the earlier sample.
  Empty input removes the dataset.
- `removeS1P(index)` and `updateS1P(index, values)` return `false` for missing indices.
- Dataset numbers are **current array indices**, not permanent IDs. Removing one
  shifts subsequent indices; marker events report the updated index.
- Input is copied and validated before changing the chart. Frequencies must be
  finite and non-negative; reflection coordinates must be finite pairs.
- `Datasets` returns an array copy. Its entries still expose the legacy marker API.
- Reference impedance must be positive and finite. Physical readouts use that value.

## Grid layers

Resistance and reactance are visible initially. Admittance, constant-Q, and
constant-VSWR layers start hidden. Impedance and admittance each consist of two
independent layers:

```ts
chart.ConstResistance.hide();
chart.ConstReactance.hide();
chart.ConstConductance.show();
chart.ConstSusceptance.show();

chart.ConstConductance.hideMinor();
chart.ConstSusceptance.TextColor = '#2a7f62';
chart.ConstSusceptance.TextFontSize = '8';

chart.ConstSwrCircles.append(4);
chart.ConstSwrCircles.show();
chart.ConstQCircles.append(3);
chart.ConstQCircles.show();
```

| Layers                                                                      | Available controls                                                                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ConstResistance`, `ConstReactance`, `ConstConductance`, `ConstSusceptance` | `show()`, `hide()`, `visibility(boolean)`, `showMinor()`, `hideMinor()`, `displayMinor(boolean)`, text styling properties. |
| `ConstQCircles`, `ConstSwrCircles`                                          | `show()`, `hide()`, `visibility(boolean)`, `append(value)`, `remove(value)`, `Stroke`, `StrokeWidth`.                      |

Grid strokes default to slate gray (`#64748b`), with 1 px major lines and 0.6 px
minor lines. Q and VSWR overlays use 1 px strokes. These stroke widths remain
constant during chart zoom. Adjust `MajorWidth`, `MinorWidth`, and `Stroke` on
the impedance/admittance layers, or `StrokeWidth` on the Q/VSWR overlays.

Use positive Q values and VSWR values greater than or equal to 1. Grid labels
represent normalized impedance or admittance; chart readouts use physical units.

## Cursor and marker events

Register one callback to receive cursor and marker updates. Calling
`setUserActionHandler` again replaces the previous callback.

```ts
import { SmithEventType } from 'smithkit';

chart.setUserActionHandler((event) => {
  const data = event.data;
  if (!data) {
    return;
  }

  if (event.type === SmithEventType.Cursor) {
    console.log('Cursor Γ:', data.reflectionCoefficient.toVector());
    console.log('Impedance in Ω:', data.impedance?.toVector());
    console.log('Admittance in mS:', data.admittance?.toVector());
  }

  if (event.type === SmithEventType.Marker && 'freq' in data) {
    console.log('Selected frequency in Hz:', data.freq);
    console.log('Dataset and marker indices:', data.datasetNo, data.markerNo);
  }
});
```

Both event payloads include `reflectionCoefficient`, `impedance`, `admittance`,
`swr`, `returnLoss`, `mismatchLoss`, and `Q`. Loss values are in dB. Impedance,
admittance, or Q can be `undefined` at singular points; some other quantities
can be infinite. Loss and VSWR readouts assume passive loads (`|Γ| ≤ 1`).

Leaving the chart or starting a marker drag emits a `Cursor` event with
`data: undefined`, allowing consumers
to hide cursor indicators. `chart.CursorData` retains the last position.

`MarkerDragStart` fires when a marker is grabbed, before it moves; `MarkerDragEnd`
fires on release or when a dragged marker/dataset is removed. Both use the same
payload as `Marker`. Destroying the chart suppresses further application callbacks.

Cursor payloads also include `dBS`, `rflCoeffP`, `rflCoeffEOrI`, and `transmCoeffP`.
Marker payloads add `freq`, `datasetNo`, and `markerNo`. Dataset and marker indices
are zero-based, while marker labels on the chart start at 1.

Read the current values directly with `chart.CursorData` or
`chart.getMarkerData(datasetIndex, markerIndex)`. To add another marker to an
existing dataset, call `chart.Datasets[datasetIndex].addMarker()`.

## Touchstone import

`parseTouchstone(text)` returns `{ values, referenceImpedance }`. It accepts
one-port Touchstone 1.x S-parameter data, converts RI/MA/DB values to Cartesian Γ,
and converts Hz/kHz/MHz/GHz frequencies to Hz. It handles comments, tabs, and
blank lines, and throws an `Error` for invalid or unsupported input.

Use the file's reference impedance when constructing the chart:

```ts
import { Smith, parseTouchstone } from 'smithkit';

async function showMeasurement(file: File): Promise<Smith> {
  const { values, referenceImpedance } = parseTouchstone(await file.text());
  const chart = new Smith(referenceImpedance);
  chart.draw('#smith');
  chart.addS1P(values);
  return chart;
}
```

If the option line is omitted, Touchstone defaults apply: GHz, S parameters,
MA representation, and 50 Ω. When adding files to an existing chart, their
reference impedances must match the chart's Z₀. Automatic renormalization,
multiport files, and Touchstone 2.x are not supported.

## Calculations without rendering

`Complex` represents complex numbers. `SmithConstantCircle` provides normalized
impedance/admittance conversions, RF metrics, and circle geometry.

```ts
import { Complex, SmithConstantCircle } from 'smithkit';

const rf = new SmithConstantCircle(50);
const load = Complex.from(50, 25); // Physical impedance in ohms.
const gamma = rf.impedanceToRflCoeff(rf.normalize(load));

if (gamma) {
  console.log(gamma.toVector()); // [0.0588..., 0.2353...]
  console.log(rf.rflCoeffToSwr(gamma));
  console.log(rf.rflCoeffToReturnLoss(gamma));
}
```

| API                                                                                          | Purpose                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Complex.from(re, im?)`, `Complex.from([re, im])`                                            | Construct a Cartesian complex value.                                            |
| `Complex.from({ r, phi })`                                                                   | Construct a polar value; `phi` is in radians.                                   |
| `add`, `sub`, `mul`, `div`, `inv`, `conj`, `neg`                                             | Return new complex values.                                                      |
| `abs`, `arg`, `toVector`, `toPolar`, `toString`                                              | Inspect magnitude, phase, Cartesian or polar coordinates, and formatted values. |
| `rf.normalize(z)`, `rf.denormalize(z)`                                                       | Convert impedance between ohms and values normalized to Z₀.                     |
| `rf.impedanceToRflCoeff(z)`, `rf.rflCoeffToImpedance(gamma)`                                 | Convert normalized impedance to/from Γ.                                         |
| `rf.admittanceToRflCoeff(y)`, `rf.rflCoeffToAdmittance(gamma)`                               | Convert normalized admittance to/from Γ.                                        |
| `rf.rflCoeffToSwr`, `rf.rflCoeffToReturnLoss`, `rf.rflCoeffToMismatchLoss`, `rf.rflCoeffToQ` | Calculate RF quantities from a `Complex` reflection coefficient.                |
| `chart.calcImpedance(gamma)`, `chart.calcAdmittance(gamma)`                                  | Calculate physical impedance in Ω and admittance in mS using the chart's Z₀.    |
| `chart.formatComplex`, `chart.formatComplexPolar`, `chart.formatNumber`                      | Format values for application readouts.                                         |
| `chart.getReactanceComponentValue(gamma, frequencyHz)`                                       | Format the equivalent reactive component value in F or H.                       |

Normalized impedance is `Z / Z₀`; normalized admittance is `Y × Z₀` with Y in
siemens. Conversion methods return `undefined` where their result is singular.

## Complex hyperbolic and reciprocal functions

The static and instance APIs support `sinh`, `cosh`, `tanh`, `coth`, `sech`, `csch`,
`sec`, `csc`, and the principal inverses `asinh`, `acosh`, `atanh`, `acoth`, `asech`,
`acsch`. Each returns a new `Complex` value; arguments are in radians.

```ts
const z = Complex.from(0.5, 0.25);
const hyperbolicSine = z.sinh(); // Also: Complex.sinh(z).
const restored = hyperbolicSine.asinh();
const reciprocalCosine = z.sec();
```

The inverse functions use the [principal branches](https://dlmf.nist.gov/4.37):
`asinh` has imaginary part in [−π/2, π/2]; `acosh` has non-negative real part
and imaginary part in [−π, π]; `atanh` has imaginary part in [−π/2, π/2].
`acoth(z)`, `asech(z)`, and `acsch(z)` are the corresponding principal inverses
at `1/z`. Signed zeros select the side of a branch cut, including when taking
the reciprocal. For example, `Complex.from(2, +0).atanh()` has imaginary part
+π/2, while `Complex.from(2, -0).atanh()` has imaginary part −π/2.

For these fourteen functions:

- Finite inputs use scaled formulas to limit overflow and cancellation. Results
  beyond JavaScript's floating-point range may still overflow or underflow.
- An input with a `NaN` or infinite component returns `Complex.from(NaN, NaN)`.
- At zero, `coth`, `csch`, `csc`, `asech`, and `acsch` return two `NaN` components;
  there is no finite value to return. `atanh(±1 ± 0i)` returns a signed infinite
  real component and preserves the imaginary zero.
- `acoth(0 + 0i)` takes the upper-side boundary value −iπ/2;
  `acoth(0 - 0i)` takes +iπ/2.
- No tolerance is used to snap arguments to a pole. A floating-point approximation
  of a trigonometric pole can therefore produce a large finite value.

## TypeScript exports

The package exports `Smith`, `SmithScales`, `SmithEventType`, `Complex`, `SmithConstantCircle`,
and `parseTouchstone`, together with these types:

```ts
import type {
  S1P,
  S1PEntry,
  SmithEvent,
  SmithCursorEvent,
  SmithMarkerEvent,
  TouchstoneData,
} from 'smithkit';
```

## Current limitations

- The package is ESM-only; it does not provide a CommonJS or UMD build.
- Dense labels may require zooming on small screens.

## Development and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for local demo setup, architecture, testing,
and packaging, and [docs/deployment.md](docs/deployment.md) for demo hosting.

Released under the [MIT license](LICENSE).
