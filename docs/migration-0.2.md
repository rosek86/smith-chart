# Migrating from 0.1.x to 0.2.0

Version 0.2.0 organizes stateless library operations as static class
methods. Import each class from `smithkit`; no instance is needed. Standalone
function exports are removed rather than retained as compatibility aliases.

| 0.1.x export             | 0.2.0 method                            |
| ------------------------ | --------------------------------------- |
| `parseTouchstone`        | `Touchstone.parse`                      |
| `readReflection`         | `RfCalculations.readReflection`         |
| `reflectionToImpedance`  | `RfCalculations.reflectionToImpedance`  |
| `impedanceToReflection`  | `RfCalculations.impedanceToReflection`  |
| `reflectionToAdmittance` | `RfCalculations.reflectionToAdmittance` |
| `admittanceToReflection` | `RfCalculations.admittanceToReflection` |
| `renormalizeReflection`  | `RfCalculations.renormalizeReflection`  |
| `renormalizeSamples`     | `RfCalculations.renormalizeSamples`     |
| `reactanceToComponent`   | `RfCalculations.reactanceToComponent`   |
| `compareMarkerReadings`  | `MarkerMeasurements.compare`            |
| `formatNumber`           | `SmithFormatter.number`                 |
| `formatComplex`          | `SmithFormatter.complex`                |
| `formatComplexPolar`     | `SmithFormatter.polar`                  |

Arguments, defaults, return types, units, and validation behavior remain unchanged.
`Smith`, `SmithScales`, `Complex`, chart methods/events, and exported type names
remain available. Stateless classes have private constructors. Calculations and
parsing still work without a browser or DOM.

```ts
import { Complex, RfCalculations, SmithFormatter, Touchstone } from 'smithkit';

const parsed = Touchstone.parse('# GHz S RI R 50\n1 0.5 0');
const reading = RfCalculations.readReflection(
  Complex.from(...parsed.samples[0].reflectionCoefficient),
  parsed.referenceImpedanceOhms,
);
console.log(SmithFormatter.complex(reading.impedanceOhms!, 'Ω'));
```

Internal files are organized by responsibility, with class modules named after
the class. Use the package root for imports; internal paths are not public entry points.
