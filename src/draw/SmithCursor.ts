import { SmithGroup } from './SmithGroup';
import { SmithCircle } from './SmithCircle';
import { SmithLine } from './SmithLine';
import { SmithArc } from './SmithArc';
import { SmithScaler } from './SmithScaler';

import { SmithConstantCircle } from '../SmithConstantCircle';
import { Point } from '../shapes/Point';

interface DrawOptions {
  point: { radius: number; color: string; };
  impedance: { width: number;  color: string; };
  admittance: { width: number;  color: string; };
}

export class SmithCursor {
  private epsilon = 1.5e-6;

  private drawingOpts: DrawOptions = {
    point:      { radius: 5, color: 'red',  },
    impedance:  { width:  1, color: 'red'   },
    admittance: { width:  1, color: 'green' },
  };

  private calcs = new SmithConstantCircle();
  private zClipCircle = this.calcs.resistanceCircle(0);
  private yClipCircle = this.calcs.conductanceCircle(0);

  private rc: Point = [ 0, 0 ];

  private group: SmithGroup;
  private point: SmithLine;

  private impedance: {
    group: SmithGroup,
    resistance: { circle: SmithCircle; };
    reactance: { arc: SmithArc; line: SmithLine; };
  };

  private admittance: {
    group: SmithGroup,
    conductance: { circle: SmithCircle; };
    susceptance: { arc: SmithArc; line: SmithLine; };
  };

  private moveHandler: ((rc: Point) => void)|null = null;

  public constructor(private scaler: SmithScaler) {
    this.group = new SmithGroup();

    this.impedance = {
      group: new SmithGroup({
        stroke: this.drawingOpts.impedance.color,
        strokeWidth: this.drawingOpts.impedance.width.toString(),
        fill: 'none'
      }),
      resistance: { circle: new SmithCircle({p: [0, 0], r: 1}), },
      reactance: {
        arc: new SmithArc([ 1, 0 ], [ 0, 1 ], 5, false, false),
        line: new SmithLine([ -1, 0 ], [ 1, 0 ]),
      }
    };
    this.impedance.resistance.circle.nonScalingStroke();
    this.impedance.reactance.arc.nonScalingStroke();
    this.impedance.reactance.line.nonScalingStroke();

    this.admittance = {
      group: new SmithGroup({
        stroke: this.drawingOpts.admittance.color,
        strokeWidth: this.drawingOpts.admittance.width.toString(),
        fill: 'none',
      }),
      conductance: { circle: new SmithCircle({p: [0, 0], r: 1}), },
      susceptance: {
        arc: new SmithArc([1, 0], [0, 1], 5, false, false),
        line: new SmithLine([-1, 0], [1, 0])
      },
    };
    this.admittance.conductance.circle.nonScalingStroke();
    this.admittance.susceptance.arc.nonScalingStroke();
    this.admittance.susceptance.line.nonScalingStroke();

    this.point = new SmithLine([0, 0], [0, 0], {
      stroke: this.drawingOpts.point.color,
      strokeWidth: this.drawingOpts.point.radius.toString(),
      fill: 'none'
    });
    this.point.nonScalingStroke();
    this.point.setStrokeLinecap('round');

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
      if (this.moveHandler) {
        this.moveHandler(rc);
      }
    }, 0);
  }

  private isWithinPlot(p: Point): boolean {
    return this.calcs.isPointWithinCircle(p, this.zClipCircle);
  }

  private movePoint(rc: Point): void {
    this.point.move(this.scaler.point(rc), this.scaler.point(rc));
  }

  private moveResistance(z: Point|undefined): void {
    if (z === undefined) {
      this.impedance.resistance.circle.hide();
      return;
    }
    this.impedance.resistance.circle.show();

    const c = this.scaler.circle(this.calcs.resistanceCircle(z[0]));
    this.impedance.resistance.circle.move(c);
  }

  private moveReactance(z: Point|undefined): void {
    if (z === undefined || Math.abs(z[1]) < this.epsilon) {
      this.impedance.reactance.line.move(
        this.scaler.point([ -1, 0 ]), this.scaler.point([ 1, 0 ])
      );
      this.impedance.reactance.line.show();
      this.impedance.reactance.arc.hide();
      return;
    }
    this.impedance.reactance.line.hide();
    this.impedance.reactance.arc.show();

    const c = this.calcs.reactanceCircle(z[1]);
    const p = this.calcs.circleCircleIntersection(c, this.zClipCircle);

    p[0] = this.scaler.point(p[0]);
    p[1] = this.scaler.point(p[1]);
    c.r = this.scaler.r(c.r);

    this.impedance.reactance.arc.move(p[0], p[1], c.r, false, true);
  }

  private moveConductance(y: Point|undefined): void {
    if (y === undefined) {
      this.admittance.conductance.circle.hide();
      return;
    }
    this.admittance.conductance.circle.show();

    const c = this.scaler.circle(this.calcs.conductanceCircle(y[0]));
    this.admittance.conductance.circle.move(c);
  }

  private moveSusceptance(y: Point|undefined) {
    if (y === undefined || Math.abs(y[1]) < this.epsilon) {
      this.admittance.susceptance.line.move(
        this.scaler.point([ -1, 0 ]), this.scaler.point([ 1, 0 ])
      );
      this.admittance.susceptance.line.show();
      this.admittance.susceptance.arc.hide();
      return;
    }
    this.admittance.susceptance.line.hide();
    this.admittance.susceptance.arc.show();

    const c = this.calcs.susceptanceCircle(y[1]);
    const p = this.calcs.circleCircleIntersection(c, this.yClipCircle);

    p[0] = this.scaler.point(p[0]);
    p[1] = this.scaler.point(p[1]);
    c.r = this.scaler.r(c.r);

    this.admittance.susceptance.arc.move(p[0], p[1], c.r, false, true);
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
