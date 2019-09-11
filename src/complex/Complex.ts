// tslint:disable:variable-name
// tslint:disable:member-ordering
// tslint:disable:unified-signatures

export class Complex {
  private _re: number;
  private _im: number;
  private _epsilon = Number.EPSILON;

  private constructor(re: number, im: number) {
    this._re = re;
    this._im = im;
  }

  public static from(re: number, im?: number): Complex;
  public static from(rect: { re: number, im: number }): Complex;
  public static from(polar: { r: number, phi: number }): Complex;
  public static from(arr: [number, number]): Complex;

  public static from(): Complex {
    if (arguments.length === 1) {
      const arg = arguments[0];

      if (typeof arg === 'number') {
        return new Complex(arg, 0);
      }

      if (typeof arg.re === 'number' && typeof arg.im === 'number') {
        return new Complex(arg.re, arg.im);
      }

      if (typeof arg.r === 'number' && typeof arg.phi === 'number') {
        return Complex.fromPolar(arg.r, arg.phi);
      }

      if (Array.isArray(arg) && arg.length === 2) {
        return new Complex(arg[0], arg[1]);
      }
    }

    if (arguments.length === 2) {
      const arg0 = arguments[0];
      const arg1 = arguments[1];

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
    return this._re;
  }

  public get im(): number {
    return this._im;
  }

  public get epsilon(): number {
    return this._epsilon;
  }

  public set epsilon(e: number) {
    this._epsilon = e;
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

  public add(v: number|Complex): Complex {
    return Complex.add(this, v);
  }

  public sub(v: number|Complex): Complex {
    return Complex.sub(this, v);
  }

  public mul(v: number|Complex): Complex {
    return Complex.mul(this, v);
  }

  public div(v: number|Complex): Complex {
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

  public sin()   { return Complex.sin(this);   }
  public asin()  { return Complex.asin(this);  }
  public sinh()  { return Complex.sinh(this);  }
  public asinh() { return Complex.asinh(this); }

  public cos()   { return Complex.cos(this);   }
  public acos()  { return Complex.acos(this);  }
  public cosh()  { return Complex.cosh(this);  }
  public acosh() { return Complex.acosh(this); }

  public tan()   { return Complex.tan(this);   }
  public atan()  { return Complex.atan(this);  }
  public tanh()  { return Complex.tanh(this);  }
  public atanh() { return Complex.atanh(this); }

  public cot()   { return Complex.cot(this);   }
  public acot()  { return Complex.acot(this);  }
  public coth()  { return Complex.coth(this);  }
  public acoth() { return Complex.acoth(this); }

  public sec()   { return Complex.sec(this);   }
  public asec()  { return Complex.asec(this);  }
  public sech()  { return Complex.sech(this);  }
  public asech() { return Complex.asech(this); }

  public csc()   { return Complex.csc(this);   }
  public acsc()  { return Complex.acsc(this);  }
  public csch()  { return Complex.csch(this);  }
  public acsch() { return Complex.acsch(this); }

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
    const [r, phi] = z.toPolar();
    return Complex.from({
      r: 1 / r,
      phi: -phi
    });
  }

  public static add(z: Complex, v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(z.re + v, z.im);
    } else {
      return Complex.from(z.re + v.re, z.im + v.im);
    }
  }

  public static sub(z: Complex, v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(z.re - v, z.im);
    } else {
      return Complex.from(z.re - v.re, z.im - v.im);
    }
  }

