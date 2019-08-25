import { ConstCircles, ArcData, Shapes } from './ConstCircles';

import { SmithGroup } from './SmithGroup';
import { SmithText } from './SmithText';
import { SmithScaler } from './SmithScaler';

import { SmithArcDef, SmithArcEntry, SmithArcsDefs } from '../SmithArcsDefs';
import { SmithTicksData, SmithTicksShapes } from '../SmithArcsDefs';

import { Point } from '../shapes/Point';
import { TickDefRequired } from '../arcs/Tick';

export class ConstConductance extends ConstCircles {
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
    const ticks = this.data.resistance.major;
    const width = this.opts.majorWidth;
    return this.drawConductance(ticks, width);
  }

  private drawMinor(): SmithGroup {
    const ticks = this.data.resistance.minor;
    const width = this.opts.minorWidth;
    return this.drawConductance(ticks, width);
  }

  private drawConductance(ticks: SmithTicksShapes, width: string): SmithGroup {
    const g = new SmithGroup();
    const shapes = this.getShapes(this.scaler, ticks);
    this.drawShapes(g.Element, this.opts.stroke, width, shapes);
    return g;
  }

  private getShapes(scaler: SmithScaler, data: SmithTicksShapes): Shapes {
    const lines = data.lines.map((l) => scaler.line(l));
    const circles = data.circles.map((c) => scaler.circle(this.calcs.conductanceCircle(c)));
    const scaleArc = this.scaleArc.bind(this, scaler);
    const arcs = data.arcs.map(this.conductanceArc.bind(this)).map<ArcData>(scaleArc);
    return { lines, circles, arcs };
  }

  private conductanceArc(def: SmithArcDef): [Point, Point, number, boolean, boolean] {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.conductanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[1][0]));
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const arcOpts = def[SmithArcEntry.arcOptions];
    return [ p1, p2, c.r, arcOpts[0], arcOpts[1] ];
  }


  private drawLabels(): SmithGroup {
    const group = new SmithGroup()
      .attr('stroke',      'none')
      .attr('font-size',   '7')
      .attr('font-family', 'Verdana');
    for (const e of SmithArcsDefs.resistanceLabels()) {
      const d = e.definition;
      group.append(this.drawTickLabel(d));
    }
    return group;
  }

  private drawTickLabel(d: TickDefRequired): SmithText {
    const rc = this.calcs.admittanceToReflectionCoefficient([ d.point.r, d.point.i ]);

    if (rc === undefined) {
      throw new Error('Invalid text tick coordinates');
    }

    const value  = Math.abs(d.point.r).toFixed(d.dp);
    const dx     = this.scaler.r(d.transform.dx).toString();
    const dy     = this.scaler.r(d.transform.dy).toString();
    const rotate = this.calcRotationAngle(d, rc);

    const text = new SmithText(this.scaler.point(rc), value, {
      rotate, dx, dy,
      textAnchor: d.textAnchor,
      dominantBaseline: d.dominantBaseline,
    });

    return text;
  }

  private calcRotationAngle(d: TickDefRequired, rc: Point): number {
    const c = this.calcs.conductanceCircle(d.point.r);
    const angle = -this.calcs.tangentToCircleAngle(c, rc) + d.transform.rotate;
    return angle === 90 ? angle : angle + 180;
  }
}
