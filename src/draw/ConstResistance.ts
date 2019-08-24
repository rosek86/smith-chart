import { ConstCircles, ArcData, Shapes } from './ConstCircles';

import { SmithGroup } from './SmithGroup';
import { SmithText } from './SmithText';
import { SmithScaler } from './SmithScaler';

import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from '../SmithArcsDefs';
import { SmithTicksData, SmithTicksShapes } from '../SmithArcsDefs';

import { Point } from '../shapes/Point';
import { TickDefRequired } from '../arcs/Tick';

export class ConstResistance extends ConstCircles {
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

    this.texts = this.drawResistanceLabels();
    this.major = this.drawResistanceMajor();
    this.minor = this.drawResistanceMinor();

    this.build();

    if (params.showMinor === false) {
      this.minor.hide();
    }
  }

  private drawResistanceMajor(): SmithGroup {
    const ticks = this.data.resistance.major;
    const width = this.opts.majorWidth;
    return this.drawResistance(ticks, width);
  }

  private drawResistanceMinor(): SmithGroup {
    const ticks = this.data.resistance.minor;
    const width = this.opts.minorWidth;
    return this.drawResistance(ticks, width);
  }

  private drawResistance(ticks: SmithTicksShapes, width: string): SmithGroup {
    const g = new SmithGroup();
    const shapes = this.getResistanceShapes(this.scaler, ticks);
    this.drawShapes(g.Element, this.opts.stroke, width, shapes);
    return g;
  }

  private getResistanceShapes(scaler: SmithScaler, data: SmithTicksShapes): Shapes {
    const lines = data.lines.map((l) => scaler.line(l));
    const circles = data.circles.map((c) => scaler.circle(c));
    const scaleArc = this.scaleArc.bind(this, scaler);
    const arcs = data.arcs.map(this.resistanceArc.bind(this)).map<ArcData>(scaleArc);
    return { lines, circles, arcs };
  }

  private resistanceArc(def: SmithArcDef): [Point, Point, number, boolean, boolean] {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.resistanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[1][0]));
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const arcOpts = def[SmithArcEntry.arcOptions];
    return [ p1, p2, c.r, arcOpts[0], arcOpts[1] ];
  }

  private drawResistanceLabels(): SmithGroup {
    const group = new SmithGroup()
      .attr('stroke',      'none')
      .attr('text-anchor', 'center')
      .attr('font-size',   '8')
      .attr('font-family', 'Verdana');
    for (const e of SmithArcsDefs.resistanceLabels()) {
      const d = e.definition;
      group.append(this.drawTickLabel(d, d.point.r));
    }
    for (const e of SmithArcsDefs.reactanceLabels()) {
      const d = e.definition;
      group.append(this.drawTickLabel(d, d.point.i));
    }
    return group;
  }

  private drawTickLabel(d: TickDefRequired, label: number): SmithText {
    const p = this.calcs.impedanceToReflectionCoefficient([ d.point.r, d.point.i ]);

    if (p === undefined) {
      throw new Error('Invalid text tick coordinates');
    }

    const text    = label.toFixed(d.dp);
    const dx      = d.transform.dx.toString();
    const dy      = d.transform.dy.toString();
    const rotate  = d.transform.rotate;

    return new SmithText(this.scaler.point(p), text, { rotate, dx, dy });
  }
}
