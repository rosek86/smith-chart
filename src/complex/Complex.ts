export class Complex {
  private re: number;
  private im: number;

  private constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }

  public static create(re: number, im: number) {
    return new Complex(re, im);
  }

  public get real(): number {
    return this.re;
  }

  public get imag(): number {
    return this.im;
  }

  public add(c: Complex): Complex {
    return Complex.create(
      this.re + c.re,
      this.im + c.im
    );
  }

  public sub(c: Complex): Complex {
    return Complex.create(
      this.re - c.re,
      this.im - c.im
    );
  }

  // public mul(c: Complex): Complex {
  //   // todo
  // }

  // public div(c: Complex): Complex {
  //   // todo
  // }

  public abs(): number {
    return Math.sqrt(this.re ** 2 + this.im ** 2);
  }

  public neg(): Complex {
    return Complex.create(
      -this.re,
      -this.im
    );
  }
}
