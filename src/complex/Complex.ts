export class Complex {
  private readonly realPart: number;
  private readonly imaginaryPart: number;
  private tolerance = Number.EPSILON;

  private constructor(re: number, im: number) {
    this.realPart = re;
    this.imaginaryPart = im;
  }

  public static from(re: number, im?: number): Complex;
  public static from(rect: { re: number; im: number }): Complex;
  public static from(polar: { r: number; phi: number }): Complex;
  public static from(arr: [number, number]): Complex;

  public static from(...args: unknown[]): Complex {
    if (args.length === 1) {
      const arg = args[0];

      if (typeof arg === 'number') {
        return new Complex(arg, 0);
      }

      if (
        typeof arg === 'object' &&
        arg !== null &&
        're' in arg &&
        'im' in arg &&
        typeof arg.re === 'number' &&
        typeof arg.im === 'number'
      ) {
        return new Complex(arg.re, arg.im);
      }

      if (
        typeof arg === 'object' &&
        arg !== null &&
        'r' in arg &&
        'phi' in arg &&
        typeof arg.r === 'number' &&
        typeof arg.phi === 'number'
      ) {
        return Complex.fromPolar(arg.r, arg.phi);
      }

      if (Array.isArray(arg) && arg.length === 2) {
        return new Complex(arg[0], arg[1]);
      }
    }

    if (args.length === 2) {
      const arg0 = args[0];
      const arg1 = args[1];

      if (typeof arg0 === 'number' && typeof arg1 === 'number') {
        return new Complex(arg0, arg1);
      }
    }

    throw new Error('Cannot create complex number, invalid arguments.');
  }

  private static fromPolar(r: number, phi: number): Complex {
    return new Complex(r * Math.cos(phi), r * Math.sin(phi));
  }

  public static one(): Complex {
    return new Complex(1, 0);
  }

  public static zero(): Complex {
    return new Complex(0, 0);
  }

  public static get i(): Complex {
    return new Complex(0, 1);
  }

  public get real(): number {
    return this.re;
  }

  public get imag(): number {
    return this.im;
  }

  public get re(): number {
    return this.realPart;
  }

  public get im(): number {
    return this.imaginaryPart;
  }

  public get epsilon(): number {
    return this.tolerance;
  }

  public set epsilon(e: number) {
    this.tolerance = e;
  }

  public abs(): number {
    return Complex.abs(this);
  }

  public arg(): number {
    return Complex.arg(this);
  }

  public sign(): Complex {
    return Complex.sign(this);
  }

  public conj(): Complex {
    return Complex.conj(this);
  }

  public neg(): Complex {
    return Complex.neg(this);
  }

  public inv(): Complex {
    return Complex.inv(this);
  }

  public add(v: number | Complex): Complex {
    return Complex.add(this, v);
  }

  public sub(v: number | Complex): Complex {
    return Complex.sub(this, v);
  }

  public mul(v: number | Complex): Complex {
    return Complex.mul(this, v);
  }

  public div(v: number | Complex): Complex {
    return Complex.div(this, v);
  }

  public exp(): Complex {
    return Complex.exp(this);
  }

  public log(): Complex {
    return Complex.log(this);
  }

  public log2(): Complex {
    return Complex.log2(this);
  }

  public log10(): Complex {
    return Complex.log10(this);
  }

  public pow(exponent: number): Complex {
    return Complex.pow(this, exponent);
  }

  public sqrt(): Complex {
    return Complex.sqrt(this);
  }

  public sin() {
    return Complex.sin(this);
  }
  public asin() {
    return Complex.asin(this);
  }
  public sinh() {
    return Complex.sinh(this);
  }
  public asinh() {
    return Complex.asinh(this);
  }

  public cos() {
    return Complex.cos(this);
  }
  public acos() {
    return Complex.acos(this);
  }
  public cosh() {
    return Complex.cosh(this);
  }
  public acosh() {
    return Complex.acosh(this);
  }

  public tan() {
    return Complex.tan(this);
  }
  public atan() {
    return Complex.atan(this);
  }
  public tanh() {
    return Complex.tanh(this);
  }
  public atanh() {
    return Complex.atanh(this);
  }

  public cot() {
    return Complex.cot(this);
  }
  public acot() {
    return Complex.acot(this);
  }
  public coth() {
    return Complex.coth(this);
  }
  public acoth() {
    return Complex.acoth(this);
  }

  public sec() {
    return Complex.sec(this);
  }
  public asec() {
    return Complex.asec(this);
  }
  public sech() {
    return Complex.sech(this);
  }
  public asech() {
    return Complex.asech(this);
  }

  public csc() {
    return Complex.csc(this);
  }
  public acsc() {
    return Complex.acsc(this);
  }
  public csch() {
    return Complex.csch(this);
  }
  public acsch() {
    return Complex.acsch(this);
  }

  public equals(z: Complex): boolean {
    return Complex.equals(this, z, this.epsilon);
  }

  public toPolar(): [number, number] {
    return Complex.toPolar(this);
  }

  public toVector(): [number, number] {
    return Complex.toVector(this);
  }

  public toString(dp: number = 3): string {
    return Complex.toString(this, dp);
  }

  public static abs(z: Complex): number {
    return Math.sqrt(z.re ** 2 + z.im ** 2);
  }

  public static arg(z: Complex): number {
    return Math.atan2(z.im, z.re);
  }

  public static sign(z: Complex): Complex {
    const abs = z.abs();
    return Complex.from({
      re: z.re / abs,
      im: z.im / abs,
    });
  }

  public static conj(z: Complex): Complex {
    return Complex.from(z.re, -z.im);
  }

  public static neg(z: Complex): Complex {
    return Complex.from(-z.re, -z.im);
  }

  public static inv(z: Complex): Complex {
    return Complex.reciprocal(z);
  }

  public static add(z: Complex, v: number | Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(z.re + v, z.im);
    } else {
      return Complex.from(z.re + v.re, z.im + v.im);
    }
  }

  public static sub(z: Complex, v: number | Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(z.re - v, z.im);
    } else {
      return Complex.from(z.re - v.re, z.im - v.im);
    }
  }

  public static mul(z: Complex, v: number | Complex): Complex {
    if (
      !Complex.isFinite(z) ||
      (typeof v === 'number' ? !Number.isFinite(v) : !Complex.isFinite(v))
    ) {
      return Complex.nan();
    }
    if (typeof v === 'number') {
      return Complex.from(z.re * v, z.im * v);
    }
    const real = Complex.productSum(z.re, v.re, -z.im, v.im);
    const imaginary = Complex.productSum(z.re, v.im, z.im, v.re);
    return Complex.from(Complex.scalePowerOfTwo(...real), Complex.scalePowerOfTwo(...imaginary));
  }

  public static div(z: Complex, v: number | Complex): Complex {
    if (
      !Complex.isFinite(z) ||
      (typeof v === 'number' ? !Number.isFinite(v) : !Complex.isFinite(v))
    ) {
      return Complex.nan();
    }
    if (typeof v === 'number') {
      return v === 0 ? Complex.nan() : Complex.from(z.re / v, z.im / v);
    }
    if (v.re === 0 && v.im === 0) {
      return Complex.nan();
    }
    // Keep products as mantissa/exponent pairs, including subnormal inputs.
    // Neither squaring the denominator nor cancellation requires an infinite intermediate.
    const [denominator, exponent] = Complex.productSum(v.re, v.re, v.im, v.im);
    const quotient = (a: number, b: number, c: number, d: number) => {
      const [numerator, power] = Complex.productSum(a, b, c, d);
      return Complex.scalePowerOfTwo(numerator / denominator, power - exponent);
    };
    return Complex.from(quotient(z.re, v.re, z.im, v.im), quotient(z.im, v.re, -z.re, v.im));
  }

  public static exp(z: Complex): Complex {
    // e^(a + bi) = e^a * e^bi = e^a * (cos(b) + i sin(b))
    const eRe = Math.exp(z.re);
    return Complex.from({
      re: eRe * Math.cos(z.im),
      im: eRe * Math.sin(z.im),
    });
  }

  public static log(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    return Complex.from(Complex.logHypot(z.re, z.im), z.arg());
  }

  public static log2(z: Complex): Complex {
    const value = Complex.log(z);
    return Complex.from(value.re * Math.LOG2E, value.im * Math.LOG2E);
  }

  public static log10(z: Complex): Complex {
    const value = Complex.log(z);
    return Complex.from(value.re * Math.LOG10E, value.im * Math.LOG10E);
  }

  public static pow(z: Complex, exponent: number): Complex {
    if (!Complex.isFinite(z) || !Number.isFinite(exponent)) {
      return Complex.nan();
    }
    if (exponent === 0) {
      return Complex.one();
    }
    if (exponent === 1) {
      return Complex.from(z.re, z.im);
    }
    if (exponent === -1) {
      return Complex.inv(z);
    }
    if (exponent === 0.5) {
      return Complex.sqrt(z);
    }
    if (exponent === 2) {
      return Complex.mul(z, z);
    }
    if (z.re === 0 && z.im === 0) {
      return exponent > 0 ? Complex.zero() : Complex.nan();
    }
    const logRadius = Complex.logHypot(z.re, z.im) * exponent;
    const angle = z.arg() * exponent;
    const component = (factor: number) =>
      factor === 0
        ? factor
        : Complex.copySign(Math.exp(logRadius + Math.log(Math.abs(factor))), factor);
    return Complex.from(component(Math.cos(angle)), component(Math.sin(angle)));
  }

  public static sqrt(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    const scale = Math.max(Math.abs(z.re), Math.abs(z.im));
    if (scale === 0) {
      return Complex.from(0, z.im);
    }
    const x = z.re / scale;
    const y = z.im / scale;
    const root = Math.sqrt(scale) * Math.sqrt((Math.hypot(x, y) + Math.abs(x)) / 2);
    return z.re >= 0
      ? Complex.from(root, z.im / (2 * root))
      : Complex.from(Math.abs(z.im) / (2 * root), Complex.copySign(root, z.im));
  }

  public static sin(z: Complex): Complex {
    // sin(a+bi) = sin(a)cosh(b) + icos(a)sinh(b)
    // https://proofwiki.org/wiki/Sine_of_Complex_Number
    return Complex.from(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im));
  }

  public static asin(z: Complex): Complex {
    // asin(z) = -i * ln(zi + sqrt(1 - z^2))
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;

    return i.neg().mul(C.log(z.mul(i).add(C.sqrt(C.one().sub(z.pow(2))))));
  }

  public static sinh(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    return Complex.from(
      Complex.hyperbolicProduct(z.re, Math.cos(z.im), true),
      Complex.hyperbolicProduct(z.re, Math.sin(z.im), false),
    );
  }

  public static asinh(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    const x = Math.abs(z.re);
    const y = Math.abs(z.im);
    if (Math.max(x, y) < 1e-8) {
      return Complex.from(z.re, z.im);
    }
    if (y < 1 && x < 1e-150) {
      return Complex.from(z.re / (Math.sqrt(1 - y) * Math.sqrt(1 + y)), Math.asin(z.im));
    }
    if (Math.max(x, y) > 1e150) {
      return Complex.from(
        Complex.copySign(Complex.logHypot(x, y) + Math.LN2, z.re),
        Math.atan2(z.im, x),
      );
    }
    const { real, transverse } = Complex.inverseHyperbolicParts(y, x);
    return Complex.from(
      Complex.copySign(real, z.re),
      Complex.copySign(Math.atan2(y, transverse), z.im),
    );
  }

  public static cos(z: Complex): Complex {
    // cos(a+bi) = cos(a)cosh(b) + isin(a)sinh(b)
    // https://proofwiki.org/wiki/Cosine_of_Complex_Number
    return Complex.from(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im));
  }

  public static acos(z: Complex): Complex {
    // acos(z) = -i * ln(z + sqrt(z^2 - 1))
    //         = pi/2 + i * ln(zi + sqrt(1 - z^2))
    //         = pi/2 - asin(z)
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms

    return Complex.from(Math.PI / 2).sub(z.asin());
  }

  public static cosh(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    return Complex.from(
      Complex.hyperbolicProduct(z.re, Math.cos(z.im), false),
      Complex.hyperbolicProduct(z.re, Math.sin(z.im), true),
    );
  }

  public static acosh(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    if (Math.abs(z.re) < 1 && Math.abs(z.im) < 1e-150) {
      return Complex.from(
        Math.abs(z.im) / (Math.sqrt(1 - z.re) * Math.sqrt(1 + z.re)),
        Complex.copySign(Math.acos(z.re), z.im),
      );
    }
    if (Math.max(Math.abs(z.re), Math.abs(z.im)) > 1e150) {
      return Complex.from(Complex.logHypot(z.re, z.im) + Math.LN2, Math.atan2(z.im, z.re));
    }
    const { real, transverse } = Complex.inverseHyperbolicParts(Math.abs(z.re), Math.abs(z.im));
    return Complex.from(real, Complex.copySign(Math.atan2(transverse, z.re), z.im));
  }

  public static tan(z: Complex): Complex {
    return z.sin().div(z.cos());
  }

  public static atan(z: Complex): Complex {
    // atan(z) = i / 2 * ln((i + z) / (i - z))
    //         = i / 2 * [ln(1 - iz) - ln(1 + iz)]
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;
    const z1 = C.log(C.one().sub(i.mul(z)));
    const z2 = C.log(C.one().add(i.mul(z)));
    return i.div(2).mul(z1.sub(z2));
  }

  public static tanh(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    // Divide through by exp(2|x|); expm1 retains the real part near zero.
    const q = Math.exp(-2 * Math.abs(z.re));
    const difference = -Math.expm1(-2 * Math.abs(z.re));
    const cos = Math.cos(z.im);
    const sin = Math.sin(z.im);
    const denominator = difference * difference + 4 * q * cos * cos;
    return Complex.from(
      Complex.copySign((difference * (1 + q)) / denominator, z.re),
      (4 * q * sin * cos) / denominator,
    );
  }

  public static atanh(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    const x = Math.abs(z.re);
    const y = Math.abs(z.im);
    if (Math.max(x, y) > 1e150) {
      return Complex.from(Complex.reciprocal(z).re, Complex.copySign(Math.PI / 2, z.im));
    }
    const distance = Math.hypot(1 - x, y);
    const real =
      distance < 1e-150
        ? (Complex.logHypot(1 + x, y) - Complex.logHypot(1 - x, y)) / 2
        : Math.log1p((4 * (x / distance)) / distance) / 4;
    const imag = Math.atan2(2 * z.im, (1 - x) * (1 + x) - y * y) / 2;
    return Complex.from(Complex.copySign(real, z.re), imag);
  }

  public static cot(z: Complex): Complex {
    return z.cos().div(z.sin());
  }

  public static acot(z: Complex): Complex {
    // atan(z) = i / 2 * ln((i - z) / (i + z))
    //         = i / 2 * [ln(1 - i/z) - ln(1 + i/z)]
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;
    const z1 = C.log(C.one().sub(i.div(z)));
    const z2 = C.log(C.one().add(i.div(z)));
    return i.div(2).mul(z1.sub(z2));
  }

  public static coth(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    return Complex.reciprocal(Complex.tanh(z));
  }

  public static acoth(z: Complex): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    if (Math.max(Math.abs(z.re), Math.abs(z.im)) < 1e-150) {
      return Complex.from(z.re, Complex.copySign(Math.PI / 2, -z.im));
    }
    return Complex.atanh(Complex.reciprocal(z));
  }

  public static sec(z: Complex): Complex {
    return Complex.sech(Complex.from(-z.im, z.re));
  }

  public static asec(z: Complex): Complex {
    // asec(z) = -i * ln(sqrt(1 / z^2 - 1) + 1 / z))
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;

    return i.neg().mul(C.log(C.sqrt(C.one().div(z.pow(2)).sub(1)).add(z.inv())));
  }

  public static sech(z: Complex): Complex {
    return Complex.hyperbolicReciprocal(z, true);
  }

  public static asech(z: Complex): Complex {
    if (!Complex.isFinite(z) || (z.re === 0 && z.im === 0)) {
      return Complex.nan();
    }
    if (Math.max(Math.abs(z.re), Math.abs(z.im)) < 1e-150) {
      return Complex.from(Math.LN2 - Complex.logHypot(z.re, z.im), -Math.atan2(z.im, z.re));
    }
    return Complex.acosh(Complex.reciprocal(z));
  }

  public static csc(z: Complex): Complex {
    const value = Complex.csch(Complex.from(-z.im, z.re));
    return Complex.from(-value.im, value.re);
  }

  public static acsc(z: Complex): Complex {
    // acsc(z) = -i * ln(sqrt(1 - 1 / z^2) + i / z))
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;

    return i.neg().mul(C.log(C.sqrt(C.one().sub(C.one().div(z.pow(2)))).add(i.div(z))));
  }

  public static csch(z: Complex): Complex {
    return Complex.hyperbolicReciprocal(z, false);
  }

  public static acsch(z: Complex): Complex {
    if (!Complex.isFinite(z) || (z.re === 0 && z.im === 0)) {
      return Complex.nan();
    }
    if (Math.max(Math.abs(z.re), Math.abs(z.im)) < 1e-150) {
      return Complex.from(
        Complex.copySign(Math.LN2 - Complex.logHypot(z.re, z.im), z.re),
        Math.atan2(-z.im, Math.abs(z.re)),
      );
    }
    return Complex.asinh(Complex.reciprocal(z));
  }

  private static isFinite(z: Complex): boolean {
    return Number.isFinite(z.re) && Number.isFinite(z.im);
  }

  private static nan(): Complex {
    return Complex.from(NaN, NaN);
  }

  private static copySign(magnitude: number, sign: number): number {
    return sign < 0 || Object.is(sign, -0) ? -Math.abs(magnitude) : Math.abs(magnitude);
  }

  private static logHypot(x: number, y: number): number {
    const scale = Math.max(Math.abs(x), Math.abs(y));
    return scale === 0 ? -Infinity : Math.log(scale) + Math.log(Math.hypot(x / scale, y / scale));
  }

  /** Sum two products without premature overflow/underflow. Result is mantissa × 2^exponent. */
  private static productSum(a: number, b: number, c: number, d: number): [number, number] {
    const product = (x: number, y: number): [number, number] => {
      if (x === 0 || y === 0) {
        return [x * y, 0];
      }
      const ex = Math.min(1023, Math.floor(Math.log2(Math.abs(x))));
      const ey = Math.min(1023, Math.floor(Math.log2(Math.abs(y))));
      return [(x / 2 ** ex) * (y / 2 ** ey), ex + ey];
    };
    const [first, ef] = product(a, b);
    const [second, es] = product(c, d);
    if (first === 0) {
      return second === 0 ? [first + second, 0] : [second, es];
    }
    if (second === 0) {
      return [first, ef];
    }
    const exponent = Math.max(ef, es);
    return [first * 2 ** (ef - exponent) + second * 2 ** (es - exponent), exponent];
  }

  private static scalePowerOfTwo(value: number, exponent: number): number {
    if (value === 0) {
      return value;
    }
    // Normalize after cancellation before splitting the final exponent.
    const shift = Math.min(1023, Math.floor(Math.log2(Math.abs(value))));
    value /= 2 ** shift;
    exponent += shift;
    if (exponent > 1023) {
      return value * 2 ** (exponent - 1023) * 2 ** 1023;
    }
    if (exponent < -1022) {
      return value * 2 ** (exponent + 1022) * 2 ** -1022;
    }
    return value * 2 ** exponent;
  }

  /** Cartesian reciprocal, preserving signed zeros on branch cuts. */
  private static reciprocal(z: Complex): Complex {
    const value = Complex.div(Complex.one(), z);
    if (Number.isNaN(value.re)) {
      return value;
    }
    return Complex.from(
      z.re === 0 ? Complex.copySign(0, z.re) : value.re,
      z.im === 0 ? Complex.copySign(0, -z.im) : value.im,
    );
  }

  private static hyperbolicProduct(x: number, factor: number, odd: boolean): number {
    if (Math.abs(x) < 20) {
      return factor * (odd ? Math.sinh(x) : Math.cosh(x));
    }
    const sign = odd ? factor * Math.sign(x) : factor;
    if (factor === 0) {
      return sign;
    }
    // Combine the factor before exponentiation to avoid a spurious Infinity * 0.
    return Complex.copySign(Math.exp(Math.abs(x) - Math.LN2 + Math.log(Math.abs(factor))), sign);
  }

  private static hyperbolicReciprocal(z: Complex, even: boolean): Complex {
    if (!Complex.isFinite(z)) {
      return Complex.nan();
    }
    const x = Math.abs(z.re);
    const q = Math.exp(-2 * x);
    const difference = -Math.expm1(-2 * x);
    const cos = Math.cos(z.im);
    const sin = Math.sin(z.im);
    const denominator = even
      ? Complex.from(cos * (1 + q), sin * Complex.copySign(difference, z.re))
      : Complex.from(cos * Complex.copySign(difference, z.re), sin * (1 + q));
    return Complex.reciprocal(denominator).mul(Math.exp(Math.LN2 - x));
  }

  /**
   * Elliptic coordinates for principal inverse functions (x,y >= 0).
   * With a = (|z+1| + |z-1|)/2, return acosh(a) and sqrt(a²-x²).
   * Rationalized hypot differences retain tiny components near the branch cuts.
   * Principal branches: https://dlmf.nist.gov/4.37
   */
  private static inverseHyperbolicParts(x: number, y: number) {
    const plus = Math.hypot(x + 1, y);
    const minus = Math.hypot(x - 1, y);
    const a = plus / 2 + minus / 2;
    const first = y === 0 ? 0 : y / Math.sqrt(plus + x + 1);
    const second = y === 0 ? 0 : y / Math.sqrt(minus + Math.abs(x - 1));
    const correction = Math.hypot(first, second) / Math.SQRT2;
    const rootAMinus1 = x <= 1 ? correction : Math.hypot(Math.sqrt(x - 1), correction);
    const rootAMinusX = x <= 1 ? Math.hypot(Math.sqrt(1 - x), correction) : correction;
    return {
      real: 2 * Math.asinh(rootAMinus1 / Math.SQRT2),
      transverse: rootAMinusX * Math.sqrt(a + x),
    };
  }

  public static equals(z1: Complex, z2: Complex, epsilon = Number.EPSILON): boolean {
    return Math.abs(z1.re - z2.re) < epsilon && Math.abs(z1.im - z2.im) < epsilon;
  }

  public static toPolar(z: Complex): [number, number] {
    return [z.abs(), z.arg()];
  }

  public static toVector(z: Complex): [number, number] {
    return [z.re, z.im];
  }

  // TODO: format

  public static toString(z: Complex, dp: number = 3): string {
    const re = z.re.toFixed(dp);
    const im = Math.abs(z.im).toFixed(dp);
    const imsign = z.im < 0 ? '-' : '+';
    return `${re} ${imsign} ${im}i`;
  }
}
