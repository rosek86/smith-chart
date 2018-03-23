import { Circle } from './draw/Circle';
import { Point } from './draw/Point';

type Vector = [ number, number ];

export class SmithConstantCircle {
  public resistance(n: number): Circle {
    return { p: [ (n / (n + 1)), 0 ], r: 1 / (n + 1) };
  }

  public reactance(n: number): Circle {
    return { p: [ 1, (1 / n) ], r: 1 / n };
  }

  public conductance(n: number): Circle {
    return { p: [ -(n / (n + 1)), 0 ], r: 1 / (n + 1) };
  }

  public susceptance(n: number): Circle {
    return { p: [ -1, -(1 / n) ], r: 1 / n };
  }

  public resistanceFromPoint(p: Point): Circle {
    const r = this.constantCircleRadiusFromVectors([ p[0] - 1, p[1] ], [ -1, 0 ]);
    return { p: [ 1 - r, 0 ], r };
  }

  public reactanceFromPoint(p: Point): Circle {
    const r = this.constantCircleRadiusFromVectors([ p[0] - 1, p[1] ], [ 0, 1 ]);
    const y = p[1] >= 0 ? r : -r;
    return { p: [ 1, y ], r };
  }

  public conductanceFromPoint(p: Point): Circle {
    const r = this.constantCircleRadiusFromVectors([ p[0] + 1, p[1] ], [ 1, 0 ]);
    return { p: [ -1 + r, 0 ], r };
  }

  public susceptanceFromPoint(p: Point): Circle {
    const r = this.constantCircleRadiusFromVectors([ p[0] + 1, p[1] ], [ 0, 1 ]);
    const y = p[1] >= 0 ? r : -r;
    return { p: [ -1, y ], r };
  }

  private constantCircleRadiusFromVectors(v1: Vector, v2: Vector): number {
    const cosA = this.cosAlfaBetweenVectors(v1, v2);

    const a = this.vectorLength(v1) / 2;
    return Math.abs(a / cosA);
  }

  private cosAlfaBetweenVectors(v1: Vector, v2: Vector): number {
    const l1 = this.vectorLength(v1);
    const l2 = this.vectorLength(v2);
    return (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
  }

  private vectorLength(v: Vector): number {
    return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
  }
}
