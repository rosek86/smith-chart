
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

interface ConstAdmDrawOptions {
  stroke: string, minorWidth: string, majorWidth: string,
}

export class ConstAdmCircles {

  private calcs: SmithConstantCircle = new SmithConstantCircle();

  public draw(opts: ConstAdmDrawOptions): SmithGroup {
    const group = new SmithGroup();

    group.append(this.drawConductanceCircles(opts));
    group.append(this.drawSusceptanceCircles(opts));
    group.append(this.drawReactanceAxis({
      stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none'
    }));
    group.append(this.drawResistanceAxis({
      stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none'
    }));
    group.append(this.drawAdmittanceTexts());

    group.hide();
    return group;
  }

  private drawConductanceCircles(opts: ConstAdmDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' });
    for (const def of SmithArcsDefs.resistanceMajor()) {
      majorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' });
    for (const def of SmithArcsDefs.resistanceMinor()) {
      minorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawSusceptanceCircles(opts: ConstAdmDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' });
    for (const def of SmithArcsDefs.reactanceMajor()) {
      majorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' });
    for (const def of SmithArcsDefs.reactanceMinor()) {
      minorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawConductanceCircle(def: SmithArcDef): SmithShape|null {
    if (def[SmithArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.calcs.conductanceCircle(def[SmithArcEntry.circle]));
    }
    return this.conductanceArc(def);
  }

  private drawSusceptanceCircle(def: SmithArcDef): SmithShape|null {
    return this.susceptanceArc(def);
  }


  private conductanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.calcs.conductanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private susceptanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.calcs.susceptanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private drawReactanceAxis(opts: SmithDrawOptions): SmithCircle {
    return new SmithCircle(this.calcs.resistanceCircle(0), opts);
  }

  private drawResistanceAxis(opts: SmithDrawOptions): SmithShape {
    return  new SmithLine([ -1, 0 ], [ 1, 0 ], opts);
  }

  private drawAdmittanceTexts(): SmithGroup {
    const group = new SmithGroup({ stroke: 'none', fill: 'black', });
    group.Element.attr('font-family', 'Verdana');
    group.Element.attr('font-size',   '0.03');
    group.Element.attr('text-anchor', 'start');
    for (const e of SmithArcsDefs.textsTicks()) {
      const p = this.calcs.admittanceToReflectionCoefficient([ e[0], 0 ])!;
      group.append(new SmithText(p, e[0].toFixed(e[1]), { rotate: -90, dy: '0.004', dx: '0.001' }));
    }
    return group;
  }

  private drawArc(def: SmithArcDef, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[SmithArcEntry.clipCircles]!;
    const arcOpts = def[SmithArcEntry.arcOptions]!;

    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const r  = c.r;

    const largeArc = arcOpts[0];
    const sweep    = arcOpts[1];

    return new SmithArc(p1, p2, r, largeArc, sweep);
  }

}
