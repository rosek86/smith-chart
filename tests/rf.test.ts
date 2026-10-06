import { expect, it } from 'vitest';
import { Complex, RfCalculations } from '../src';

it('uses physical ohms and siemens consistently for non-default reference impedances', () => {
  const gamma = Complex.from(0, 0.5);
  const reading = RfCalculations.readReflection(gamma, 75);
  expect(reading.impedanceOhms?.re).toBeCloseTo(45);
  expect(reading.impedanceOhms?.im).toBeCloseTo(60);
  expect(reading.admittanceSiemens?.re).toBeCloseTo(0.008);
  expect(reading.admittanceSiemens?.im).toBeCloseTo(-0.010666666666666666);
  expect(RfCalculations.impedanceToReflection(reading.impedanceOhms!, 75)?.re).toBeCloseTo(0);
  expect(RfCalculations.impedanceToReflection(reading.impedanceOhms!, 75)?.im).toBeCloseTo(0.5);
  expect(RfCalculations.admittanceToReflection(reading.admittanceSiemens!, 75)?.re).toBeCloseTo(0);
  expect(RfCalculations.admittanceToReflection(reading.admittanceSiemens!, 75)?.im).toBeCloseTo(
    0.5,
  );
  expect(reading.phaseDegrees).toBe(90);
  expect(reading.vswr).toBe(3);
  expect(reading.returnLossDb).toBeCloseTo(6.020599913);
  expect(reading.reflectionLossDb).toBeCloseTo(1.249387366);
  expect(reading.powerTransmissionCoefficient).toBe(0.75);
  expect(reading.q).toBeCloseTo(4 / 3);
});

it('distinguishes perfect match, open, short, and active loads', () => {
  const match = RfCalculations.readReflection(Complex.zero());
  expect(match.impedanceOhms?.re).toBe(50);
  expect(match.admittanceSiemens?.re).toBe(0.02);
  expect(match.phaseDegrees).toBeUndefined();
  expect(match.returnLossDb).toBe(Infinity);
  expect(match.vswr).toBe(1);
  expect(match.q).toBe(0);
  const open = RfCalculations.readReflection(Complex.one());
  expect(open.impedanceOhms).toBeUndefined();
  expect(open.admittanceSiemens?.abs()).toBe(0);
  expect(open.q).toBeUndefined();
  expect(open.vswr).toBe(Infinity);
  expect(open.reflectionLossDb).toBe(Infinity);
  const short = RfCalculations.readReflection(Complex.from(-1));
  expect(short.impedanceOhms?.abs()).toBe(0);
  expect(short.admittanceSiemens).toBeUndefined();
  expect(short.q).toBeUndefined();
  expect(RfCalculations.readReflection(Complex.from(0, 1)).q).toBe(Infinity);
  const active = RfCalculations.readReflection(Complex.from(2));
  expect(active.vswr).toBeUndefined();
  expect(active.reflectionLossDb).toBeUndefined();
  expect(active.powerTransmissionCoefficient).toBeUndefined();
  expect(active.impedanceOhms?.re).toBe(-150);
  expect(active.returnLossDb).toBeCloseTo(-6.020599913);
});

it('keeps finite readings near singularities and rejects invalid inputs', () => {
  expect(RfCalculations.reflectionToImpedance(Complex.from(1 - 1e-7))?.re).toBeGreaterThan(1e8);
  expect(RfCalculations.reflectionToAdmittance(Complex.from(-1 + 1e-7))?.re).toBeGreaterThan(1e5);
  expect(RfCalculations.impedanceToReflection(Complex.from(-50))).toBeUndefined();
  expect(RfCalculations.admittanceToReflection(Complex.from(-0.02))).toBeUndefined();
  for (const reference of [0, -1, NaN, Infinity]) {
    expect(() => RfCalculations.readReflection(Complex.zero(), reference)).toThrow(RangeError);
  }
  expect(() => RfCalculations.readReflection(Complex.from(NaN))).toThrow(RangeError);
  expect(() => RfCalculations.readReflection(Complex.from(Infinity))).toThrow(RangeError);
});

it('does not overflow squared denominators for large finite loads', () => {
  const gamma = RfCalculations.impedanceToReflection(Complex.from(1e200, 1e200))!;
  expect(gamma.re).toBe(1);
  expect(gamma.im / 5e-199).toBeCloseTo(1, 12);
  const active = RfCalculations.reflectionToImpedance(Complex.from(1e200, 1e200))!;
  expect(active.re).toBe(-50);
  expect(active.im / 5e-199).toBeCloseTo(1, 12);
});

it('retains finite reactive components when squared denominators would underflow', () => {
  const open = RfCalculations.reflectionToImpedance(Complex.from(1, 1e-200))!;
  expect(open.re).toBe(-50);
  expect(open.im / 1e202).toBeCloseTo(1, 12);
  const short = RfCalculations.reflectionToAdmittance(Complex.from(-1, 1e-200))!;
  expect(short.re).toBe(-0.02);
  expect(short.im / -4e198).toBeCloseTo(1, 12);
});

it('preserves tiny reflection loss and reciprocal Z/Y away from singularities', () => {
  expect(
    RfCalculations.readReflection(Complex.from(1e-10)).reflectionLossDb! / 4.342944819032518e-20,
  ).toBeCloseTo(1, 12);
  for (const reference of [1, 50, 75, 1e4]) {
    for (const gamma of [
      Complex.from(0.99, 0.01),
      Complex.from(-0.99, 0.01),
      Complex.from(0.3, -0.7),
    ]) {
      const z = RfCalculations.reflectionToImpedance(gamma, reference)!;
      const y = RfCalculations.reflectionToAdmittance(gamma, reference)!;
      expect(z.mul(y).re).toBeCloseTo(1, 12);
      expect(z.mul(y).im).toBeCloseTo(0, 12);
    }
  }
});
