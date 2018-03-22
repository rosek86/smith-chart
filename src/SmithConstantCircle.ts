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
    const v1: Vector = [ p[0] - 1, p[1] - 0 ];
    const v2: Vector = [ 0    - 1, 0    - 0 ];

    const cosA = this.cosAlfaBetweenVectors(v1, v2);

    const m = Math.sqrt(Math.pow(v1[0], 2) + Math.pow(v1[1], 2));
    const a = m / 2;
    const r = Math.abs(a / cosA);

    return { p: [ 1 - r, 0 ], r };
  }

  public conductanceFromPoint(p: Point): Circle {
    const v1: Vector = [ p[0] + 1, p[1] - 0 ];
    const v2: Vector = [ 0    + 1, 0    - 0 ];

    const cosA = this.cosAlfaBetweenVectors(v1, v2);

    const m = Math.sqrt(Math.pow(v1[0], 2) + Math.pow(v1[1], 2));
    const a = m / 2;
    const r = Math.abs(a / cosA);

    return { p: [ -1 + r, 0 ], r };
  }

  private cosAlfaBetweenVectors(v1: [number, number], v2: [number, number]): number {
    const scalar = v1[0] * v2[0] + v1[1] * v2[1];
    const v1m = Math.sqrt(Math.pow(v1[0], 2) + Math.pow(v1[1], 2));
    const v2m = Math.sqrt(Math.pow(v2[0], 2) + Math.pow(v2[1], 2));
    const cosAlfa = scalar / (v1m * v2m);
    return cosAlfa;
  }
}
