import * as d3 from 'd3';
import { sprintf } from 'sprintf-js';

import { Point } from './draw/Point';
import { Circle } from './draw/Circle';

import { SmithSvg } from './draw/SmithSvg';
import { SmithShape } from './draw/SmithShape';
import { SmithGroup } from './draw/SmithGroup';
import { SmithArc } from './draw/SmithArc';
import { SmithCircle } from './draw/SmithCircle';
import { SmithLine } from './draw/SmithLine';
import { SmithText } from './draw/SmithText';

import { SmithConstantCircle } from './SmithConstantCircle';
import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from './SmithArcsDefs';

type Vector = [ number, number ];

interface SmithCirclesDrawOptions {
  stroke: string, minorWidth: string, majorWidth: string,
}

export class Smith {
  private svg: SmithSvg;
  private defs: d3.Selection<SVGElement, {}, null, undefined>;
  private container: SmithGroup;
  private textGroup: SmithGroup;
  private mainGroup: SmithGroup|null = null;
  private interactionGroup: SmithGroup|null = null;

  private constantCircle: SmithConstantCircle = new SmithConstantCircle();

  constructor(private selector: string, private size: number) {
    this.svg = new SmithSvg(size);
    this.container = new SmithGroup().rotateY();
    this.textGroup = new SmithGroup({ stroke: 'none', fill: 'black', });
    this.textGroup.Element.attr('font-family', 'Verdana');
    this.textGroup.Element.attr('font-size',   '0.03');
    this.textGroup.Element.attr('text-anchor', 'start');

    this.svg.append(this.container);
    this.container.append(this.textGroup);
    this.defs = this.svg.Element.append('defs');

    this.addResistanceAxisClipPath();

    d3.select(selector).append(() => this.svg.Node);
  }

  private drawImpedanceTexts(): void {
    this.textGroup.Element.selectAll('*').remove();
    for (const e of SmithArcsDefs.resistanceMajor()) {
      const p = this.constantCircle.impedanceToReflectionoefficient([ e[0], 0 ])!;
      this.textGroup.append(new SmithText(p, e[0].toString(), { rotate: 90, dy: '0.002', dx: '0.001' }));
    }
  }

  private drawAdmittanceTexts(): void {
    this.textGroup.Element.selectAll('*').remove();
    for (const e of SmithArcsDefs.resistanceMajor()) {
      const p = this.constantCircle.admittanceToReflectionCoefficient([ e[0], 0 ])!;
      this.textGroup.append(new SmithText(p, e[0].toString(), { rotate: -90, dy: '0.002', dx: '0.001' }));
    }
  }

  public drawImpedance(opts: SmithCirclesDrawOptions): Smith {
    if (this.mainGroup !== null) {
      this.mainGroup.Element.selectAll('*').remove();
    }

    this.mainGroup = new SmithGroup();
    this.mainGroup.append(this.drawResistanceCircles(opts));
    this.mainGroup.append(this.drawReactanceCircles(opts));
    this.mainGroup.append(this.drawReactanceAxis(opts));
    this.mainGroup.append(this.drawResistanceAxis(opts));
    this.container.append(this.mainGroup);

    this.drawImpedanceTexts();

    if (this.interactionGroup !== null) {
      this.interactionGroup.Element.raise();
    }

    return this;
  }

  public drawAdmittance(opts: SmithCirclesDrawOptions): Smith {
    if (this.mainGroup !== null) {
      this.mainGroup.Element.selectAll('*').remove();
    }

    this.mainGroup = new SmithGroup();
    this.mainGroup.append(this.drawConductanceCircles(opts));
    this.mainGroup.append(this.drawSusceptanceCircles(opts));
    this.mainGroup.append(this.drawReactanceAxis(opts));
    this.mainGroup.append(this.drawResistanceAxis(opts));
    this.container.append(this.mainGroup);

    this.drawAdmittanceTexts();

    if (this.interactionGroup !== null) {
      this.interactionGroup.Element.raise();
    }

    return this;
  }

