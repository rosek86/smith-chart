import { expect, it } from 'vitest';
import { Complex, RfCalculations } from '../src';

it('preserves known real and complex impedances under a new reference', () => {
  expect(RfCalculations.renormalizeReflection(Complex.zero(), 75, 50)!.re).toBeCloseTo(0.2, 14);
  expect(RfCalculations.renormalizeReflection(Complex.from(1 / 3), 50, 75)!.re).toBeCloseTo(
    1 / 7,
    14,
  );
  const gamma = RfCalculations.renormalizeReflection(Complex.from(0.2, 0.4), 50, 75)!;
  expect(gamma.re).toBeCloseTo(-1 / 29, 14);
  expect(gamma.im).toBeCloseTo(12 / 29, 14);
  const z = RfCalculations.reflectionToImpedance(gamma, 75)!;
  expect(z.re).toBeCloseTo(50, 12);
  expect(z.im).toBeCloseTo(50, 12);
});

it('preserves open/short, copies samples without sorting, and round-trips passive data', () => {
  for (const gamma of [Complex.one(), Complex.from(-1)]) {
    expect(RfCalculations.renormalizeReflection(gamma, 50, 75)!.toVector()).toEqual(
      gamma.toVector(),
    );
  }
  const samples: import('../src').TraceSamples = [
    { frequencyHz: 2, reflectionCoefficient: [0.99, 0.01] },
    { frequencyHz: 1, reflectionCoefficient: [-0.99, -0.01] },
    { frequencyHz: 1, reflectionCoefficient: [0, 0] },
  ];
  const before = JSON.stringify(samples);
  const converted = RfCalculations.renormalizeSamples(samples, 50, 75);
  const back = RfCalculations.renormalizeSamples(converted, 75, 50);
  expect(JSON.stringify(samples)).toBe(before);
  expect(converted.map((sample) => sample.frequencyHz)).toEqual([2, 1, 1]);
  back.forEach((sample, i) =>
    sample.reflectionCoefficient.forEach((value, j) =>
      expect(value).toBeCloseTo(samples[i].reflectionCoefficient[j], 13),
    ),
  );
  expect(converted[0]).not.toBe(samples[0]);
  expect(RfCalculations.renormalizeSamples(samples, 50, 50)[0].reflectionCoefficient).not.toBe(
    samples[0].reflectionCoefficient,
  );
});

it('rejects invalid references/data and detects a singular active-load conversion', () => {
  for (const invalid of [0, -1, NaN, Infinity]) {
    expect(() => RfCalculations.renormalizeReflection(Complex.zero(), invalid, 50)).toThrow(
      RangeError,
    );
    expect(() => RfCalculations.renormalizeSamples([], 50, invalid)).toThrow(RangeError);
  }
  expect(() => RfCalculations.renormalizeReflection(Complex.from(NaN), 50, 75)).toThrow(RangeError);
  expect(RfCalculations.renormalizeReflection(Complex.from(5), 50, 75)).toBeUndefined();
  expect(() =>
    RfCalculations.renormalizeSamples([{ frequencyHz: 1, reflectionCoefficient: [5, 0] }], 50, 75),
  ).toThrow(/sample 0/);
  expect(() =>
    RfCalculations.renormalizeSamples([{ frequencyHz: -1, reflectionCoefficient: [0, 0] }], 50, 75),
  ).toThrow(RangeError);
});

it('scales large finite references and coefficients without overflowing intermediate sums', () => {
  expect(RfCalculations.renormalizeReflection(Complex.zero(), 1e308, 5e307)!.re).toBeCloseTo(
    1 / 3,
    14,
  );
  const gamma = RfCalculations.renormalizeReflection(Complex.from(1e200, 1e200), 50, 75)!;
  expect(gamma.re).toBeCloseTo(-5, 12);
  expect(gamma.im / 1.2e-199).toBeCloseTo(1, 12);
});
