import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Complex } from '../src/complex/Complex';

const operations = [
  'sinh',
  'asinh',
  'cosh',
  'acosh',
  'tanh',
  'atanh',
  'coth',
  'acoth',
  'sec',
  'sech',
  'asech',
  'csc',
  'csch',
  'acsch',
] as const;
type Operation = (typeof operations)[number];
type Pair = [number, number];
const reference: { operation: Operation; input: Pair; expected: Pair }[] = JSON.parse(
  readFileSync(new URL('./fixtures/complex-reference.json', import.meta.url), 'utf8'),
);

function close(actual: number, expected: number): void {
  if (expected === 0) {
    expect(Math.abs(actual)).toBeLessThanOrEqual(1e-15);
  } else {
    expect(Math.abs((actual - expected) / expected)).toBeLessThanOrEqual(5e-13);
  }
}
function closeComplex(actual: Complex, expected: Pair): void {
  close(actual.re, expected[0]);
  close(actual.im, expected[1]);
}

describe('independent Python cmath reference values', () => {
  it.each(reference)('$operation($input)', ({ operation, input, expected }) => {
    const value = Complex.from(input);
    closeComplex(Complex[operation](value), expected);
    closeComplex(value[operation](), expected);
    expect(value.toVector()).toEqual(input);
  });
});

describe('principal branches and signed zeros', () => {
  it('selects either side of the acosh and atanh real-axis cuts', () => {
    for (const sign of [1, -1]) {
      const zero = sign * 0;
      closeComplex(Complex.from(-2, zero).acosh(), [Math.acosh(2), sign * Math.PI]);
      closeComplex(Complex.from(0.5, zero).acosh(), [0, sign * Math.acos(0.5)]);
      closeComplex(Complex.from(2, zero).atanh(), [Math.log(3) / 2, (sign * Math.PI) / 2]);
      closeComplex(Complex.from(-2, zero).atanh(), [-Math.log(3) / 2, (sign * Math.PI) / 2]);
      expect(Object.is(Complex.from(2, zero).acosh().im, zero)).toBe(true);
    }
  });
  it('selects either side of the asinh imaginary-axis cuts', () => {
    for (const realSign of [1, -1]) {
      for (const imagSign of [1, -1]) {
        const z = Complex.from(realSign * 0, imagSign * 2);
        closeComplex(z.asinh(), [realSign * Math.acosh(2), (imagSign * Math.PI) / 2]);
      }
    }
  });
  it('keeps reciprocal inverse branches consistent with 1/z', () => {
    closeComplex(Complex.from(2, 0).asech(), [0, -Math.PI / 3]);
    closeComplex(Complex.from(2, -0).asech(), [0, Math.PI / 3]);
    closeComplex(Complex.from(0.5, 0).acoth(), [Math.log(3) / 2, -Math.PI / 2]);
    closeComplex(Complex.from(0.5, -0).acoth(), [Math.log(3) / 2, Math.PI / 2]);
    closeComplex(Complex.from(0, 0.5).acsch(), [Math.acosh(2), -Math.PI / 2]);
    closeComplex(Complex.from(-0, 0.5).acsch(), [-Math.acosh(2), -Math.PI / 2]);
  });
  it('is continuous when approaching either side of a branch cut', () => {
    for (const sign of [1, -1]) {
      closeComplex(Complex.from(-2, sign * 1e-12).acosh(), [Math.acosh(2), sign * Math.PI]);
      closeComplex(Complex.from(2, sign * 1e-12).atanh(), [Math.log(3) / 2, (sign * Math.PI) / 2]);
    }
  });
});

describe('identities and exceptional values', () => {
  it.each([
    [0.2, 0.3],
    [-0.2, 0.3],
    [2, -3],
    [-2, -3],
  ] as Pair[])('round-trips principal inverses at (%s, %s)', (re, im) => {
    const z = Complex.from(re, im);
    for (const [inverse, forward] of [
      ['asinh', 'sinh'],
      ['acosh', 'cosh'],
      ['atanh', 'tanh'],
      ['acoth', 'coth'],
      ['asech', 'sech'],
      ['acsch', 'csch'],
    ] as const) {
      closeComplex(z[inverse]()[forward](), [re, im]);
    }
    for (const [direct, reciprocal] of [
      ['sinh', 'csch'],
      ['cosh', 'sech'],
      ['tanh', 'coth'],
      ['sin', 'csc'],
      ['cos', 'sec'],
    ] as const) {
      closeComplex(z[direct]().mul(z[reciprocal]()), [1, 0]);
    }
    closeComplex(z.cosh().mul(z.cosh()).sub(z.sinh().mul(z.sinh())), [1, 0]);
  });
  it('matches real functions and handles branch endpoints', () => {
    for (const x of [-10, -0.5, 0, 0.5, 10]) {
      closeComplex(Complex.from(x).sinh(), [Math.sinh(x), 0]);
      closeComplex(Complex.from(x).cosh(), [Math.cosh(x), 0]);
      closeComplex(Complex.from(x).tanh(), [Math.tanh(x), 0]);
      closeComplex(Complex.from(x).asinh(), [Math.asinh(x), 0]);
    }
    closeComplex(Complex.one().acosh(), [0, 0]);
    closeComplex(Complex.from(-1, -0).acosh(), [0, -Math.PI]);
    closeComplex(Complex.i.asinh(), [0, Math.PI / 2]);
    expect(Complex.one().atanh().toVector()).toEqual([Infinity, 0]);
    expect(Complex.from(-1).atanh().toVector()).toEqual([-Infinity, 0]);
    closeComplex(Complex.zero().acoth(), [0, -Math.PI / 2]);
  });
  it('returns NaN components at zero poles with no finite principal value', () => {
    for (const operation of ['coth', 'csch', 'csc', 'asech', 'acsch'] as const) {
      const result = Complex.zero()[operation]();
      expect(Number.isNaN(result.re) && Number.isNaN(result.im)).toBe(true);
    }
  });
  it.each(operations)('%s rejects non-finite components with NaN results', (operation) => {
    for (const input of [
      [NaN, 0],
      [0, NaN],
      [Infinity, 0],
      [0, -Infinity],
    ] as Pair[]) {
      const result = Complex.from(input)[operation]();
      expect(Number.isNaN(result.re) && Number.isNaN(result.im)).toBe(true);
    }
  });
  it('avoids spurious NaN at large real arguments and premature reciprocal underflow', () => {
    expect(Complex.from(1000).sinh().toVector()).toEqual([Infinity, 0]);
    expect(Complex.from(1000).cosh().toVector()).toEqual([Infinity, 0]);
    closeComplex(Complex.from(1000, 0.5).tanh(), [1, 0]);
    closeComplex(Complex.from(-1000, 0.5).coth(), [-1, 0]);
    expect(Complex.from(745).sech().re).toBe(Number.MIN_VALUE);
    close(Complex.from(Number.MIN_VALUE).asinh().re, Number.MIN_VALUE);
    close(Complex.from(Number.MIN_VALUE).acsch().re, Math.LN2 - Math.log(Number.MIN_VALUE));
    close(Complex.from(1, 1e-300).atanh().re, (Math.LN2 - Math.log(1e-300)) / 2);
  });
});
