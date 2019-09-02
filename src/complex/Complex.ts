export class Complex {
  private a: number;
  private b: number;

  private constructor(re: number, im: number) {
    this.a = re;
    this.b = im;
  }

  public static from(re: number, im?: number): Complex;
  public static from(obj: { re: number, im: number }|{ r: number, phi: number }): Complex;

  public static from(): Complex {
    if (arguments.length === 1) {
      const arg = arguments[0];

      if (typeof arg === 'number') {
        return Complex.fromReal(arg);
      }

      if (typeof arg.re === 'number' && typeof arg.im === 'number') {
        return Complex.fromRect(arg.re, arg.im);
      }

      if (typeof arg.r === 'number' && typeof arg.phi === 'number') {
        return Complex.fromPolar(arg.r, arg.phi);
      }
    }

    if (arguments.length === 2) {
      const arg0 = arguments[0];
      const arg1 = arguments[1];

      if (typeof arg0 === 'number' && typeof arg1 === 'number') {
        return Complex.fromRect(arg0, arg1);
      }
    }

    throw new Error('Cannot create complex number, invalid arguments.');
  }

  public static fromRect(re: number, im: number): Complex {
    return new Complex(re, im);
  }

  public static fromReal(re: number): Complex {
    return new Complex(re, 0);
  }

  public static fromImag(im: number): Complex {
    return new Complex(0, im);
  }

  public static fromPolar(r: number, phi: number): Complex {
    return new Complex(r * Math.cos(phi), r * Math.sin(phi));
  }

  public static fromArray(a: [number, number]): Complex {
    return Complex.fromRect(a[0], a[1]);
  }

  public static one(): Complex {
    return Complex.fromReal(1);
  }

  public static zero(): Complex {
    return Complex.fromReal(0);
  }

  public get real(): number {
    return this.re;
  }

  public get re(): number {
    return this.a;
  }

  public get imag(): number {
    return this.im;
  }

  public get im(): number {
    return this.b;
  }

  public add(v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(
        this.re + v,
        this.im
      );
    } else {
      return Complex.from(
        this.re + v.re,
        this.im + v.im
      );
    }
  }

  public sub(v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(
        this.re - v,
        this.im
      );
    } else {
      return Complex.from(
        this.re - v.re,
        this.im - v.im
      );
    }
  }

  public mul(v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(
        this.re * v,
        this.im * v
      );
    } else {
      // (a + bi)(c + di) = (ac - bd) + (ad + bc)i
      return Complex.from(
        this.re * v.re - this.im * v.im,
        this.re * v.im + this.im * v.re
      );
    }
  }

  public div(v: number|Complex): Complex {
    if (typeof v === 'number') {
      return Complex.from(
        this.re / v,
        this.im / v
      );
    } else {
      const d = v.re ** 2 + v.im ** 2;
      return Complex.from(
        (this.re * v.re + this.im * v.im) / d,
        (this.im * v.re - this.re * v.im) / d
      );
    }
  }

  public neg(): Complex {
    return this.mul(-1);
  }

  public conj(): Complex {
    return Complex.from(this.re, -this.im);
  }

  public abs(): number {
    return Math.sqrt(this.re ** 2 + this.im ** 2);
  }

  public arg(): number {
    return Math.atan2(this.im, this.re);
  }

  public exp(): Complex {
    // e^(a + bi) = e^a * e^bi = e^a * (cos(b) + i sin(b))
    const eRe = Math.exp(this.re);
    return Complex.from(
      eRe * Math.cos(this.im),
      eRe * Math.sin(this.im)
    );
  }

  // log, log10, sqrt, asin, acos, atan, sinh, cosh, tanh, asinh, acosh, atanh
  // equals, inverse, format, pow

  public sin(): Complex {
    // sin(a+bi) = sin(a)cosh(b) + icos(a)sinh(b)
    // https://proofwiki.org/wiki/Sine_of_Complex_Number
    return Complex.from(
      Math.sin(this.re) * Math.cosh(this.im),
      Math.cos(this.re) * Math.sinh(this.im)
    );
  }

  public cos(): Complex {
    // cos(a+bi) = cos(a)cosh(b) + isin(a)sinh(b)
    // https://proofwiki.org/wiki/Cosine_of_Complex_Number
    return Complex.from(
       Math.cos(this.re) * Math.cosh(this.im),
      -Math.sin(this.re) * Math.sinh(this.im)
    );
  }

  public tan(): Complex {
    return this.sin().div(this.cos());
  }

  public toPolar(): [number, number] {
    return [ this.abs(), this.arg() ];
  }

  public toArray(): [number, number] {
    return [ this.re, this.im ];
  }

  public toString(dp: number = 3): string {
    const re = this.real.toFixed(dp);
    const im = Math.abs(this.imag).toFixed(dp);
    const imsign = this.imag < 0 ? '-' : '+';
    return `${re} ${imsign} j ${im}`;
  }
}
