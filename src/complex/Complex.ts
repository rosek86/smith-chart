export class Complex {
  private re: number;
  private im: number;

  private constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }

  public static from(re: number, im: number): Complex {
    return new Complex(re, im);
  }

  public static fromArray(a: [number, number]): Complex {
    return Complex.from(...a);
  }

  public get real(): number {
    return this.re;
  }

  public get imag(): number {
    return this.im;
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

  public abs(): number {
    return Math.sqrt(this.re ** 2 + this.im ** 2);
  }

  public arg(): number {
    return Math.atan2(this.im, this.re);
  }

  public neg(): Complex {
    return Complex.from(
      -this.re,
      -this.im
    );
  }

  public toArray(): [number, number] {
    return [ this.re, this.im ];
  }
}
