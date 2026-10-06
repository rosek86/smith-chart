import { expect, it } from 'vitest';
import { Complex, SmithFormatter, RfCalculations } from '../src';

it('returns physical L/C data without a chart or DOM', () => {
  expect(typeof document).toBe('undefined');
  const inductor = RfCalculations.reactanceToComponent(2 * Math.PI * 1e9 * 10e-9, 1e9);
  expect(inductor?.kind).toBe('inductor');
  if (inductor?.kind === 'inductor') {
    expect(inductor.inductanceHenries / 10e-9).toBeCloseTo(1, 12);
  }
  const capacitor = RfCalculations.reactanceToComponent(-1 / (2 * Math.PI * 1e9 * 2e-12), 1e9);
  expect(capacitor?.kind).toBe('capacitor');
  if (capacitor?.kind === 'capacitor') {
    expect(capacitor.capacitanceFarads / 2e-12).toBeCloseTo(1, 12);
  }
});

it('defines zero, invalid, and unrepresentable component inputs', () => {
  expect(RfCalculations.reactanceToComponent(0, 1e9)).toBeUndefined();
  expect(RfCalculations.reactanceToComponent(50, 0)).toBeUndefined();
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(() => RfCalculations.reactanceToComponent(value, 1e9)).toThrow(RangeError);
    expect(() => RfCalculations.reactanceToComponent(50, value)).toThrow(RangeError);
  }
  expect(() => RfCalculations.reactanceToComponent(50, -1)).toThrow(RangeError);
  expect(RfCalculations.reactanceToComponent(Number.MAX_VALUE, Number.MIN_VALUE)).toBeUndefined();
  expect(RfCalculations.reactanceToComponent(Number.MIN_VALUE, Number.MAX_VALUE)).toBeUndefined();
  const finite = RfCalculations.reactanceToComponent(-Number.MAX_VALUE, Number.MIN_VALUE);
  expect(finite?.kind === 'capacitor' && Number.isFinite(finite.capacitanceFarads)).toBe(true);
});

it('formats quantities without a chart and preserves SI spacing and angular units', () => {
  expect(SmithFormatter.number(1e9) + 'Hz').toBe('1 GHz');
  expect(SmithFormatter.number(-2e-6) + 'F').toBe('−2 µF');
  expect(SmithFormatter.number(0) + 'Ω').toBe('0 Ω');
  expect(SmithFormatter.complex(Complex.from(1, -2), 'Ω', 1)).toBe('1.0 - 2.0i [Ω]');
  expect(SmithFormatter.polar(Complex.i, '', 1)).toBe('1.0  ∠90.0°');
  expect(() => SmithFormatter.complex(Complex.one(), '', -1)).toThrow(RangeError);
});
