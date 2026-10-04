import { SmithConstantCircle } from '../SmithConstantCircle.js';
import { Complex } from '../complex/Complex.js';
import type { TickDefRequired } from '../arcs/Tick.js';
import type { SmithTicksShapes } from './types.js';
import type { Point } from '../shapes/Point.js';

export type GridKind = 'resistance' | 'reactance' | 'conductance' | 'susceptance';
const calcs = new SmithConstantCircle();
const circles = {
  resistance: (value: number) => calcs.resistanceCircle(value),
  reactance: (value: number) => calcs.reactanceCircle(value),
  conductance: (value: number) => calcs.conductanceCircle(value),
  susceptance: (value: number) => calcs.susceptanceCircle(value),
};
const clipping: Record<GridKind, GridKind> = {
  resistance: 'reactance',
  reactance: 'resistance',
  conductance: 'susceptance',
  susceptance: 'conductance',
};
export type GridArc = [Point, Point, number, boolean, boolean];

/** Normalized geometry only: no DOM, D3, or pixel coordinates. */
export function gridGeometry(kind: GridKind, data: SmithTicksShapes) {
  const circle = circles[kind];
  const clip = circles[clipping[kind]];
  return {
    lines: data.lines,
    circles: data.circles.map(circle),
    arcs: data.arcs.map(([value, limits, options]): GridArc => {
      const c = circle(value);
      const [a, b] = limits.map(
        ([limit, index]) => calcs.circleCircleIntersection(c, clip(limit))[index],
      );
      return [a, b, c.r, options[0], options[1]];
    }),
  };
}

export function gridLabel(kind: GridKind, definition: TickDefRequired) {
  const { point, transform, dp, textAnchor, dominantBaseline } = definition;
  const admittance = kind === 'conductance' || kind === 'susceptance';
  const real = kind === 'resistance' || kind === 'conductance';
  const rc = admittance
    ? calcs.admittanceToRflCoeff(Complex.from(point.r, point.i))
    : calcs.impedanceToRflCoeff(Complex.from(point.r, point.i));
  if (!rc) throw new Error('Invalid grid label coordinates.');
  const value = real ? point.r : point.i;
  const circle = circles[kind](value);
  let rotate = -calcs.tangentToCircleAngle(circle, rc.toVector()) + transform.rotate;
  if (admittance && rotate !== 90) rotate += 180;
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
