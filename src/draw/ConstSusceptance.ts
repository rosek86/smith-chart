import { ConstCircles, ArcData, Shapes } from './ConstCircles';

import { SmithGroup } from './SmithGroup';
import { SmithText } from './SmithText';
import { SmithScaler } from './SmithScaler';

import { SmithArcDef, SmithArcEntry } from '../SmithArcsDefs';
import { SmithTicksData, SmithTicksShapes } from '../SmithArcsDefs';

import { Point } from '../shapes/Point';

export class ConstSusceptance extends ConstCircles {
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
    return this.drawSusceptance(ticks, width);
  }

  private drawMinor(): SmithGroup {
    const ticks = this.data.reactance.minor;
    const width = this.opts.minorWidth;
    return this.drawSusceptance(ticks, width);
  }

  private drawSusceptance(ticks: SmithTicksShapes, width: string): SmithGroup {
    const g = new SmithGroup();
    const shapes = this.getShapes(this.scaler, ticks);
    this.drawShapes(g.Element, this.opts.stroke, width, shapes);
    return g;
  }

  private getShapes(scaler: SmithScaler, data: SmithTicksShapes): Shapes {
    const lines = data.lines.map((l) => scaler.line(l));
    const circles = data.circles.map((c) => scaler.circle(this.calcs.susceptanceCircle(c)));
    const scaleArc = this.scaleArc.bind(this, scaler);
    const arcs = data.arcs.map(this.susceptanceArc.bind(this)).map<ArcData>(scaleArc);
    return { lines, circles, arcs };
  }

  private susceptanceArc(def: SmithArcDef): [Point, Point, number, boolean, boolean] {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.susceptanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[1][0]));
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const arcOpts = def[SmithArcEntry.arcOptions];
    return [ p1, p2, c.r, arcOpts[0], arcOpts[1] ];
  }

  private drawLabels(): SmithGroup {
    const group = new SmithGroup()
      .attr('stroke',      'none')
      .attr('text-anchor', 'start');
    return group;
  }
}
