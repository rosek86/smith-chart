import { complexRatio } from './math/complexRatio.js';
import { Circle } from './shapes/Circle.js';
import { Point } from './shapes/Point.js';
import { Complex } from './complex/Complex.js';

export class SmithConstantCircle {
  public constructor(public Z0: number = 50) {}

  public rflCoeffToImpedance(c: Complex): Complex | undefined {
    return this.transform(c, 1 + c.re, c.im, 1 - c.re, -c.im, 2);
  }

  public impedanceToRflCoeff(c: Complex): Complex | undefined {
    return this.transform(c, c.re - 1, c.im, c.re + 1, c.im, 2);
  }

  public rflCoeffToAdmittance(c: Complex): Complex | undefined {
    return this.transform(c, 1 - c.re, -c.im, 1 + c.re, c.im, -2);
  }

  public admittanceToRflCoeff(c: Complex): Complex | undefined {
    return this.transform(c, 1 - c.re, -c.im, 1 + c.re, c.im, -2);
  }

  private transform(
    value: Complex,
    nr: number,
    ni: number,
    dr: number,
    di: number,
    determinant: number,
  ): Complex | undefined {
    const quotient = complexRatio(nr, ni, dr, di);
    if (!quotient) {
      return;
    }
    // The analytic imaginary numerator avoids cancellation of nearly equal products.
    const scale = Math.max(Math.abs(dr), Math.abs(di));
    const denominator = (dr / scale) ** 2 + (di / scale) ** 2;
    const im = (determinant * (value.im / scale)) / denominator / scale;
    return Number.isFinite(im) ? Complex.from(quotient.re, im) : undefined;
  }

  public resistanceCircle(n: number): Circle {
    return { p: [n / (n + 1), 0], r: 1 / (n + 1) };
  }

  public reactanceCircle(n: number): Circle {
    return { p: [1, 1 / n], r: Math.abs(1 / n) };
  }

  public conductanceCircle(n: number): Circle {
    return { p: [-n / (n + 1), 0], r: 1 / (n + 1) };
  }

  public susceptanceCircle(n: number): Circle {
    return { p: [-1, -1 / n], r: Math.abs(1 / n) };
  }

  public constQCircle(q: number): Circle {
    // Center is (0, +1/Q) or (0, -1/Q).
    return { p: [0, 1 / q], r: Math.sqrt(1 + 1 / (q * q)) };
  }

  public rflCoeffToSwr(rc: Complex): number {
    const gamma = rc.abs();
    return (1 + gamma) / (1 - gamma);
  }

  public rflCoeffToDBS(rc: Complex): number {
    return this.swrTodBS(this.rflCoeffToSwr(rc));
  }

  public swrToRflCoeffEOrI(swr: number): number {
    return (swr - 1) / (swr + 1);
  }

  public swrTodBS(swr: number): number {
    return 20 * Math.log10(swr);
  }

  public dBSToSwr(dBS: number): number {
    return 10 ** (dBS / 20.0);
  }

  public dBSToAbsRflCoeff(dBS: number): number {
    const swr = this.dBSToSwr(dBS);
    return this.swrToRflCoeffEOrI(swr);
  }

  public rflCoeffToReturnLoss(rc: Complex): number {
    return -20.0 * Math.log10(this.rflCoeffEOrI(rc));
  }

  public returnLossToRflCoeffEOrI(rl: number): number {
    return 10 ** (-rl / 20.0);
  }

  /** One-way attenuation scale, referenced to a fully reflecting termination. */
  public rflCoeffToAttenuation(rc: Complex): number {
    return this.rflCoeffToReturnLoss(rc) / 2;
  }

  public attenuationToRflCoeff(attenuation: number): number {
    return 10 ** (-attenuation / 10);
  }

  public rflCoeffToMismatchLoss(rc: Complex): number {
    // mismatch loss is reflection loss
    const abs = this.rflCoeffEOrI(rc);
    return (-10 / Math.LN10) * Math.log1p(-(abs ** 2));
  }

  public mismatchLossToRflCoeffEOrI(ml: number): number {
    return Math.sqrt(1 - 10 ** (-ml / 10));
  }

  public rflCoeffEOrI(rc: Complex): number {
    return Math.sqrt(this.rflCoeffP(rc));
  }

  public rflCoeffP(rc: Complex): number {
    return rc.abs() ** 2;
  }

  public rflCoeffPToEOrI(p: number): number {
    return Math.sqrt(p);
  }

  public rflCoeffToQ(rc: Complex): number | undefined {
    const impedance = this.rflCoeffToImpedance(rc);
    if (!impedance || (impedance.real === 0 && impedance.imag === 0)) {
      return;
    }
    return Math.abs(impedance.imag / impedance.real);
  }

  public rflCoeffToTransmCoeffP(rc: Complex): number {
    return 1 - this.rflCoeffEOrI(rc) ** 2;
  }

  public transmCoeffPToRflCoeffEOrI(tcp: number): number {
    return Math.sqrt(1.0 - tcp);
  }