  public enableInteraction(): void {
    if (this.interactionGroup !== null) {
      return;
    }

    const group = new SmithGroup();

    const rc = this.constantCircle.reflectionCoefficientToImpedance([0, 0]);
    let c = this.constantCircle.resistanceCircle(rc![0]);

    const resistanceCircle = new SmithCircle(
      c,
      { stroke: 'red', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(resistanceCircle);

    c = this.constantCircle.reactanceCircle(rc![1]);
    const reactanceLine = new SmithLine([-1, 0], [1, 0], {
      stroke: 'red', strokeWidth: '0.005', fill: 'none',
    });
    group.append(reactanceLine);
    const reactanceCircle = new SmithCircle(
      { p: [0,0], r: 0 },
      { stroke: 'red', strokeWidth: '0.005', fill: 'none', }
    );
    reactanceCircle.Element.attr('clip-path', 'url(#resistance-axis-clip)');
    group.append(reactanceCircle);

    const conductanceCircle = new SmithCircle(
      this.constantCircle.conductanceCircle(1),
      { stroke: 'green', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(conductanceCircle);

    const susceptanceLine = new SmithLine([-1, 0], [1, 0], {
      stroke: 'green', strokeWidth: '0.005', fill: 'none',
    });
    group.append(susceptanceLine);
    const susceptanceCircle = new SmithCircle(
      { p: [0,0], r: 0 },
      { stroke: 'green', strokeWidth: '0.005', fill: 'none', }
    );
    susceptanceCircle.Element.attr('clip-path', 'url(#resistance-axis-clip)');
    group.append(susceptanceCircle);

    const point = new SmithCircle(
      { p: [0, 0], r: 0.015 },
      { stroke: 'none', strokeWidth: 'none', fill: 'red' }
    );
    group.append(point);

    const resistanceText = new SmithText([0, 0], '1.00', {
      dx: '0.01', dy: '0.02', stroke: 'none', fill: 'red',
      fontFamily: 'Verdana', fontSize: '0.04', textAnchor: 'start'
    });
    group.append(resistanceText);

    const conductanceText = new SmithText([0, 0], '1.00', {
      dx: '-0.01', dy: '-0.05', stroke: 'none', fill: 'green',
      fontFamily: 'Verdana', fontSize: '0.04', textAnchor: 'end'
    });
    group.append(conductanceText);

    this.interactionGroup = group;
    this.container.append(this.interactionGroup);

    point.Element.call(d3.drag<SVGElement, {}>().on('drag', () => {
      const x = +d3.event.x;
      const y = +d3.event.y;

      if (this.isWithinPlot([ x, y ]) === false) { return; }

      point.move({ p: [ x, y ], r: 0.015 });

      const rc1 = this.constantCircle.reflectionCoefficientToImpedance ([ x, y ]);
      const rc2 = this.constantCircle.reflectionCoefficientToAdmittance([ x, y ]);

      console.log([x, y], rc1, rc2);

      if (rc1 === undefined) {
        resistanceText.move([x, 0]).text('∞');
        resistanceCircle.Element.attr('visibility', 'hidden');
      } else {
        const resistance = this.constantCircle.resistanceCircle(rc1[0]);
        resistanceCircle.Element.attr('visibility', 'visible');
        resistanceCircle.move(resistance);
        resistanceText.move([1-resistance.r*2, 0]).text(sprintf('%5.2f', 1 / resistance.r - 1));
      }

      if (rc1 === undefined || Math.abs(rc1[1]) < 1e-10) {
        reactanceLine.Element.attr('visibility', 'visible');
        reactanceCircle.Element.attr('visibility', 'hidden');
        // reactanceText.move([x, -y]).text('∞');
      } else {
        const reactance = this.constantCircle.reactanceCircle(rc1[1]);
        reactanceLine.Element.attr('visibility', 'hidden');
        reactanceCircle.Element.attr('visibility', 'visible');
        reactanceCircle.move(reactance);
        // reactanceText.move([x, -y]).text(sprintf('%5.2f', 1 / reactance.r - 1));
      }

      if (rc2 === undefined) {
        conductanceCircle.Element.attr('visibility', 'hidden');
        conductanceText.move([x, 0]).text('∞');
      } else {
        const conductance = this.constantCircle.conductanceCircle(rc2[0]);
        conductanceCircle.Element.attr('visibility', 'visible');
        conductanceCircle.move(conductance);
        conductanceText.move([-1+conductance.r*2, 0]).text(sprintf('%5.2f', 1 / conductance.r - 1));
      }

      if (rc2 === undefined || Math.abs(rc2[1]) < 1e-10) {
        susceptanceLine.Element.attr('visibility', 'visible');
        susceptanceCircle.Element.attr('visibility', 'hidden');
        // susceptanceText.move([x, -y]).text('∞');
      } else {
        susceptanceLine.Element.attr('visibility', 'hidden');
        susceptanceCircle.Element.attr('visibility', 'visible');

        const susceptance = this.constantCircle.susceptanceCircle(rc2[1]);
        susceptanceCircle.move(susceptance);
        // susceptanceText.move([x, -y]).text(sprintf('%5.2f', 1 / susceptance.r - 1));
      }
    }));
  }

  private drawResistanceAxis(opts: SmithCirclesDrawOptions): SmithShape {
    return  new SmithLine([ -1, 0 ], [ 1, 0 ],
      { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' }
    );
  }

  private addResistanceAxisClipPath(): void {
    const res = this.constantCircle.resistanceCircle(0);

    this.defs
      .append('clipPath')
      .attr('id', 'resistance-axis-clip')
      .append('circle')
        .attr('cx', res.p[0])
        .attr('cy', res.p[1])
        .attr('r',  res.r);
  }

  private drawReactanceAxis(opts: SmithCirclesDrawOptions): SmithShape {
    return new SmithCircle(this.constantCircle.resistanceCircle(0),
      { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' }
    );
  }

  private drawResistanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.resistanceMajor()) {
      majorGroup.append(this.drawResistanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.resistanceMinor()) {
      minorGroup.append(this.drawResistanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawReactanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.reactanceMajor()) {
      majorGroup.append(this.drawReactanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.reactanceMinor()) {
      minorGroup.append(this.drawReactanceCircle(def));
    }
    group.append(minorGroup);

    return group
  }

  private drawConductanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.resistanceMajor()) {
      majorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.resistanceMinor()) {
      minorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawSusceptanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.reactanceMajor()) {
      majorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of SmithArcsDefs.reactanceMinor()) {
      minorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawResistanceCircle(def: SmithArcDef): SmithShape|null {
    if (def[SmithArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.constantCircle.resistanceCircle(def[SmithArcEntry.circle]));
    }
    return this.resistanceArc(def);
  }

  private drawReactanceCircle(def: SmithArcDef): SmithShape|null {
    return this.reactanceArc(def);
  }

  private drawConductanceCircle(def: SmithArcDef): SmithShape|null {
    if (def[SmithArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.constantCircle.conductanceCircle(def[SmithArcEntry.circle]));
    }
    return this.conductanceArc(def);
  }

  private drawSusceptanceCircle(def: SmithArcDef): SmithShape|null {
    return this.susceptanceArc(def);
  }

  private resistanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.constantCircle.resistanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.constantCircle.reactanceCircle(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.constantCircle.reactanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private reactanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.constantCircle.reactanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.constantCircle.resistanceCircle(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.constantCircle.resistanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private conductanceArc(def: SmithArcDef): SmithShape|null {
      const cc = def[SmithArcEntry.clipCircles];
      const arcOpts = def[SmithArcEntry.arcOptions];
  
      if (cc === undefined || arcOpts === undefined) { return null; }
  
      const c  = this.constantCircle.conductanceCircle(def[SmithArcEntry.circle]);
      const i1 = this.circleCircleIntersection(c, this.constantCircle.susceptanceCircle(cc[0][0]));
      const i2 = this.circleCircleIntersection(c, this.constantCircle.susceptanceCircle(cc[1][0]));
  
      return this.drawArc(def, c, i1, i2);
  }

  private susceptanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.constantCircle.susceptanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.constantCircle.conductanceCircle(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.constantCircle.conductanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  };

  private drawArc(def: SmithArcDef, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[SmithArcEntry.clipCircles]!;
    const arcOpts = def[SmithArcEntry.arcOptions]!;

    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const r  = c.r;

    const largeArc = arcOpts[0] ? '1' : '0';
    const sweep    = arcOpts[1] ? '1' : '0';

    return new SmithArc(p1, p2, r, largeArc, sweep);
  }

  private isWithinPlot(p: Point): boolean {
    const c = this.constantCircle.resistanceCircle(0);
    return (Math.pow(p[0] - c.p[0], 2) + Math.pow(p[1] - c.p[1], 2)) <= (Math.pow(c.r, 2));
  }

  private circleCircleIntersection(c1: Circle, c2: Circle): Point[] {
    const dl = Math.sqrt(Math.pow(c2.p[0] - c1.p[0], 2) + Math.pow(c2.p[1] - c1.p[1], 2));

    const cosA = (dl * dl + c1.r * c1.r - c2.r * c2.r) / (2 * dl * c1.r);
    const sinA = Math.sqrt(1 - Math.pow(cosA, 2));

    const vpx = (c2.p[0] - c1.p[0]) * c1.r / dl;
    const vpy = (c2.p[1] - c1.p[1]) * c1.r / dl;

    return [ [
        vpx * cosA - vpy * sinA + c1.p[0],
        vpx * sinA + vpy * cosA + c1.p[1],
    ], [
        vpx * cosA + vpy * sinA + c1.p[0],
        vpy * cosA - vpx * sinA + c1.p[1],
    ]];
  }
}