  public static mul(z: Complex, v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(z.re * v, z.im * v);
    } else {
      // (a + bi)(c + di) = (ac - bd) + (ad + bc)i
      return Complex.from(
        z.re * v.re - z.im * v.im,
        z.re * v.im + z.im * v.re
      );
    }
  }

  public static div(z: Complex, v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(z.re / v, z.im / v);
    } else {
      const d = v.re ** 2 + v.im ** 2;
      return Complex.from(
        (z.re * v.re + z.im * v.im) / d,
        (z.im * v.re - z.re * v.im) / d
      );
    }
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
    const [r, phi] = z.toPolar();
    return Complex.from({
      re: Math.log(r),
      im: phi,
    });
  }

  public static log2(z: Complex): Complex {
    const [r, phi] = z.toPolar();
    return Complex.from({
      re: Math.log2(r),
      im: Math.LOG2E * phi,
    });
  }

  public static log10(z: Complex): Complex {
    const [r, phi] = z.toPolar();
    return Complex.from({
      re: Math.log10(r),
      im: Math.LOG10E * phi,
    });
  }

  public static pow(z: Complex, exponent: number): Complex {
    const [r, phi] = z.toPolar();
    return Complex.from({
      r: Math.pow(r, exponent),
      phi: phi * exponent
    });
  }

  public static sqrt(z: Complex): Complex {
    return Complex.pow(z, 1 / 2);
  }

  public static sin(z: Complex): Complex {
    // sin(a+bi) = sin(a)cosh(b) + icos(a)sinh(b)
    // https://proofwiki.org/wiki/Sine_of_Complex_Number
    return Complex.from(
      Math.sin(z.re) * Math.cosh(z.im),
      Math.cos(z.re) * Math.sinh(z.im)
    );
  }

  public static asin(z: Complex): Complex {
    // asin(z) = -i * ln(zi + sqrt(1 - z^2))
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;

    return i.neg().mul(
      C.log(
        z.mul(i).add(
          C.sqrt(
            C.one().sub(z.pow(2))
          )
        )
      )
    );
  }

  public static sinh(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static asinh(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static cos(z: Complex): Complex {
    // cos(a+bi) = cos(a)cosh(b) + isin(a)sinh(b)
    // https://proofwiki.org/wiki/Cosine_of_Complex_Number
    return Complex.from(
       Math.cos(z.re) * Math.cosh(z.im),
      -Math.sin(z.re) * Math.sinh(z.im)
    );
  }

  public static acos(z: Complex): Complex {
    // acos(z) = -i * ln(z + sqrt(z^2 - 1))
    //         = pi/2 + i * ln(zi + sqrt(1 - z^2))
    //         = pi/2 - asin(z)
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms

    return Complex.from(Math.PI / 2).sub(z.asin());
  }

  public static cosh(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static acosh(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
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
    return Complex.from(0, 0); // TODO
  }

  public static atanh(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
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
    return Complex.from(0, 0); // TODO
  }

  public static acoth(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static sec(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static asec(z: Complex): Complex {
    // asec(z) = -i * ln(sqrt(1 / z^2 - 1) + 1 / z))
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;

    return i.neg().mul(
      C.log(
        C.sqrt(
          C.one().div(z.pow(2)).sub(1)
        ).add(
          z.inv()
        )
      )
    );
  }

  public static sech(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static asech(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static csc(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static acsc(z: Complex): Complex {
    // acsc(z) = -i * ln(sqrt(1 - 1 / z^2) + i / z))
    // ref. https://en.wikipedia.org/wiki/Inverse_trigonometric_functions#Logarithmic_forms
    const C = Complex;
    const i = C.i;

    return i.neg().mul(
      C.log(
        C.sqrt(
          C.one().sub(
            C.one().div(z.pow(2))
          )
        ).add(
          i.div(z)
        )
      )
    );
  }

  public static csch(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static acsch(z: Complex): Complex {
    return Complex.from(0, 0); // TODO
  }

  public static equals(z1: Complex, z2: Complex, epsilon = Number.EPSILON): boolean {
    return Math.abs(z1.re - z2.re) < epsilon &&
           Math.abs(z1.im - z2.im) < epsilon;
  }

  public static toPolar(z: Complex): [number, number] {
    return [ z.abs(), z.arg() ];
  }

  public static toVector(z: Complex): [number, number] {
    return [ z.re, z.im ];
  }

  // TODO: format

  public static toString(z: Complex, dp: number = 3): string {
    const re = z.re.toFixed(dp);
    const im = Math.abs(z.im).toFixed(dp);
    const imsign = z.im < 0 ? '-' : '+';
    return `${re} ${imsign} ${im}i`;
  }
}
