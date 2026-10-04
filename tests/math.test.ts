import { describe, expect, it } from 'vitest';
import { Complex } from '../src/complex/Complex';
import { SmithConstantCircle } from '../src/SmithConstantCircle';
import { radialScales } from '../src/scales/RadiallyScaledParams';
import { SmithScaler } from '../src/draw/SmithScaler';
import { scaleLinear } from 'd3';

const calcs = new SmithConstantCircle();

describe('Smith chart coordinates', () => {
  it('preserves Cartesian and polar construction through the public overloads', () => {
    expect(Complex.from(3).toVector()).toEqual([3, 0]);
    expect(Complex.from(3, -4).toVector()).toEqual([3, -4]);
    expect(Complex.from([3, -4]).toVector()).toEqual([3, -4]);
    expect(Complex.from({ re: 3, im: -4 }).toVector()).toEqual([3, -4]);
    const polar = Complex.from({ r: 2, phi: Math.PI / 2 });
    expect(polar.re).toBeCloseTo(0);
    expect(polar.im).toBeCloseTo(2);
    for (const args of [[], [null], [{}], [1, 'invalid']]) {
      expect(() => Reflect.apply(Complex.from, Complex, args)).toThrow('invalid arguments');
    }
  });
  it('places matched, shorted, and purely reactive loads', () => {
    expect(calcs.impedanceToRflCoeff(Complex.from(1))?.toVector()).toEqual([0, 0]);
    expect(calcs.impedanceToRflCoeff(Complex.zero())?.toVector()).toEqual([-1, 0]);
    expect(calcs.impedanceToRflCoeff(Complex.i)?.toVector()).toEqual([0, 1]);
    expect(calcs.rflCoeffToImpedance(Complex.one())).toBeUndefined();
  });
  it('round-trips impedance and admittance through Γ', () => {
    for (const z of [Complex.from(0.5, 1), Complex.from(2, -3), Complex.from(50, 0)]) {
      const gamma = calcs.impedanceToRflCoeff(z)!;
      const restored = calcs.rflCoeffToImpedance(gamma)!;
      expect(restored.re).toBeCloseTo(z.re, 10);
      expect(restored.im).toBeCloseTo(z.im, 10);
      const y = calcs.rflCoeffToAdmittance(gamma)!;
      expect(y.re).toBeCloseTo(z.inv().re, 10);
      expect(y.im).toBeCloseTo(z.inv().im, 10);
    }
  });
  it('maps and inverts SVG coordinates including the inverted Y axis', () => {
    const scaler = new SmithScaler(
      scaleLinear([-1, 1], [0, 500]),
      scaleLinear([1, -1], [0, 500]),
      scaleLinear([0, 1], [0, 250]),
    );
    expect(scaler.point([0, 1])).toEqual([250, 0]);
    expect(scaler.pointInvert(scaler.point([0.5, -0.5]))).toEqual([0.5, -0.5]);
  });
  it('computes RF quantities at a matched load and at |Γ| = 0.5', () => {
    expect(calcs.rflCoeffToSwr(Complex.zero())).toBe(1);
    expect(calcs.rflCoeffToReturnLoss(Complex.zero())).toBe(Infinity);
    expect(calcs.rflCoeffToMismatchLoss(Complex.zero())).toBeCloseTo(0);
    expect(calcs.rflCoeffToSwr(Complex.from(0.5))).toBe(3);
    expect(calcs.rflCoeffToReturnLoss(Complex.from(0.5))).toBeCloseTo(6.0206);
  });
  it('keeps all radial labels finite, ordered and on the scale', () => {
    for (const scale of radialScales()) {
      const positions = scale.values.map(scale.position);
      expect(positions[0], scale.title).toBe(0);
      expect(positions.at(-1), scale.title).toBe(1);
      expect(
        positions.every((p) => Number.isFinite(p) && p >= 0 && p <= 1),
        scale.title,
      ).toBe(true);
      expect(positions, scale.title).toEqual([...positions].sort((a, b) => a - b));
    }
  });
});

describe('Frequency and wavelength conversion', () => {
  it('converts a known wavelength in meters to frequency in Hz', () => {
    expect(calcs.frequencyFromWaveLength(2)).toBe(149896229);
    expect(calcs.waveLengthFromFrequency(299792458)).toBe(1);
  });

  it.each([1e6, 1e9, 2.4e9, 10e9])('round-trips %d Hz through wavelength', (frequency) => {
    const restored = calcs.frequencyFromWaveLength(calcs.waveLengthFromFrequency(frequency));
    expect(restored / frequency).toBeCloseTo(1, 12);
  });
});
