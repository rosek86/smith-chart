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

enum ArcEntry { circle, clipCircles, arcOptions }

type ArcDefinition = [
  number,
  [ number, number ][] | undefined,
  [ boolean, boolean ] | undefined
];

type Vector = [ number, number ];

interface SmithCirclesDrawOptions {
  stroke: string, minorWidth: string, majorWidth: string,
}

export class Smith {
  private svg: SmithSvg;
  private container: SmithGroup;
  private textGroup: SmithGroup;
  private mainGroup: SmithGroup|null = null;
  private interactionGroup: SmithGroup|null = null;

  private constantCircle: SmithConstantCircle;

  constructor(private selector: string, private size: number) {
    this.svg = new SmithSvg(size);
    this.container = new SmithGroup().rotateY();
    this.textGroup = new SmithGroup({
      stroke: 'none', fill: 'black',
    });
    this.textGroup.Element.attr('font-family', 'Verdana');
    this.textGroup.Element.attr('font-size',   '0.03');
    this.textGroup.Element.attr('text-anchor', 'start');

    this.svg.append(this.container);
    this.container.append(this.textGroup);

    this.constantCircle = new SmithConstantCircle();

    d3.select(selector).append(() => this.svg.Node);
  }

  private drawTexts(): void {
    this.textGroup.append(new SmithText([ 0, 0.0 ], '1.0', { rotate: 90, dy: '0.002', dx: '0.001' }));
    this.textGroup.append(new SmithText([ -0.2, 0.0 ], '0.9', { rotate: 90, dy: '0.002', dx: '0.001' }));
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

    this.drawTexts();

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

    const resistanceCircle = new SmithCircle(
      this.constantCircle.resistanceFromPoint([0, 0]),
      { stroke: 'red', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(resistanceCircle);

    const reactanceCircle = new SmithCircle(
      this.constantCircle.reactanceFromPoint([0, 0]),
      { stroke: 'red', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(reactanceCircle);

    const conductanceCircle = new SmithCircle(
      this.constantCircle.conductanceFromPoint([0, 0]),
      { stroke: 'green', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(conductanceCircle);

    const susceptanceCircle = new SmithCircle(
      this.constantCircle.susceptanceFromPoint([0, 0]),
      { stroke: 'green', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(susceptanceCircle);

    const point = new SmithCircle(
      { p: [0, 0], r: 0.015 },
      { stroke: 'none', strokeWidth: 'none', fill: 'red' }
    );
    group.append(point);

    const resistanceText = new SmithText([0, 0], '1.00', {
      dx: '0.01', dy: '0.03', stroke: 'none', fill: 'red',
      fontFamily: 'Verdana', fontSize: '0.04', textAnchor: 'start'
    });
    group.append(resistanceText);

    const conductanceText = new SmithText([0, 0], '1.00', {
      dx: '-0.01', dy: '0.03', stroke: 'none', fill: 'green',
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

      const resistance = this.constantCircle.resistanceFromPoint([ x, y ]);

      if (Number.isNaN(resistance.r) || !Number.isFinite(resistance.r)) {
        resistanceText.move([x, -y]).text('∞');
      } else {
        resistanceCircle.move(resistance);
        resistanceText.move([x, -y]).text(sprintf('%5.2f', 1 / resistance.r - 1));
      }

      const reactance = this.constantCircle.reactanceFromPoint([ x, y ]);

      if (Number.isNaN(reactance.r) || !Number.isFinite(reactance.r)) {
        // draw line
        // reactanceText.move([x, -y]).text('∞');
      } else {
        reactanceCircle.move(reactance);
        // reactanceText.move([x, -y]).text(sprintf('%5.2f', 1 / reactance.r - 1));
      }

      const conductance = this.constantCircle.conductanceFromPoint([ x, y ]);

      if (Number.isNaN(conductance.r) || !Number.isFinite(conductance.r)) {
        conductanceText.move([x, -y]).text('∞');
      } else {
        conductanceCircle.move(conductance);
        conductanceText.move([x, -y]).text(sprintf('%5.2f', 1 / conductance.r - 1));
      }

      const susceptance = this.constantCircle.susceptanceFromPoint([ x, y ]);

      if (Number.isNaN(susceptance.r) || !Number.isFinite(susceptance.r)) {
        // draw line
        // susceptanceText.move([x, -y]).text('∞');
      } else {
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

  private drawReactanceAxis(opts: SmithCirclesDrawOptions): SmithShape {
    return new SmithCircle(this.constantCircle.resistance(0),
      { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' }
    );
  }

  private drawResistanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of Smith.getResistanceArcsMajor()) {
      majorGroup.append(this.drawResistanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of Smith.getResistanceArcsMinor()) {
      minorGroup.append(this.drawResistanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawReactanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of Smith.getReactanceArcsMajor()) {
      majorGroup.append(this.drawReactanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of Smith.getReactanceArcsMinor()) {
      minorGroup.append(this.drawReactanceCircle(def));
    }
    group.append(minorGroup);

    return group
  }

  private drawConductanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of Smith.getResistanceArcsMajor()) {
      majorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of Smith.getResistanceArcsMinor()) {
      minorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawSusceptanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'transparent' });
    for (const def of Smith.getReactanceArcsMajor()) {
      majorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'transparent' });
    for (const def of Smith.getReactanceArcsMinor()) {
      minorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawResistanceCircle(def: ArcDefinition): SmithShape|null {
    if (def[ArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.constantCircle.resistance(def[ArcEntry.circle]));
    }
    return this.resistanceArc(def);
  }

  private drawReactanceCircle(def: ArcDefinition): SmithShape|null {
    return this.reactanceArc(def);
  }

  private drawConductanceCircle(def: ArcDefinition): SmithShape|null {
    if (def[ArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.constantCircle.conductance(def[ArcEntry.circle]));
    }
    return this.conductanceArc(def);
  }

  private drawSusceptanceCircle(def: ArcDefinition): SmithShape|null {
    return this.susceptanceArc(def);
  }

  private resistanceArc(def: ArcDefinition): SmithShape|null {
    const cc = def[ArcEntry.clipCircles];
    const arcOpts = def[ArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.constantCircle.resistance(def[ArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.constantCircle.reactance(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.constantCircle.reactance(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private reactanceArc(def: ArcDefinition): SmithShape|null {
    const cc = def[ArcEntry.clipCircles];
    const arcOpts = def[ArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.constantCircle.reactance(def[ArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.constantCircle.resistance(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.constantCircle.resistance(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private conductanceArc(def: ArcDefinition): SmithShape|null {
      const cc = def[ArcEntry.clipCircles];
      const arcOpts = def[ArcEntry.arcOptions];
  
      if (cc === undefined || arcOpts === undefined) { return null; }
  
      const c  = this.constantCircle.conductance(def[ArcEntry.circle]);
      const i1 = this.circleCircleIntersection(c, this.constantCircle.susceptance(cc[0][0]));
      const i2 = this.circleCircleIntersection(c, this.constantCircle.susceptance(cc[1][0]));
  
      return this.drawArc(def, c, i1, i2);
  }

  private susceptanceArc(def: ArcDefinition): SmithShape|null {
    const cc = def[ArcEntry.clipCircles];
    const arcOpts = def[ArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.constantCircle.susceptance(def[ArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.constantCircle.conductance(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.constantCircle.conductance(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  };

  private drawArc(def: ArcDefinition, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[ArcEntry.clipCircles]!;
    const arcOpts = def[ArcEntry.arcOptions]!;

    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const r  = c.r;

    const largeArc = arcOpts[0] ? '1' : '0';
    const sweep    = arcOpts[1] ? '1' : '0';

    return new SmithArc(p1, p2, r, largeArc, sweep);
  }

  private isWithinPlot(p: Point): boolean {
    const c = this.constantCircle.resistance(0);
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

  private static getResistanceArcsMajor(): ArcDefinition[] {
    return [
      [  0.00, undefined, undefined ],
      [  0.05, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.10, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.15, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.30, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.50, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.70, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.90, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  1.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [  1.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  1.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  1.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  1.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  3.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [  4.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  5.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [ 10.00, undefined, undefined ],
      [ 20.00, [ [ 50.0, 0 ], [ -50.0, 1 ] ], [ true,  true  ] ],
      [ 50.00, undefined, undefined ],
    ];
  }

  private static getResistanceArcsMinor(): ArcDefinition[] {
    return [
      [  0.02, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.04, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.06, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.08, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.02, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.04, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.05, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.05, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.06, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.08, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.01, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.02, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.03, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.04, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.06, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.07, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.08, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.09, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.12, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.14, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.16, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.18, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.12, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.14, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.16, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.18, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.11, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.12, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.13, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.14, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.15, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.15, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.16, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.17, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.18, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.19, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.22, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.24, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.25, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.25, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.26, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.28, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.32, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.34, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.35, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.35, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.36, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.38, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.42, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.44, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.45, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.45, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.46, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.48, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.55, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.65, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.75, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.85, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.95, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  1.10, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.30, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.50, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.70, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.90, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  2.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  4.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  4.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  4.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  4.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  6.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  7.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [  8.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  9.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [ 12.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 14.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 16.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 18.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 30.00, [ [ 50.0, 0 ], [ -50.0, 1 ] ], [ true,  true  ] ],
      [ 40.00, [ [ 50.0, 0 ], [ -50.0, 1 ] ], [ true,  true  ] ],
    ]
  }

  private static getReactanceArcsMajor(): ArcDefinition[] {
    return [
      [   0.05, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.05, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.10, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.10, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.15, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.15, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.30, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.30, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.50, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.50, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.70, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.70, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.90, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.90, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   2.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -2.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   3.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -3.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   4.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -4.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   5.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -5.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  10.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -10.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  20.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -20.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  50.00, [ [  0.0, 0 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -50.00, [ [  0.0, 0 ], [   0.0, 1 ] ], [ false, true  ] ],
    ];
  }

  private static getReactanceArcsMinor(): ArcDefinition[] {
    return [
      [   0.01, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.01, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.02, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.02, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.02, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.02, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.03, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.03, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.04, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.04, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.04, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.04, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.06, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.06, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.06, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.06, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.07, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.07, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.08, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.08, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.08, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.08, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.09, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.09, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.11, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.11, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.12, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.12, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.12, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.12, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.13, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.13, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.14, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.14, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.14, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.14, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.16, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.16, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.16, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.16, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.17, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.17, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.18, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, false ] ],
      [  -0.18, [ [  0.5, 1 ], [   0.2, 1 ] ], [ false, true  ] ],
      [   0.18, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.18, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.19, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.19, [ [  0.2, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.22, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.22, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.24, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.24, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.26, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.26, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.28, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.28, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.32, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.32, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.34, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.34, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.36, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.36, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.38, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.38, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.42, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.42, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.44, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.44, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.46, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.46, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.48, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.48, [ [  0.5, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.05, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, false ] ],
      [  -0.05, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, true  ] ],
      [   0.15, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, false ] ],
      [  -0.15, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, true  ] ],
      [   0.25, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, false ] ],
      [  -0.25, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, true  ] ],
      [   0.35, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, false ] ],
      [  -0.35, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, true  ] ],
      [   0.45, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, false ] ],
      [  -0.45, [ [  1.0, 1 ], [   0.5, 1 ] ], [ false, true  ] ],
      [   0.55, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.55, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.65, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.65, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.75, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.75, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.85, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.85, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   0.95, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -0.95, [ [  1.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.10, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.10, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.30, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.30, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.50, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.50, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.70, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.70, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   1.90, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -1.90, [ [  2.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   2.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -2.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   2.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -2.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   2.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -2.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   2.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -2.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   3.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -3.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   3.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -3.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   3.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -3.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   3.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -3.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   4.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -4.20, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   4.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -4.40, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   4.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -4.60, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   4.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -4.80, [ [  5.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   6.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -6.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   7.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -7.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   8.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -8.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [   9.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [  -9.00, [ [ 10.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  12.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -12.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  14.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -14.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  16.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -16.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  18.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -18.00, [ [ 20.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  30.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -30.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
      [  40.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, false ] ],
      [ -40.00, [ [ 50.0, 1 ], [   0.0, 1 ] ], [ false, true  ] ],
    ];
  }
}
