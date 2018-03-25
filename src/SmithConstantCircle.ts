import { Circle } from './draw/Circle';
import { Point } from './draw/Point';

type Vector = [ number, number ];
type Complex = [ number, number ];

export class SmithConstantCircle {
  private epsilon = 1e-10;

  public impedanceToReflectionCoefficient(c: Complex): Complex|undefined {
    const zr = c[0];
    const zi = c[1];
    const d = (1 - zr) * (1 - zr) + zi * zi;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const r = (1 - zr * zr - zi * zi) / d;
    const x = (2 * zi) / d;
    return [ r, x ];
  }

  public reflectionCoefficientToImpedance(c: Complex): Complex|undefined {
    const r = c[0];
    const x = c[1];
    const d = (r + 1) * (r + 1) + x * x;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const zr = (r * r + x * x - 1) / d;
    const zi = (2 * x) / d;
    return [ zr, zi ];
  }

  public admittanceToReflectionCoefficient(c: Complex): Complex|undefined {
    const yr = c[0];
    const yi = c[1];
    const d = (yr + 1) * (yr + 1) + yi * yi;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const g = (1 - yr * yr - yi * yi) / d;
    const b = (-2 * yi) / d;

    if (Number.isNaN(g)) {
      console.log(d);
    }
    return [ g, b ];
  }

  public reflectionCoefficientToAdmittance(c: Complex): Complex|undefined {
    const g = c[0];
    const b = c[1];
    const d = (g + 1) * (g + 1) + b * b;
    if (Math.abs(d) < this.epsilon) {
      return undefined;
    }
    const yr = (1 - g * g - b * b) / d;
    const yi = (-2 * b) / d;
    return [ yr, yi ];
  }

  public resistanceCircle(n: number): Circle {
    return { p: [ (n / (n + 1)), 0 ], r: 1 / (n + 1) };
  }

  public reactanceCircle(n: number): Circle {
    return { p: [ 1, (1 / n) ], r: Math.abs(1 / n) };
  }

  public conductanceCircle(n: number): Circle {
    return { p: [ -(n / (n + 1)), 0 ], r: 1 / (n + 1) };
  }

  public susceptanceCircle(n: number): Circle {
    return { p: [ -1, -(1 / n) ], r: Math.abs(1 / n) };
  }
}
