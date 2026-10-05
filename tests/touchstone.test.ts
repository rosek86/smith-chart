import { expect, it } from 'vitest';
import { parseTouchstone } from '../src/io/touchstone';

it('reads RI, frequency units, tabs, CRLF, BOM and inline comments', () => {
  expect(parseTouchstone('\uFEFF! S11\r\n# MHz S RI R 75\r\n100\t0.5\t-0.25 ! sample')).toEqual({
    referenceImpedanceOhms: 75,
    samples: [{ frequencyHz: 1e8, reflectionCoefficient: [0.5, -0.25] }],
  });
});
it('uses Touchstone defaults (GHz, S, MA, 50 Ω)', () => {
  const data = parseTouchstone('1 0.5 90');
  expect(data.referenceImpedanceOhms).toBe(50);
  expect(data.samples[0].frequencyHz).toBe(1e9);
  expect(data.samples[0].reflectionCoefficient[0]).toBeCloseTo(0);
  expect(data.samples[0].reflectionCoefficient[1]).toBeCloseTo(0.5);
});
it('converts decibel magnitudes and degree phases', () => {
  const data = parseTouchstone('# kHz S DB R 50\n1000 -6.020599913279624 -90');
  expect(data.samples[0].frequencyHz).toBe(1e6);
  expect(data.samples[0].reflectionCoefficient[0]).toBeCloseTo(0);
  expect(data.samples[0].reflectionCoefficient[1]).toBeCloseTo(-0.5);
});
it.each([
  '',
  '1 NaN 0',
  '-1 0 0',
  '# Hz Z RI R 50\n1 0 0',
  '# Hz S RI R 0\n1 0 0',
  '[Version] 2.0',
  '1 0 0 0 0',
  '# Hz S MA R 50\n1 -1 0',
  '1 0 0\n# Hz S RI R 50',
])('rejects unsupported or invalid data: %s', (text) => {
  expect(() => parseTouchstone(text)).toThrow();
});
