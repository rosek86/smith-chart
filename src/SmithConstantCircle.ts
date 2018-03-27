import { Circle } from './draw/Circle';
import { Point } from './draw/Point';

type Vector = [ number, number ];
type Complex = [ number, number ];

export class SmithConstantCircle {
  private epsilon = 1e-10;

  public reflectionCoefficientToImpedance(c: Complex): Complex|undefined {
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

  public impedanceToReflectionoefficient(c: Complex): Complex|undefined {
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

  public reflectionCoefficientToAdmittance(c: Complex): Complex|undefined {
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

  public admittanceToReflectionCoefficient(c: Complex): Complex|undefined {
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

  public reflectionCoefficientToSwr(rc: Complex): number {
    const x = rc[0];
    const y = rc[1];
    const gamma = Math.sqrt(x*x + y*y);
    return (1 + gamma) / (1 - gamma);
  }

  public swrToAbsReflectionCoefficient(swr: number): number {
    return (swr - 1) / (swr + 1);
  }

  public reflectionCoefficientToReturnLoss(rc: Complex): number {
    const abs = Math.sqrt(rc[0]*rc[0] + rc[1]*rc[1]);
    return -20 * Math.log10(abs);
  }
}
