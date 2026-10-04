import { expect, it } from 'vitest';
import { Complex } from '../src/complex/Complex';
import { radialScales } from '../src/scales/radialScales';

it('maps passive-load RF values back to their radial positions', () => {
  for (const gamma of [
    Complex.zero(),
    Complex.from(0.3, 0.4),
    Complex.from(-0.6, 0.8),
    Complex.one(),
  ]) {
    const scales = radialScales();
    for (const scale of scales.slice(0, 9)) {
      expect(scale.position(scale.read(gamma)), scale.id).toBeCloseTo(
        Math.hypot(gamma.re, gamma.im),
        12,
      );
    }
    const voltage = scales[9];
    expect(voltage.position(voltage.read(gamma))).toBeCloseTo(
      Math.hypot(1 + gamma.re, gamma.im) / 2,
      12,
    );
  }
});

it('reports the known RF quantities for a reflection coefficient of 0.5', () => {
  const gamma = Complex.from(0.5);
  const values = Object.fromEntries(radialScales().map((scale) => [scale.id, scale.read(gamma)]));
  expect(values.vswr).toBe(3);
  expect(values['vswr-db']).toBeCloseTo(9.5424250944);
  expect(values['return-loss']).toBeCloseTo(6.0205999133);
  expect(values['mismatch-loss']).toBeCloseTo(1.2493873661);
  expect(values['reflected-power']).toBe(0.25);
  expect(values['transmitted-power']).toBe(0.75);
  expect(values['standing-wave-loss']).toBeCloseTo(5 / 3);
  expect(values['standing-wave-peak']).toBeCloseTo(Math.sqrt(3));
  expect(values['reflection-coefficient']).toBe(0.5);
  expect(values['voltage-transmission']).toBe(1.5);
});
