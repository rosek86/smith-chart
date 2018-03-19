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
  private container: SmithSvg;
  private mainGroup: SmithGroup|null = null;
  private interactionGroup: SmithGroup|null = null;

  constructor(private selector: string, private size: number) {
    this.container = new SmithSvg(size);
    d3.select('#smith').append(() => this.container.Node);
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
      this.resistanceCircleFromPoint([0, 0]),
      { stroke: 'red', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(resistanceCircle);

    const admittanceCircle = new SmithCircle(
      this.admittanceCircleFromPoint([0, 0]),
      { stroke: 'green', strokeWidth: '0.005', fill: 'none', }
    );
    group.append(admittanceCircle);

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

    const reactanceText = new SmithText([0, 0], '1.00', {
      dx: '-0.01', dy: '0.03', stroke: 'none', fill: 'green',
      fontFamily: 'Verdana', fontSize: '0.04', textAnchor: 'end'
    });
    group.append(reactanceText);

    this.interactionGroup = group;
    this.container.append(this.interactionGroup);

    point.Element.call(d3.drag<SVGElement, {}>().on('drag', () => {
      const x = +d3.event.x;
      const y = +d3.event.y;

      if (this.isWithinPlot([ x, y ]) === false) { return; }

      point.move({ p: [ x, y ], r: 0.015 });

      const resistance = this.resistanceCircleFromPoint([ x, y ]);

      if (Number.isNaN(resistance.r) || !Number.isFinite(resistance.r)) {
        resistanceText.move([x, -y]).text('∞');
      } else {
        resistanceCircle.move(resistance);
        resistanceText.move([x, -y]).text(sprintf('%5.2f', 1 / resistance.r - 1));
      }

      const reactance  = this.admittanceCircleFromPoint ([ x, y ]);

      if (Number.isNaN(reactance.r) || !Number.isFinite(reactance.r)) {
        reactanceText.move([x, -y]).text('∞');
      } else {
        admittanceCircle.move(reactance);
        reactanceText.move([x, -y]).text(sprintf('%5.2f', 1 / reactance.r - 1));
      }
    }));
  }

  private drawResistanceAxis(opts: SmithCirclesDrawOptions): SmithShape {
    return  new SmithLine([ -1, 0 ], [ 1, 0 ],
      { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' }
    );
  }

  private drawReactanceAxis(opts: SmithCirclesDrawOptions): SmithShape {
    return new SmithCircle(this.resistanceCircle(0),
      { stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' }
    );
  }

  private drawResistanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' });
    for (const def of Smith.getResistanceArcsMajor()) {
      majorGroup.append(this.drawResistanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' });
    for (const def of Smith.getResistanceArcsMinor()) {
      minorGroup.append(this.drawResistanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawReactanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' });
    for (const def of Smith.getReactanceArcsMajor()) {
      majorGroup.append(this.drawReactanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' });
    for (const def of Smith.getReactanceArcsMinor()) {
      minorGroup.append(this.drawReactanceCircle(def));
    }
    group.append(minorGroup);

    return group
  }

  private drawConductanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' });
    for (const def of Smith.getResistanceArcsMajor()) {
      majorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' });
    for (const def of Smith.getResistanceArcsMinor()) {
      minorGroup.append(this.drawConductanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawSusceptanceCircles(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();

    const majorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none' });
    for (const def of Smith.getReactanceArcsMajor()) {
      majorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(majorGroup);

    const minorGroup = new SmithGroup({ stroke: opts.stroke, strokeWidth: opts.minorWidth, fill: 'none' });
    for (const def of Smith.getReactanceArcsMinor()) {
      minorGroup.append(this.drawSusceptanceCircle(def));
    }
    group.append(minorGroup);

    return group;
  }

  private drawResistanceCircle(def: ArcDefinition): SmithShape|null {
    if (def[ArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.resistanceCircle(def[ArcEntry.circle]));
    }
    return this.resistanceArc(def);
  }

  private drawReactanceCircle(def: ArcDefinition): SmithShape|null {
    return this.reactanceArc(def);
  }

  private drawConductanceCircle(def: ArcDefinition): SmithShape|null {
    if (def[ArcEntry.clipCircles] === undefined) {
      return new SmithCircle(this.conductanceCircle(def[ArcEntry.circle]));
    }
    return this.conductanceArc(def);
  }

  private drawSusceptanceCircle(def: ArcDefinition): SmithShape|null {
    return this.susceptanceArc(def);
  }

  private resistanceCircle(n: number): Circle {
    const x = n / (n + 1);
    const r = 1 / (n + 1);
    return { p: [ x, 0 ], r };
  }

  private reactanceCircle(reactance: number): Circle {
    const y = 1 / reactance;
    const r = 1 / reactance;
    return { p: [ 1, y ], r };
  }

  private conductanceCircle(n: number): Circle {
    const x = n / (n + 1);
    const r = 1 / (n + 1);
    return { p: [ -x, 0 ], r };
  }

  private susceptanceCircle(n: number): Circle {
    const y = 1 / n;
    const r = 1 / n;
    return { p: [ -1, y ], r };
  }

  private resistanceArc(def: ArcDefinition): SmithShape|null {
    const cc = def[ArcEntry.clipCircles];
    const arcOpts = def[ArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.resistanceCircle(def[ArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.reactanceCircle(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.reactanceCircle(cc[1][0]));

    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const r  = c.r;

    const largeArc = arcOpts[0] ? '1' : '0';
    const sweep    = arcOpts[1] ? '1' : '0';

    return new SmithArc(p1, p2, r, largeArc, sweep);
  }

  private reactanceArc(def: ArcDefinition): SmithShape|null {
    const cc = def[ArcEntry.clipCircles];
    const arcOpts = def[ArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.reactanceCircle(def[ArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.resistanceCircle(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.resistanceCircle(cc[1][0]));

    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    const r  = c.r;

    const largeArc = arcOpts[0] ? '1' : '0';
    const sweep    = arcOpts[1] ? '1' : '0';

    return new SmithArc(p1, p2, r, largeArc, sweep);
  }

  private conductanceArc(def: ArcDefinition): SmithShape|null {
      const cc = def[ArcEntry.clipCircles];
      const arcOpts = def[ArcEntry.arcOptions];
  
      if (cc === undefined || arcOpts === undefined) { return null; }
  
      const c  = this.conductanceCircle(def[ArcEntry.circle]);
      const i1 = this.circleCircleIntersection(c, this.susceptanceCircle(cc[0][0]));
      const i2 = this.circleCircleIntersection(c, this.susceptanceCircle(cc[1][0]));
  
      const p1 = i1[cc[0][1] === 1 ? 0 : 1];
      const p2 = i2[cc[1][1] === 1 ? 0 : 1];
      const r  = c.r;
  
      const largeArc = arcOpts[0] ? '1' : '0';
      const sweep    = !arcOpts[1] ? '1' : '0';
  
      return new SmithArc(p1, p2, r, largeArc, sweep);
  }

  private susceptanceArc(def: ArcDefinition): SmithShape|null {
    const cc = def[ArcEntry.clipCircles];
    const arcOpts = def[ArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.susceptanceCircle(def[ArcEntry.circle]);
    const i1 = this.circleCircleIntersection(c, this.conductanceCircle(cc[0][0]));
    const i2 = this.circleCircleIntersection(c, this.conductanceCircle(cc[1][0]));

    const p1 = i1[cc[0][1] ? 0 : 1];
    const p2 = i2[cc[1][1] ? 0 : 1];
    const r  = c.r;

    const largeArc = arcOpts[0] ? '1' : '0';
    const sweep    = arcOpts[1] ? '0' : '1';

    return new SmithArc(p1, p2, r, largeArc, sweep);
  };

  private isWithinPlot(p: Point): boolean {
    const c = this.resistanceCircle(0);
    return (Math.pow(p[0] - c.p[0], 2) + Math.pow(p[1] - c.p[1], 2)) <= (Math.pow(c.r, 2));
  }

  private resistanceCircleFromPoint(p: Point): Circle {
    const v1: Vector = [ p[0] - 1, p[1] - 0 ];
    const v2: Vector = [ 0    - 1, 0    - 0 ];

    const cosA = this.cosAlfaBetweenVectors(v1, v2);

    const m = Math.sqrt(Math.pow(v1[0], 2) + Math.pow(v1[1], 2));
    const a = m / 2;
    const r = Math.abs(a / cosA);

    return { p: [ 1 - r, 0 ], r };
  }

  private admittanceCircleFromPoint(p: Point): Circle {
    const v1: Vector = [ p[0] + 1, p[1] - 0 ];
    const v2: Vector = [ 0    + 1, 0    - 0 ];

    const cosA = this.cosAlfaBetweenVectors(v1, v2);

    const m = Math.sqrt(Math.pow(v1[0], 2) + Math.pow(v1[1], 2));
    const a = m / 2;
    const r = Math.abs(a / cosA);

    return { p: [ -1 + r, 0 ], r };
  }

  private cosAlfaBetweenVectors(v1: [number, number], v2: [number, number]): number {
    const scalar = v1[0] * v2[0] + v1[1] * v2[1];
    const v1m = Math.sqrt(Math.pow(v1[0], 2) + Math.pow(v1[1], 2));
    const v2m = Math.sqrt(Math.pow(v2[0], 2) + Math.pow(v2[1], 2));
    const cosAlfa = scalar / (v1m * v2m);
    return cosAlfa;
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
