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
- Ten labeled radial parameter scales below the chart.
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
npm install /path/to/smith-chart/smithkit-1.0.0.tgz
```

These steps install a local build and do not depend on an npm registry release.
Building the package requires Node.js 24 or later. Applications using the chart
need a browser with SVG and ES2022 support and an ESM-compatible build tool.
D3 and its type declarations are installed as package dependencies.

## Quick start

Give the chart container an explicit size. No library stylesheet is required.

```html
<div id="smith" style="width: 100%; max-width: 700px; aspect-ratio: 500 / 650;"></div>
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
not impedance. Frequencies are in Hz. A marker is added to each nonempty dataset;
drag it along the trace to select a sample. Scroll to zoom, drag the chart to pan,
and call `chart.resetView()` to restore the initial view.

The constructor creates SVG elements, so instantiate `Smith` only in a browser
(for example, inside your framework's client-side mount hook). Importing the
package and using its calculation or parsing helpers does not require a DOM.

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

Use positive Q values and VSWR values greater than or equal to 1. Grid labels
represent normalized impedance or admittance; chart readouts use physical units.

## Cursor and marker events

Register one callback to receive cursor and marker updates. Calling
`setUserActionHandler` again replaces the previous callback.

```ts
import { SmithEventType } from 'smithkit';

chart.setUserActionHandler((event) => {
  const data = event.data;
  if (!data) return;

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

## TypeScript exports

The package exports `Smith`, `SmithEventType`, `Complex`, `SmithConstantCircle`,
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
- Chart destruction, dataset removal, and data replacement APIs are not available yet.
- `Complex` still contains unimplemented methods that throw an `Error` naming the operation:
  `sinh`, `asinh`, `cosh`, `acosh`, `tanh`, `atanh`, `coth`, `acoth`, `sec`,
  `sech`, `asech`, `csc`, `csch`, and `acsch`. Both static and instance calls throw;
  these operations are not available for calculations yet.
- Dense labels may require zooming on small screens.

## Development and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for local demo setup, architecture, testing,
and packaging, and [docs/deployment.md](docs/deployment.md) for demo hosting.

Released under the [MIT license](LICENSE).
