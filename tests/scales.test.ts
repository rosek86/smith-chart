import { expect, it } from 'vitest';
import { Complex } from '../src/complex/Complex';
import { SmithConstantCircle } from '../src/SmithConstantCircle';
import { peripheralScales } from '../src/scales/peripheralScales';
import { radialScales } from '../src/scales/radialScales';

it('maps passive-load RF values back to their radial positions', () => {
  for (const gamma of [
    Complex.zero(),
    Complex.from(0.3, 0.4),
    Complex.from(-0.6, 0.8),
    Complex.one(),
  ]) {
    const scales = radialScales();
    for (const scale of scales.slice(0, 10)) {
      expect(scale.position(scale.read(gamma)), scale.id).toBeCloseTo(
        Math.hypot(gamma.re, gamma.im),
        12,
      );
    }
    const voltage = scales[10];
    expect(voltage.position(voltage.read(gamma))).toBeCloseTo(
      Math.hypot(1 + gamma.re, gamma.im) / 2,
      12,
    );
  }
});

it('distinguishes transmission magnitudes and one-way attenuation at physical limits', () => {
  const calcs = new SmithConstantCircle();
  expect(calcs.rflCoeffToAttenuation(Complex.from(0.1))).toBe(10);
  expect(calcs.attenuationToRflCoeff(10)).toBeCloseTo(0.1);
  expect(calcs.rflCoeffToAttenuation(Complex.zero())).toBe(Infinity);
  expect(calcs.rflCoeffToAttenuation(Complex.one())).toBeCloseTo(0);
  expect(calcs.attenuationToRflCoeff(Infinity)).toBe(0);
  for (const [gamma, voltage, current] of [
    [Complex.zero(), 1, 1],
    [Complex.one(), 2, 0],
    [Complex.from(-1), 0, 2],
    [Complex.from(0, 1), Math.SQRT2, Math.SQRT2],
  ] as const) {
    expect(calcs.rflCoeffToTransmCoeffEOrI(gamma)).toBeCloseTo(voltage);
    expect(calcs.rflCoeffToCurrentTransmission(gamma)).toBeCloseTo(current);
  }
});

it('calibrates peripheral rulers and projects transmission phase from the short-circuit origin', () => {
  const [transmission, reflection, load, generator] = peripheralScales();
  for (const [gamma, degrees, towardGenerator, towardLoad] of [
    [Complex.one(), 0, 0.25, 0.25],
    [Complex.from(0, 0.5), 90, 0.125, 0.375],
    [Complex.from(-1), 180, 0, 0],
    [Complex.from(0, -0.5), -90, 0.375, 0.125],
  ] as const) {
    expect(reflection.read(gamma)).toBeCloseTo(degrees);
    expect(generator.read(gamma)).toBeCloseTo(towardGenerator);
    expect(load.read(gamma)).toBeCloseTo(towardLoad);
  }
  expect(reflection.read(Complex.zero())).toBeNull();
  expect(generator.read(Complex.zero())).toBeNull();
  expect(load.read(Complex.zero())).toBeNull();
  expect(transmission.read(Complex.from(-1))).toBeNull();
  expect(transmission.read(Complex.zero())).toBe(0);
  const degrees = transmission.read(Complex.from(0, 0.5))!;
  expect(degrees).toBeCloseTo(26.565051177);
  expect(transmission.angle(degrees)).toBeCloseTo(53.130102354);
  expect(generator.angle(0.125)).toBe(90);
  expect(load.angle(0.375)).toBe(90);
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
  expect(values['current-transmission']).toBe(0.5);
  expect(values.attenuation).toBeCloseTo(3.0102999566);
});
