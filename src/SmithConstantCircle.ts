import { Circle } from './shapes/Circle';
import { Point } from './shapes/Point';

type Complex = [ number, number ];

export class SmithConstantCircle {
  private epsilon = 1e-10;

  public constructor(public Z0: number = 50) {
  }

  public rflCoeffToImpedance(c: Complex): Complex|undefined {
    const gr = c[0];
    const gi = c[1];
    const d = (1 - gr) * (1 - gr) + gi * gi;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const zr = (1 - gr * gr - gi * gi) / d;
    const zi = (2 * gi) / d;
    return [ zr, zi ];
  }

  public impedanceToRflCoeff(c: Complex): Complex|undefined {
    const zr = c[0];
    const zi = c[1];
    const d = (zr + 1) * (zr + 1) + zi * zi;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const gr = (zr * zr + zi * zi - 1) / d;
    const gi = (2 * zi) / d;
    return [ gr, gi ];
  }

  public rflCoeffToAdmittance(c: Complex): Complex|undefined {
    const gr = c[0];
    const gi = c[1];
    const d = (gr + 1) * (gr + 1) + gi * gi;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const yr = (1 - gr * gr - gi * gi) / d;
    const yi = (-2 * gi) / d;
    return [ yr, yi ];
  }

  public admittanceToRflCoeff(c: Complex): Complex|undefined {
    const yr = c[0];
    const yi = c[1];
    const d = (yr + 1) * (yr + 1) + yi * yi;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const gr = (1 - yr * yr - yi * yi) / d;
    const gi = (-2 * yi) / d;
    return [ gr, gi ];
  }

  public resistanceCircle(n: number): Circle {
    return { p: [ (n / (n + 1)), 0 ], r: 1 / (n + 1) };
  }

  public reactanceCircle(n: number): Circle {
    return { p: [ 1, (1 / n) ], r: Math.abs(1 / n) };
  }

  public conductanceCircle(n: number): Circle {
    return { p: [ -n / (n + 1), 0 ], r: 1 / (n + 1) };
  }

  public susceptanceCircle(n: number): Circle {
    return { p: [ -1, -1 / n ], r: Math.abs(1 / n) };
  }

  public constQCircle(q: number): Circle {
    // Center is (0, +1/Q) or (0, -1/Q).
    return { p: [ 0, 1 / q ], r: Math.sqrt(1 + 1 / (q * q)) };
  }

  public rflCoeffToSwr(rc: Complex): number {
    const x = rc[0];
    const y = rc[1];
    const gamma = Math.sqrt(x * x + y * y);
    return (1 + gamma) / (1 - gamma);
  }

  public rflCoeffToDBS(rc: Complex): number {
    return this.swrTodBS(this.rflCoeffToSwr(rc));
  }

  public swrToAbsRflCoeff(swr: number): number {
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
    return this.swrToAbsRflCoeff(swr);
  }

  public rflCoeffToReturnLoss(rc: Complex): number {
    const abs = this.rflCoeffEOrI(rc);
    return -20.0 * Math.log10(abs);
  }

  public returnLossToRflCoeffAbs(rl: number): number {
    return 10 ** (-rl / 20.0);
  }

  public rflCoeffToMismatchLoss(rc: Complex): number {
    const abs = this.rflCoeffEOrI(rc);
    return -10.0 * Math.log10(1 - abs * abs);
  }

  public rflCoeffEOrI(rc: Complex): number {
    return Math.sqrt(this.rflCoeffP(rc));
  }

  public rflCoeffP(rc: Complex): number {
    return rc[0] * rc[0] + rc[1] * rc[1];
  }

  public rflCoeffPToEOrI(p: number): number {
    return Math.sqrt(p);
  }

  public rflCoeffToQ(rc: Complex): number|undefined {
    const impedance = this.rflCoeffToImpedance(rc);
    if (!impedance) { return; }
    return Math.abs(impedance[1] / impedance[0]);
  }

  public circleCircleIntersection(c1: Circle, c2: Circle): Point[] {
    const dl = Math.sqrt(Math.pow(c2.p[0] - c1.p[0], 2) + Math.pow(c2.p[1] - c1.p[1], 2));

    const cosA = (dl * dl + c1.r * c1.r - c2.r * c2.r) / (2 * dl * c1.r);
    const sinA = Math.sqrt(1 - Math.pow(cosA, 2));

    const vpx = (c2.p[0] - c1.p[0]) * c1.r / dl;
    const vpy = (c2.p[1] - c1.p[1]) * c1.r / dl;

    return [[
        vpx * cosA - vpy * sinA + c1.p[0],
        vpx * sinA + vpy * cosA + c1.p[1],
    ], [
        vpx * cosA + vpy * sinA + c1.p[0],
        vpy * cosA - vpx * sinA + c1.p[1],
    ]];
  }

  public isPointWithinCircle(p: Point, c: Circle): boolean {
    return (Math.pow(p[0] - c.p[0], 2) + Math.pow(p[1] - c.p[1], 2)) <= (Math.pow(c.r, 2));
  }

  public normalize(p: Point): Point {
    return [ p[0] / this.Z0, p[1] / this.Z0 ];
  }

  public denormalize(p: Point): Point {
    return [ p[0] * this.Z0, p[1] * this.Z0 ];
  }

  public waveLengthFromFrequency(frequency: number): number {
    return 299792458 / frequency;
  }

  public frequencyFromWaveLength(waveLength: number): number {
    return 299792458 * waveLength;
  }

  public magnitude(p: Point): number {
    const real = p[0];
    const imag = p[1];
    return Math.sqrt(real * real + imag * imag);
  }

  public dB(value: number): number {
    return 20 * Math.log10(value);
  }

  public reactanceToCapacitance(x: number, f: number): number|null {
    if (x >= 0) { return null; }
    return -1 / (2 * Math.PI * f * x);
  }

  public capacitanceToReactance(C: number, f: number): number {
    return -1 / (2 * Math.PI * f * C);
  }

  public reactanceToInductance(x: number, f: number): number|null {
    if (x <= 0) { return null; }
    return x / (2 * Math.PI * f);
  }

  public inductanceToReactance(L: number, f: number): number {
    return 2 * Math.PI * f * L;
  }

  public addImpedance(rc: Point, [R, X]: [number, number]): Point|undefined {
    const Z = this.rflCoeffToImpedance(rc);
    if (Z === undefined) {
      return undefined;
    }
    Z[0] += R / this.Z0;
    Z[1] += X / this.Z0;
    return this.impedanceToRflCoeff(Z);
  }

  public addAdmittance(rc: Point, [G, B]: [number, number]): Point|undefined {
    const Y = this.rflCoeffToAdmittance(rc);
    if (Y === undefined) {
      return undefined;
    }
    Y[0] += G * this.Z0;
    Y[1] += B * this.Z0;
    return this.admittanceToRflCoeff(Y);
  }

  public tangentToCircleAngle(c: Circle, p: Point): number {
    // tangent to a circle, angle = atag(a)
    return this.rad2deg(Math.atan((c.p[0] - p[0]) / (p[1] - c.p[1])));
  }

  public rad2deg(rad: number): number {
    return rad * 180.0 / Math.PI;
  }

  public deg2rad(deg: number): number {
    return deg * Math.PI / 180.0;
  }
}
