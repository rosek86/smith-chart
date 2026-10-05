import { expect, it } from 'vitest';
import { Complex, compareMarkerReadings } from '../src';

const reading = (
  degrees: number,
  frequencyHz = 1e9,
  impedanceOhms: Complex | undefined = Complex.from(50),
) => ({
  frequencyHz,
  impedanceOhms,
  reflectionCoefficient: Complex.from({ r: 0.5, phi: (degrees * Math.PI) / 180 }),
});

it('compares B minus A and wraps phase differences across ±180 degrees', () => {
  const a = reading(179, 1e9, Complex.from(50, 20));
  const b = reading(-179, 1.5e9, Complex.from(75, -10));
  const comparison = compareMarkerReadings(a, b);
  expect(comparison.frequencyDeltaHz).toBe(5e8);
  expect(comparison.impedanceDeltaOhms?.toVector()).toEqual([25, -30]);
  expect(comparison.phaseDeltaDegrees).toBeCloseTo(2);
  expect(compareMarkerReadings(b, a).phaseDeltaDegrees).toBeCloseTo(-2);
  expect(compareMarkerReadings(reading(0), reading(180)).phaseDeltaDegrees).toBe(-180);
  expect(compareMarkerReadings(a, a).phaseDeltaDegrees).toBe(0);
});

it('keeps singular readings undefined without losing the frequency difference', () => {
  const a = { ...reading(0), reflectionCoefficient: Complex.zero(), impedanceOhms: undefined };
  const comparison = compareMarkerReadings(a, reading(90, 2e9));
  expect(comparison.frequencyDeltaHz).toBe(1e9);
  expect(comparison.impedanceDeltaOhms).toBeUndefined();
  expect(comparison.phaseDeltaDegrees).toBeUndefined();
  const invalid = {
    ...reading(0),
    reflectionCoefficient: Complex.from(NaN),
    impedanceOhms: Complex.from(Infinity),
  };
  expect(compareMarkerReadings(invalid, a).phaseDeltaDegrees).toBeUndefined();
  expect(compareMarkerReadings(invalid, a).impedanceDeltaOhms).toBeUndefined();
  expect(() => compareMarkerReadings(reading(0, NaN), a)).toThrow(RangeError);
});
