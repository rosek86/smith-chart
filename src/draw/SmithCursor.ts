import { SmithGroup } from "./SmithGroup";
import { SmithCircle } from "./SmithCircle";
import { SmithLine } from "./SmithLine";

import { SmithConstantCircle } from '../SmithConstantCircle';
import { Point } from "./Point";
import { SmithArc } from "./SmithArc";
import { Circle } from "./Circle";

interface Transform {
  x: number;
  y: number;
  k: number;
}

export class SmithCursor {
  private epsilon = 1.5e-3;

  private calcs = new SmithConstantCircle();
  private zClipCircle = this.calcs.resistanceCircle(0);
  private yClipCircle = this.calcs.conductanceCircle(0);

  private moveHandler: ((rc: Point) => void)|null = null;

  private group: SmithGroup;
  private point: SmithCircle;


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

  public constructor(private container: SmithGroup, private transform: Transform) {
    this.group = new SmithGroup();

    this.impedance = {
      group: new SmithGroup({ stroke: 'red', strokeWidth: '0.005', fill: 'none' }),
      resistance: {
        circle: new SmithCircle({ p: [ 0, 0 ], r: 0 }),
      },
      reactance: {
        arc: new SmithArc([1, 0], [0, 1], 5, false, false),
        line: new SmithLine([ -1, 0 ], [ 1, 0 ]),
      }
    };

    this.admittance = {
      group: new SmithGroup({ stroke: 'green', strokeWidth: '0.005', fill: 'none', }),
      conductance: {
        circle: new SmithCircle({ p: [ 0, 0 ], r: 0 }),
      },
      susceptance: {
        arc: new SmithArc([1, 0], [0, 1], 5, false, false),
        line: new SmithLine([-1, 0], [1, 0])
      },
    };

    this.point = new SmithCircle(
      { p: [0, 0], r: 0.01 },
      { stroke: 'none', strokeWidth: 'none', fill: 'red' }
    );

    this.impedance.group
      .append(this.impedance.resistance.circle)
      .append(this.impedance.reactance.arc)
      .append(this.impedance.reactance.line);

    this.admittance.group
      .append(this.admittance.conductance.circle)
      .append(this.admittance.susceptance.arc)
      .append(this.admittance.susceptance.line);

    this.group
      .append(this.impedance.group)
      .append(this.admittance.group)
      .append(this.point);

    this.hide();
    this.container.append(this.group);
  }

  public move(rc: Point): void {
    if (this.isWithinPlot(rc) === false) {
      this.hide();
      return;
    }

    this.point.move({ p: rc, r: 0.01 / this.transform.k });

    const z = this.calcs.reflectionCoefficientToImpedance(rc);

    if (z === undefined) {
      this.impedance.resistance.circle.hide();
    } else {
      this.impedance.resistance.circle.show();
      this.impedance.resistance.circle.move(this.calcs.resistanceCircle(z[0]));
    }

    if (z === undefined || Math.abs(z[1]) < this.epsilon) {
      this.impedance.reactance.line.show();
      this.impedance.reactance.arc.hide();
    } else {
      this.impedance.reactance.line.hide();
      this.impedance.reactance.arc.show();

      const c  = this.calcs.reactanceCircle(z[1]);
      const p = this.calcs.circleCircleIntersection(c, this.zClipCircle);
      this.impedance.reactance.arc.move(p[0], p[1], c.r, false, false);
    }

    const y = this.calcs.reflectionCoefficientToAdmittance(rc);

    if (y === undefined) {
      this.admittance.conductance.circle.hide();
    } else {
      this.admittance.conductance.circle.show();
      this.admittance.conductance.circle.move(this.calcs.conductanceCircle(y[0]));
    }

    if (y === undefined || Math.abs(y[1]) < this.epsilon) {
      this.admittance.susceptance.line.show();
      this.admittance.susceptance.arc.hide();
    } else {
      this.admittance.susceptance.line.hide();
      this.admittance.susceptance.arc.show();

      const c  = this.calcs.susceptanceCircle(y[1]);
      const p = this.calcs.circleCircleIntersection(c, this.yClipCircle);
      this.admittance.susceptance.arc.move(p[0], p[1], c.r, false, false);
    }

    this.show();
    this.moveHandler && this.moveHandler(rc);
  }

  private isWithinPlot(p: Point): boolean {
    const c = this.calcs.resistanceCircle(0);
    return (Math.pow(p[0] - c.p[0], 2) + Math.pow(p[1] - c.p[1], 2)) <= (Math.pow(c.r, 2));
  }

  public zoom(transform: Transform): void {
    this.transform = transform;
    const k = transform.k;

    this.point.Element.attr('r', 0.01 / k);
    this.impedance.group.Element.attr('stroke-width', 0.005 / k);
    this.admittance.group.Element.attr('stroke-width', 0.005 / k);
  }

  public show(): void {
    this.group.Element.attr('opacity', null);
  }

  public hide(): void {
    this.group.Element.attr('opacity', '0');
  }

  public setMoveHandler(handler: (rc: Point) => void): void {
    this.moveHandler = handler;
  }
}
