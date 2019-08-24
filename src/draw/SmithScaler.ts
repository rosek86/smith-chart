import * as d3 from 'd3';

import { Circle } from '../shapes/Circle';
import { Point } from '../shapes/Point';
import { Line } from '../shapes/Line';
import { Arc } from '../shapes/Arc';

export class SmithScaler {
  public constructor(
    public readonly x: d3.ScaleLinear<number, number>,
    public readonly y: d3.ScaleLinear<number, number>,
    public readonly r: d3.ScaleLinear<number, number>) {
  }

  public point(p: Point): Point {
    return [ this.x(p[0]), this.y(p[1]) ];
  }

  public pointInvert(p: Point): Point {
    return [ this.x.invert(p[0]), this.y.invert(p[1]) ];
  }

  public line(l: Line): Line {
    return { p1: this.point(l.p1), p2: this.point(l.p2) };
  }

  public lineInvert(l: Line): Line {
    return { p1: this.pointInvert(l.p1), p2: this.pointInvert(l.p2) };
  }

  public circle(c: Circle): Circle {
    return {
      p: this.point(c.p),
      r: this.r(c.r),
    };
  }

  public circleInvert(c: Circle): Circle {
    return {
      p: this.pointInvert(c.p),
      r: this.r.invert(c.r),
    };
  }

  public arc(a: Arc): Arc {
    return {
      p1: this.point(a.p1),
      p2: this.point(a.p2),
      r: this.r(a.r),
    };
  }

  public arcInvert(a: Arc): Arc {
    return {
      p1: this.pointInvert(a.p1),
      p2: this.pointInvert(a.p2),
      r: this.r.invert(a.r),
    };
  }
}
