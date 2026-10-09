import { expect, it } from 'vitest';
import { RfCalculations, Touchstone } from '../src';

it('round-trips a renormalized packed reflection trace into a 75-ohm s1p file', () => {
  const parsed = Touchstone.parse('# Hz S RI R 50\n1 0 0\n2 1 0\n3 -1 0', { output: 'packed' });
  const before = parsed.samples.slice();
  const converted = RfCalculations.renormalizeSamples(parsed.samples, 50, 75);
  expect(converted).toEqual(new Float64Array([1, -0.2, 0, 2, 1, 0, 3, -1, 0]));
  expect(parsed.samples).toEqual(before);
  const result = Touchstone.parse(Touchstone.stringify(converted, { referenceImpedanceOhms: 75 }), {
    output: 'packed',
  });
  expect(result.referenceImpedanceOhms).toBe(75);
  expect(result.samples).toEqual(converted);
  const objects = Touchstone.parse(Touchstone.stringify(before)).samples;
  expect([...converted]).toEqual(
    RfCalculations.renormalizeSamples(objects, 50, 75).flatMap((s) => [
      s.frequencyHz,
      ...s.reflectionCoefficient,
    ]),
  );
});

it.each(
  [
    [1, 0],
    [-1, 0, 0],
    [1, NaN, 0],
    [1, 5, 0],
  ].map((values) => ({ values })),
)('rejects invalid or singular packed renormalization without mutation: $values', ({ values }) => {
  const input = new Float64Array(values);
  expect(() => RfCalculations.renormalizeSamples(input, 50, 75)).toThrow();
  expect([...input]).toEqual(values);
});

it('copies empty and identity packed input and validates references', () => {
  const input = new Float64Array([0, 0.5, -0.25]);
  const result = RfCalculations.renormalizeSamples(input, 50, 50);
  expect(result).toEqual(input);
  expect(result).not.toBe(input);
  expect(RfCalculations.renormalizeSamples(new Float64Array(), 50, 75)).toHaveLength(0);
  expect(() => RfCalculations.renormalizeSamples(input, 0, 50)).toThrow(RangeError);
});
