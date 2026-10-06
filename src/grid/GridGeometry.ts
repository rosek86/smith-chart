import { SmithConstantCircle } from '../rf/SmithConstantCircle.js';
import { Complex } from '../math/Complex.js';
import type { TickDefRequired } from './Tick.js';
import type { SmithTicksShapes } from './types.js';
import type { Point } from '../math/geometry.js';

export type GridKind = 'resistance' | 'reactance' | 'conductance' | 'susceptance';
export type GridArc = [Point, Point, number, boolean, boolean];

export class GridGeometry {
  private constructor() {}
  private static readonly calcs = new SmithConstantCircle();
  private static readonly circles = {
    resistance: (value: number) => GridGeometry.calcs.resistanceCircle(value),
    reactance: (value: number) => GridGeometry.calcs.reactanceCircle(value),
    conductance: (value: number) => GridGeometry.calcs.conductanceCircle(value),
    susceptance: (value: number) => GridGeometry.calcs.susceptanceCircle(value),
  };
  private static readonly clipping: Record<GridKind, GridKind> = {
    resistance: 'reactance',
    reactance: 'resistance',
    conductance: 'susceptance',
    susceptance: 'conductance',
  };

  /** Normalized geometry only: no DOM, D3, or pixel coordinates. */
  public static shapes(kind: GridKind, data: SmithTicksShapes) {
    const circle = GridGeometry.circles[kind];
    const clip = GridGeometry.circles[GridGeometry.clipping[kind]];
    return {
      lines: data.lines,
      circles: data.circles.map(circle),
      arcs: data.arcs.map(([value, limits, options]): GridArc => {
        const c = circle(value);
        const [a, b] = limits.map(
          ([limit, index]) => GridGeometry.calcs.circleCircleIntersection(c, clip(limit))[index],
        );
        return [a, b, c.r, options[0], options[1]];
      }),
    };
  }

  public static label(kind: GridKind, definition: TickDefRequired) {
    const { point, transform, dp, textAnchor, dominantBaseline } = definition;
    const admittance = kind === 'conductance' || kind === 'susceptance';
    const real = kind === 'resistance' || kind === 'conductance';
    const rc = admittance
      ? GridGeometry.calcs.admittanceToRflCoeff(Complex.from(point.r, point.i))
      : GridGeometry.calcs.impedanceToRflCoeff(Complex.from(point.r, point.i));
    if (!rc) {
      throw new Error('Invalid grid label coordinates.');
    }
    const value = real ? point.r : point.i;
    const circle = GridGeometry.circles[kind](value);
    let rotate = -GridGeometry.calcs.tangentToCircleAngle(circle, rc.toVector()) + transform.rotate;
    if (admittance && rotate !== 90) {
      rotate += 180;
    }
    return {
      point: rc.toVector(),
      text: value.toFixed(dp),
      rotate,
      dx: transform.dx,
      dy: transform.dy,
      textAnchor,
      dominantBaseline,
    };
  }
}
