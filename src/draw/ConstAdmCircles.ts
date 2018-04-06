
import { SmithGroup } from './SmithGroup';
import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from '../SmithArcsDefs';
import { SmithShape } from './SmithShape';
import { SmithCircle } from './SmithCircle';
import { SmithArc } from './SmithArc';
import { SmithLine } from './SmithLine';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { Circle } from './Circle';
import { Point } from './Point';
import { SmithDrawOptions } from './SmithDrawOptions';
import * as d3 from 'd3';

interface ConstAdmDrawOptions {
  stroke: string;
  minorWidth: string;
  majorWidth: string;
  textColor: string;
  showMinor: boolean;
}

export class ConstAdmCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  private container: SmithGroup;

  private g: { major: SmithGroup; minor: SmithGroup; };
  private b: { major: SmithGroup; minor: SmithGroup; };

  private texts: SmithGroup;

  public constructor(opts: ConstAdmDrawOptions) {
    const majorOpts = { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' };
    const minorOpts = { stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' };
    this.g = {
      major: this.drawConductanceMajor(majorOpts),
      minor: this.drawConductanceMinor(minorOpts),
    };
    this.b = {
      major: this.drawSusceptanceMajor(majorOpts),
      minor: this.drawSusceptanceMinor(minorOpts),
    };
    this.texts = this.drawAdmittanceTexts(opts.textColor);
    this.container = this.build();

    if (opts.showMinor === false) {
      this.g.minor.hide();
      this.b.minor.hide();
    }
  }

  private build(): SmithGroup {
    return new SmithGroup()
      .append(this.g.minor)
      .append(this.g.major)
      .append(this.b.minor)
      .append(this.b.major)
      .append(this.texts)
      .hide();
  }

  public draw(): SmithGroup {
    return this.container;
  }

  private drawConductanceMajor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.resistanceMajor().forEach((def) => g.append(this.conductanceArc(def)));
    g.append(new SmithLine([ -1, 0 ], [ 1, 0 ]));
    return g;
  }

  private drawConductanceMinor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.resistanceMinor().forEach((def) => g.append(this.conductanceArc(def)));
    return g;
  }

  private drawSusceptanceMajor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.reactanceMajor().forEach((def) => g.append(this.susceptanceArc(def)));
    return g;
  }

  private drawSusceptanceMinor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.reactanceMinor().forEach((def) => g.append(this.susceptanceArc(def)));
    return g;
  }

  private conductanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.conductanceCircle(def[SmithArcEntry.circle]);
    if (cc === undefined) {
      const arcOpts = def[SmithArcEntry.arcOptions];
      return new SmithArc([-1, 0], [-1+c.r*2, 0], c.r, arcOpts[0], arcOpts[1]);
    }
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private susceptanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles]!;
    const c  = this.calcs.susceptanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private drawAdmittanceTexts(color: string): SmithGroup {
    const group = new SmithGroup()
      .attr('fill',        color)
      .attr('stroke',      'none')
      .attr('font-family', 'Verdana')
      .attr('font-size',   '0.03')
      .attr('text-anchor', 'start');

    SmithArcsDefs.textsTicks().forEach((e) => {
      const p = this.calcs.admittanceToReflectionCoefficient([ e[0], 0 ])!;
      group.append(new SmithText(p, e[0].toFixed(e[1]), { rotate: -90, dy: '0.004', dx: '0.001' }));
    });

    return group;
  }

  private drawArc(def: SmithArcDef, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[SmithArcEntry.clipCircles]!;
    const arcOpts = def[SmithArcEntry.arcOptions]!;
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    return new SmithArc(p1, p2, c.r, arcOpts[0], arcOpts[1]);
  }

  public setDrawOptions(opts: ConstAdmDrawOptions): void {
    const majorOpts = { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' };
    const minorOpts = { stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' };

    this.g.major.setDrawOptions(majorOpts);
    this.g.major.setDrawOptions(minorOpts);
    this.b.major.setDrawOptions(majorOpts);
    this.b.major.setDrawOptions(minorOpts);
    this.texts
      .attr('fill',        opts.textColor)
      .attr('font-family', 'Verdana')
      .attr('font-size',   '0.03')
      .attr('text-anchor', 'start');
  }

  public show(): ConstAdmCircles {
    this.container.show();
    return this;
  }

  public showMinor(): ConstAdmCircles {
    this.g.minor.show();
    this.b.minor.show();
    return this;
  }

  public hide(): ConstAdmCircles {
    this.container.hide();
    return this;
  }

  public hideMinor(): ConstAdmCircles {
    this.g.minor.hide();
    this.b.minor.hide();
    return this;
  }
}
