import { ConstCircles, ArcData, Shapes } from './ConstCircles';

import { SmithGroup } from './SmithGroup';
import { SmithText } from './SmithText';
import { SmithScaler } from './SmithScaler';

import { SmithArcDef, SmithArcEntry, SmithArcsDefs } from '../SmithArcsDefs';
import { SmithTicksData, SmithTicksShapes } from '../SmithArcsDefs';

import { Point } from '../shapes/Point';
import { TickDefRequired } from '../arcs/Tick';

export class ConstReactance extends ConstCircles {
  private data: SmithTicksData;

  protected major: SmithGroup;
  protected minor: SmithGroup;
  protected texts: SmithGroup;

  public constructor(params: {
      scaler: SmithScaler,
      showMinor: boolean,
      data: SmithTicksData,
    }) {
    super(params.scaler);

    this.data = params.data;

    this.texts = this.drawLabels();
    this.major = this.drawMajor();
    this.minor = this.drawMinor();

    this.build();

    if (params.showMinor === false) {
      this.minor.hide();
    }
  }

  private drawMajor(): SmithGroup {
    const ticks = this.data.reactance.major;
    const width = this.opts.majorWidth;
    return this.drawReactance(ticks, width);
  }

  private drawMinor(): SmithGroup {
    const ticks = this.data.reactance.minor;
    const width = this.opts.minorWidth;
    return this.drawReactance(ticks, width);
  }

  private drawReactance(ticks: SmithTicksShapes, width: string): SmithGroup {
    const g = new SmithGroup();
    const shapes = this.getShapes(this.scaler, ticks);
    this.drawShapes(g.Element, this.opts.stroke, width, shapes);
    return g;
  }

  private getShapes(scaler: SmithScaler, data: SmithTicksShapes): Shapes {
    const lines = data.lines.map((l) => scaler.line(l));
    const circles = data.circles.map((c) => scaler.circle(this.calcs.reactanceCircle(c)));
    const scaleArc = this.scaleArc.bind(this, scaler);
    const arcs = data.arcs.map(this.reactanceArc.bind(this)).map<ArcData>(scaleArc);
    return { lines, circles, arcs };
  }

  private reactanceArc(def: SmithArcDef): [Point, Point, number, boolean, boolean] {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.reactanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[1][0]));
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const arcOpts = def[SmithArcEntry.arcOptions];
    return [ p1, p2, c.r, arcOpts[0], arcOpts[1] ];
  }


  private drawLabels(): SmithGroup {
    const group = new SmithGroup()
      .attr('stroke',      'none')
      .attr('text-anchor', 'center')
      .attr('font-size',   '8')
      .attr('font-family', 'Verdana');
    for (const e of SmithArcsDefs.reactanceLabels()) {
      const d = e.definition;
      group.append(this.drawTickLabel(d));
    }
    return group;
  }

  private drawTickLabel(d: TickDefRequired): SmithText {
    const rc = this.calcs.impedanceToReflectionCoefficient([ d.point.r, d.point.i ]);

    if (rc === undefined) {
      throw new Error('Invalid text tick coordinates');
    }

    const value  = Math.abs(d.point.i).toFixed(d.dp);
    const dx     = this.scaler.r(d.transform.dx).toString();
    const dy     = this.scaler.r(d.transform.dy).toString();
    const rotate = this.calcRotationAngle(d, rc);

    const text = new SmithText(this.scaler.point(rc), value, {
      rotate, dx, dy,
      textAnchor: d.textAnchor
    });

    return text;
  }

  private calcRotationAngle(d: TickDefRequired, rc: Point): number {
    // calculate rotation angle
    // as tangent to a circle, angle = atag(a)
    const c = this.calcs.reactanceCircle(d.point.i);
    const rotate = Math.atan((c.p[0] - rc[0]) / (rc[1] - c.p[1])) * 180 / Math.PI;
    return -rotate + d.transform.rotate;
  }
}