  public rflCoeffToTransmCoeff(rc: Complex): Complex {
    // T = R + 1
    return rc.add(1);
  }

  public transmCoeffToRflCoeff(tc: Complex): Complex {
    return tc.sub(1);
  }

  public rflCoeffToTransmCoeffEOrI(rc: Complex): number {
    // T = R + 1
    const tc = this.rflCoeffToTransmCoeff(rc);
    return tc.abs();
  }

  /** Current transmission magnitude using the voltage reflection coefficient. */
  public rflCoeffToCurrentTransmission(rc: Complex): number {
    return Math.hypot(1 - rc.re, rc.im);
  }

  // s. w. peak (const. p)
  // MAX. LIMITS = |V|max/|V|max,0 = sqrt(VSWR)
  public rflCoeffToSwPeakConstP(rc: Complex): number {
    return Math.sqrt(this.rflCoeffToSwr(rc));
  }

  public swPeakConstPToRflCoeffEOrI(swPeak: number): number {
    return this.swrToRflCoeffEOrI(swPeak ** 2);
  }

  // SW. LOSS COEF. = (Pincident + Preflect) / (Pincident - Preflect)
  // SW. LOSS COEF. = (1+|S|^2) / (1-|S|^2)
  public rflCoeffToSwLossCoeff(rc: Complex): number {
    const abs = this.rflCoeffEOrI(rc);
    return (1 + abs ** 2) / (1 - abs ** 2);
  }

  public swLossCoeffToRflCoeffEOrI(swl: number): number {
    return Math.sqrt((swl - 1) / (swl + 1));
  }

  // public transmCoeffToInsertionLoss(tc: Complex): number {
  //   return -20 * Math.log10()
  // }

  public circleCircleIntersection(c1: Circle, c2: Circle): Point[] {
    const dl = Math.sqrt(Math.pow(c2.p[0] - c1.p[0], 2) + Math.pow(c2.p[1] - c1.p[1], 2));

    const cosA = (dl * dl + c1.r * c1.r - c2.r * c2.r) / (2 * dl * c1.r);
    const sinA = Math.sqrt(1 - Math.pow(cosA, 2));

    const vpx = ((c2.p[0] - c1.p[0]) * c1.r) / dl;
    const vpy = ((c2.p[1] - c1.p[1]) * c1.r) / dl;

    return [
      [vpx * cosA - vpy * sinA + c1.p[0], vpx * sinA + vpy * cosA + c1.p[1]],
      [vpx * cosA + vpy * sinA + c1.p[0], vpy * cosA - vpx * sinA + c1.p[1]],
    ];
  }

  public isPointWithinCircle(p: Point, c: Circle): boolean {
    return Math.pow(p[0] - c.p[0], 2) + Math.pow(p[1] - c.p[1], 2) <= Math.pow(c.r, 2);
  }

  public normalize(c: Complex): Complex {
    return c.div(this.Z0);
  }

  public denormalize(c: Complex): Complex {
    return c.mul(this.Z0);
  }

  public waveLengthFromFrequency(frequency: number): number {
    return 299792458 / frequency;
  }

  public frequencyFromWaveLength(waveLength: number): number {
    return 299792458 / waveLength;
  }

  public magnitude(c: Complex): number {
    return c.abs();
  }

  public dB(value: number): number {
    return 20 * Math.log10(value);
  }

  public reactanceToCapacitance(x: number, f: number): number | null {
    if (x >= 0) {
      return null;
    }
    return -1 / (2 * Math.PI * f * x);
  }

  public capacitanceToReactance(C: number, f: number): Complex {
    return Complex.from(0, -1 / (2 * Math.PI * f * C));
  }

  public reactanceToInductance(x: number, f: number): number | null {
    if (x <= 0) {
      return null;
    }
    return x / (2 * Math.PI * f);
  }

  public inductanceToReactance(L: number, f: number): Complex {
    return Complex.from(0, 2 * Math.PI * f * L);
  }

  public addImpedance(rc: Complex, imp: Complex): Complex | undefined {
    let Z = this.rflCoeffToImpedance(rc);
    if (Z === undefined) {
      return undefined;
    }
    Z = Z.add(imp.div(this.Z0));
    return this.impedanceToRflCoeff(Z);
  }

  public addAdmittance(rc: Complex, adm: Complex): Complex | undefined {
    let Y = this.rflCoeffToAdmittance(rc);
    if (Y === undefined) {
      return undefined;
    }
    Y = Y.add(adm.mul(this.Z0));
    return this.admittanceToRflCoeff(Y);
  }

  public tangentToCircleAngle(c: Circle, p: Point): number {
    // tangent to a circle, angle = atag(a)
    return this.rad2deg(Math.atan((c.p[0] - p[0]) / (p[1] - c.p[1])));
  }

  public rad2deg(rad: number): number {
    return (rad * 180.0) / Math.PI;
  }

  public deg2rad(deg: number): number {
    return (deg * Math.PI) / 180.0;
  }
}
