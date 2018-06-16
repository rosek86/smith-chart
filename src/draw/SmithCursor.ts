import { SmithGroup } from './SmithGroup';
import { SmithCircle } from './SmithCircle';
import { SmithLine } from './SmithLine';
import { SmithPath } from './SmithPath';

import { SmithConstantCircle } from '../SmithConstantCircle';
import { Point } from './Point';
import { SmithArc } from './SmithArc';

interface Transform {
  x: number;
  y: number;
  k: number;
}

interface DrawOptions {
  point:      { radius: number; color: string; };
  impedance:  { width: number;  color: string; };
  admittance: { width: number;  color: string; };
}

export class SmithCursor {
  private epsilon = 1.5e-4;

  private drawingOpts: DrawOptions = {
    point:      { radius: 0.01, color: 'red',  },
    impedance:  { width: 0.005, color: 'red'   },
    admittance: { width: 0.005, color: 'green' },
  };

  private calcs = new SmithConstantCircle();
  private zClipCircle = this.calcs.resistanceCircle(0);
  private yClipCircle = this.calcs.conductanceCircle(0);

  private rc: Point = [ 0, 0 ];

  private group: SmithGroup;
  private point: SmithCircle;

  private impedance: {
    group: SmithGroup,
    resistance: { circle: SmithPath; };
    reactance: { arc: SmithArc; line: SmithLine; };
  };

  private admittance: {
    group: SmithGroup,
    conductance: { circle: SmithPath; };
    susceptance: { arc: SmithArc; line: SmithLine; };
  };

  private moveHandler: ((rc: Point) => void)|null = null;

  public constructor(private transform: Transform = { x: 0, y: 0, k: 1 }) {
    this.group = new SmithGroup();

    this.impedance = {
      group: new SmithGroup({
        stroke: this.drawingOpts.impedance.color,
        strokeWidth: this.drawingOpts.impedance.width.toString(),
        fill: 'none'
      }),
      resistance: { circle: new SmithPath(), },
      reactance: {
        arc: new SmithArc([ 1, 0 ], [ 0, 1 ], 5, false, false),
        line: new SmithLine([ -1, 0 ], [ 1, 0 ]),
      }
    };

    this.admittance = {
      group: new SmithGroup({
        stroke: this.drawingOpts.admittance.color,
        strokeWidth: this.drawingOpts.admittance.width.toString(),
        fill: 'none',
      }),
      conductance: { circle: new SmithPath(), },
      susceptance: {
        arc: new SmithArc([1, 0], [0, 1], 5, false, false),
        line: new SmithLine([-1, 0], [1, 0])
      },
    };

    this.point = new SmithCircle({
      p: [0, 0], r: this.drawingOpts.point.radius
    }, {
      stroke: 'none', strokeWidth: 'none',
      fill: this.drawingOpts.point.color
    });

    this.hide();
    this.appendAll();
  }

  private appendAll(): void {
    this.impedance.group
      .append(this.impedance.resistance.circle)
      .append(this.impedance.reactance.arc)
      .append(this.impedance.reactance.line);

    this.admittance.group
      .append(this.admittance.conductance.circle)
      .append(this.admittance.susceptance.arc)
      .append(this.admittance.susceptance.line);

    this.group
      .append(this.admittance.group)
      .append(this.impedance.group)
      .append(this.point);
  }

  public get Group(): SmithGroup {
    return this.group;
  }

  public get Position(): Point {
    return this.rc;
  }

  public set Position(rc: Point) {
    if (this.isWithinPlot(rc) === false) {
      this.hide();
      return;
    }

    this.rc = rc;

    const z = this.calcs.reflectionCoefficientToImpedance(rc);
    const y = this.calcs.reflectionCoefficientToAdmittance(rc);

    this.movePoint(rc);
    this.moveResistance(z);
    this.moveReactance(z);
    this.moveConductance(y);
    this.moveSusceptance(y);
    this.show();

    setTimeout(() => {
      this.moveHandler && this.moveHandler(rc);
    }, 0);
  }

  private isWithinPlot(p: Point): boolean {
    return this.calcs.isPointWithinCircle(p, this.zClipCircle);
  }

  private movePoint(rc: Point): void {
    this.point.move({ p: rc, r: this.drawingOpts.point.radius / this.transform.k });
  }

  private moveResistance(z: Point|undefined): void {
    if (z === undefined) {
      this.impedance.resistance.circle.hide();
      return;
    }
    this.impedance.resistance.circle.show();

    const r = this.calcs.resistanceCircle(z[0]).r;
    const x = 1 - 2 * r;

    this.impedance.resistance.circle.move(`M1,0 A${r},${r} 0 1,0 ${x},0 A${r},${r} 0 1,0 1,0`);
  }

  private moveReactance(z: Point|undefined): void {
    if (z === undefined || Math.abs(z[1]) < this.epsilon) {
      this.impedance.reactance.line.show();
      this.impedance.reactance.arc.hide();
      return;
    }
    this.impedance.reactance.line.hide();
    this.impedance.reactance.arc.show();

    const c  = this.calcs.reactanceCircle(z[1]);
    const p = this.calcs.circleCircleIntersection(c, this.zClipCircle);

    this.impedance.reactance.arc.move(p[0], p[1], c.r, false, false);
  }

  private moveConductance(y: Point|undefined): void {
    if (y === undefined) {
      this.admittance.conductance.circle.hide();
      return;
    }
    this.admittance.conductance.circle.show();

    const r = this.calcs.conductanceCircle(y[0]).r;
    const x = -1 + 2 * r;

    this.admittance.conductance.circle.move(`M-1,0 A${r},${r} 0 1,0 ${x},0 A${r},${r} 0 1,0 -1,0`);
  }

  private moveSusceptance(y: Point|undefined) {
    if (y === undefined || Math.abs(y[1]) < this.epsilon) {
      this.admittance.susceptance.line.show();
      this.admittance.susceptance.arc.hide();
      return;
    }
    this.admittance.susceptance.line.hide();
    this.admittance.susceptance.arc.show();

    const c  = this.calcs.susceptanceCircle(y[1]);
    const p = this.calcs.circleCircleIntersection(c, this.yClipCircle);

    this.admittance.susceptance.arc.move(p[0], p[1], c.r, false, false);
  }

  public zoom(transform: Transform): void {
    this.transform = transform;

    const k = transform.k;
    this.point.Element.attr('r', this.drawingOpts.point.radius / k);
    this.impedance.group.attr('stroke-width', this.drawingOpts.impedance.width / k);
    this.admittance.group.attr('stroke-width', this.drawingOpts.admittance.width / k);
  }

  public show(): void {
    this.group.show();
  }

  public hide(): void {
    this.group.hide();
  }

  public setMoveHandler(handler: (rc: Point) => void): void {
    this.moveHandler = handler;
  }

  public setDrawOptions(opts: DrawOptions): void {
    this.drawingOpts = opts;
  }
}
