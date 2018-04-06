
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

interface ConstImpDrawOptions {
  stroke: string;
  minorWidth: string;
  majorWidth: string;
  textColor: string;
  showMinor: boolean;
}

export class ConstImpCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  private container: SmithGroup;

  private r: { major: SmithGroup; minor: SmithGroup; };
  private x: { major: SmithGroup; minor: SmithGroup; };

  private texts: SmithGroup;

  public constructor(opts: ConstImpDrawOptions) {
    const majorOpts = { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' };
    const minorOpts = { stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' };
    this.r = {
      major: this.drawResistanceMajor(majorOpts),
      minor: this.drawResistanceMinor(minorOpts),
    };
    this.x = {
      major: this.drawReactanceMajor(majorOpts),
      minor: this.drawReactanceMinor(minorOpts),
    };
    this.texts = this.drawImpedanceTexts(opts.textColor);
    this.container = this.build();

    if (opts.showMinor === false) {
      this.r.minor.hide();
      this.x.minor.hide();
    }
  }

  private build(): SmithGroup {
    return new SmithGroup()
      .append(this.r.minor)
      .append(this.r.major)
      .append(this.x.minor)
      .append(this.x.major)
      .append(this.texts)
      .hide();
  }

  public draw(): SmithGroup {
    return this.container;
  }

  public setDrawOptions(opts: ConstImpDrawOptions): void {
    const majorOpts = { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' };
    const minorOpts = { stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' };

    this.r.major.setDrawOptions(majorOpts);
    this.r.major.setDrawOptions(minorOpts);
    this.x.major.setDrawOptions(majorOpts);
    this.x.major.setDrawOptions(minorOpts);
    this.texts
      .attr('fill',        opts.textColor)
      .attr('font-family', 'Verdana')
      .attr('font-size',   '0.03')
      .attr('text-anchor', 'start');
  }

  private drawResistanceMajor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.resistanceMajor().forEach((def) => g.append(this.resistanceArc(def)));
    g.append(new SmithLine([ -1, 0 ], [ 1, 0 ]));
    return g;
  }

  private drawResistanceMinor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.resistanceMinor().forEach((def) => g.append(this.resistanceArc(def)));
    return g;
  }

  private drawReactanceMajor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.reactanceMajor().forEach((def) => g.append(this.reactanceArc(def)));
    return g;
  }

  private drawReactanceMinor(opts: SmithDrawOptions): SmithGroup {
    const g = new SmithGroup(opts);
    SmithArcsDefs.reactanceMinor().forEach((def) => g.append(this.reactanceArc(def)));
    return g;
  }

  private resistanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.resistanceCircle(def[SmithArcEntry.circle]);
    if (cc === undefined) {
      const arcOpts = def[SmithArcEntry.arcOptions];
      return new SmithArc([1, 0], [1-c.r*2, 0], c.r, arcOpts[0], arcOpts[1]);
    }
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private reactanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles]!;
    const c  = this.calcs.reactanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private drawArc(def: SmithArcDef, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[SmithArcEntry.clipCircles]!;
    const arcOpts = def[SmithArcEntry.arcOptions]!;
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    return new SmithArc(p1, p2, c.r, arcOpts[0], arcOpts[1]);
  }

  private drawImpedanceTexts(color: string): SmithGroup {
    const group = new SmithGroup()
      .attr('fill',        color)
      .attr('stroke',      'none')
      .attr('font-family', 'Verdana')
      .attr('font-size',   '0.03')
      .attr('text-anchor', 'start');

    for (const e of SmithArcsDefs.textsTicks()) {
      const p = this.calcs.impedanceToReflectionoefficient([ e[0], 0 ])!;
      group.append(new SmithText(p, e[0].toFixed(e[1]), { rotate: 90, dy: '0.004', dx: '0.001' }));
    }
    return group;
  }

  public show(): ConstImpCircles {
    this.container.show();
    return this;
  }

  public showMinor(): ConstImpCircles {
    this.r.minor.show();
    this.x.minor.show();
    return this;
  }

  public hide(): ConstImpCircles {
    this.container.hide();
    return this;
  }

  public hideMinor(): ConstImpCircles {
    this.r.minor.hide();
    this.x.minor.hide();
    return this;
  }
}
