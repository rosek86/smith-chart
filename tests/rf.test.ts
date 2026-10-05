import { expect, it } from 'vitest';
import {
  Complex,
  readReflection,
  reflectionToImpedance,
  reflectionToAdmittance,
  impedanceToReflection,
  admittanceToReflection,
} from '../src';

it('uses physical ohms and siemens consistently for non-default reference impedances', () => {
  const gamma = Complex.from(0, 0.5);
  const reading = readReflection(gamma, 75);
  expect(reading.impedanceOhms?.re).toBeCloseTo(45);
  expect(reading.impedanceOhms?.im).toBeCloseTo(60);
  expect(reading.admittanceSiemens?.re).toBeCloseTo(0.008);
  expect(reading.admittanceSiemens?.im).toBeCloseTo(-0.010666666666666666);
  expect(impedanceToReflection(reading.impedanceOhms!, 75)?.re).toBeCloseTo(0);
  expect(impedanceToReflection(reading.impedanceOhms!, 75)?.im).toBeCloseTo(0.5);
  expect(admittanceToReflection(reading.admittanceSiemens!, 75)?.re).toBeCloseTo(0);
  expect(admittanceToReflection(reading.admittanceSiemens!, 75)?.im).toBeCloseTo(0.5);
  expect(reading.phaseDegrees).toBe(90);
  expect(reading.vswr).toBe(3);
  expect(reading.returnLossDb).toBeCloseTo(6.020599913);
  expect(reading.reflectionLossDb).toBeCloseTo(1.249387366);
  expect(reading.powerTransmissionCoefficient).toBe(0.75);
  expect(reading.q).toBeCloseTo(4 / 3);
});

it('distinguishes perfect match, open, short, and active loads', () => {
  const match = readReflection(Complex.zero());
  expect(match.impedanceOhms?.re).toBe(50);
  expect(match.admittanceSiemens?.re).toBe(0.02);
  expect(match.phaseDegrees).toBeUndefined();
  expect(match.returnLossDb).toBe(Infinity);
  expect(match.vswr).toBe(1);
  expect(match.q).toBe(0);
  const open = readReflection(Complex.one());
  expect(open.impedanceOhms).toBeUndefined();
  expect(open.admittanceSiemens?.abs()).toBe(0);
  expect(open.q).toBeUndefined();
  expect(open.vswr).toBe(Infinity);
  expect(open.reflectionLossDb).toBe(Infinity);
  const short = readReflection(Complex.from(-1));
  expect(short.impedanceOhms?.abs()).toBe(0);
  expect(short.admittanceSiemens).toBeUndefined();
  expect(short.q).toBeUndefined();
  expect(readReflection(Complex.from(0, 1)).q).toBe(Infinity);
  const active = readReflection(Complex.from(2));
  expect(active.vswr).toBeUndefined();
  expect(active.reflectionLossDb).toBeUndefined();
  expect(active.powerTransmissionCoefficient).toBeUndefined();
  expect(active.impedanceOhms?.re).toBe(-150);
  expect(active.returnLossDb).toBeCloseTo(-6.020599913);
});

it('keeps finite readings near singularities and rejects invalid inputs', () => {
  expect(reflectionToImpedance(Complex.from(1 - 1e-7))?.re).toBeGreaterThan(1e8);
  expect(reflectionToAdmittance(Complex.from(-1 + 1e-7))?.re).toBeGreaterThan(1e5);
  expect(impedanceToReflection(Complex.from(-50))).toBeUndefined();
  expect(admittanceToReflection(Complex.from(-0.02))).toBeUndefined();
  for (const reference of [0, -1, NaN, Infinity]) {
    expect(() => readReflection(Complex.zero(), reference)).toThrow(RangeError);
  }
  expect(() => readReflection(Complex.from(NaN))).toThrow(RangeError);
  expect(() => readReflection(Complex.from(Infinity))).toThrow(RangeError);
});
