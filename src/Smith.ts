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
import { SmithMarker } from './draw/SmithMarker';
import { SmithData } from './draw/SmithData';
import { SmithCursor } from './draw/SmithCursor';

import { SmithConstantCircle } from './SmithConstantCircle';
import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from './SmithArcsDefs';
import { SmithDrawOptions } from './draw/SmithDrawOptions';

import { S1P, S1PEntry } from './SnP';

interface SmithCirclesDrawOptions {
  stroke: string, minorWidth: string, majorWidth: string,
}

export interface SmithCursorEvent {
  reflectionCoefficient: Point;
  impedance: Point|undefined;
  admittance: Point|undefined;
  swr: number;
  returnLoss: number;
  mismatchLoss: number;
  Q: number;
}

export interface SmithMarkerEvent {
  reflectionCoefficient: Point;
  impedance: Point|undefined;
  admittance: Point|undefined;
  swr: number;
  returnLoss: number;
  mismatchLoss: number;
  Q: number;
  freq: number;
}

export enum SmithEventType {
  Cursor, Marker
}

export interface SmithEvent {
  type: SmithEventType;
  data: SmithCursorEvent|SmithMarkerEvent;
}

interface ZoomTransform { x: number, y: number, k: number }

export class Smith {
  private svg: SmithSvg;
  private defs: d3.Selection<SVGElement, {}, null, undefined>;

  private container: SmithGroup;

  private impedanceGroup: SmithGroup;
  private admittanceGroup: SmithGroup;
  private constantSwrGroup: SmithGroup;
  private constantQGroup: SmithGroup;

  private calcs: SmithConstantCircle = new SmithConstantCircle();
  private userActionHandler: ((event: SmithEvent) => void)|null = null;

  private fgContainer: SmithGroup;
  private fgContainerShape: SmithCircle;

  private cursor: SmithCursor;

  private transform: ZoomTransform;
  private data: SmithData[] = [];

  constructor(private selector: string, private size: number, private Z0: number = 50) {
    this.svg = new SmithSvg(size);
    this.container = new SmithGroup().rotateY();

    this.svg.append(this.container);

    this.defs = this.svg.Element.append('defs');

    this.impedanceGroup   = this.drawImpedance({ stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' });
    this.admittanceGroup  = this.drawAdmittance({ stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' });
    this.constantSwrGroup = this.drawSwr();
    this.constantQGroup   = this.drawConstantQ();

    this.container.append(this.admittanceGroup);
    this.container.append(this.impedanceGroup);
    this.container.append(this.constantSwrGroup);
    this.container.append(this.constantQGroup);

    this.container.append(this.drawReactanceAxis({
      stroke: 'blue', strokeWidth: '0.005', fill: 'transparent' }
    ));
    this.addResistanceAxisClipPath();

    this.fgContainer = new SmithGroup();
    this.fgContainerShape = this.drawReactanceAxis({
      fill: 'transparent', stroke: 'none'
    });

    const that = this;
    this.fgContainerShape.Element
      .on('mousemove', function () {
        const rc = that.actionToPlot(d3.mouse(this as any));
        that.cursor.move(rc);
      }).on('mouseleave', () => {
        this.cursor.hide();
      });

    const zoom = d3.zoom<SVGElement, {}>()
      .scaleExtent([0.5, 40])
      // .translateExtent([[600, 600], [0, 0]])
      .on('zoom', () => {
        this.transform = d3.event.transform;

        this.bgContainerZoom(this.transform);
        this.cursor.zoom(this.transform);

        for (const d of this.data) {
          d.zoom(this.transform);
        }
      });

    this.fgContainerShape.Element
      .style("pointer-events", "all")
      .call(zoom);
    this.fgContainer.append(this.fgContainerShape);
    this.svg.append(this.fgContainer);

    // Initial zoom
    this.transform = { x: 0, y: 0, k: 0.95 };
    this.bgContainerZoom(this.transform);

    this.cursor = new SmithCursor(this.container, this.transform);
    this.cursor.setMoveHandler((rc) => {
      this.userActionHandler && this.userActionHandler({
        type: SmithEventType.Cursor,
        data: {
          reflectionCoefficient: rc,
          impedance: this.getImpedance(rc),
          admittance: this.getAdmittance(rc),
          swr: this.getSwr(rc),
          returnLoss: this.getReturnLoss(rc),
          mismatchLoss: this.getMismatchLoss(rc),
          Q: this.getQ(rc)
        } as SmithCursorEvent
      });
    });

    d3.select(selector).append(() => this.svg.Node);
  }

  private bgContainerZoom(transform: ZoomTransform): void {
    const x = transform.x;
    const y = transform.y;
    const k = transform.k;
    this.container.Element.attr('transform', `translate(${x}, ${y}) scale(${k}, ${-k})`);
  }

  private actionToPlot(p: Point): Point {
    const po: Point = [p[0], p[1]];
    po[0] -= this.transform.x;
    po[1] -= this.transform.y;
    po[0] /= this.transform.k;
    po[1] /= -this.transform.k;
    return po;
  }

  public getReactanceComponentValue(p: Point, f: number): string {
    let z = this.calcs.reflectionCoefficientToImpedance(p);
    if (!z) {
      return 'Undefined';
    }

    const x = z[1] * this.Z0;

    if (x < 0) {
      const cap = 1 / (2 * Math.PI * f * -x);
      return this.formatNumber(cap) + 'F';
    }

    const ind = x / (2 * Math.PI * f);
    return this.formatNumber(ind) + 'H';
  }

  public formatComplex(c: Point, unit: string = '', dp: number = 3): string {
    return `(${c[0].toFixed(dp)} ${c[1] < 0 ? '-' : '+'} j ${Math.abs(c[1]).toFixed(dp)}) ${unit}`;
  }

  public formatComplexPolar(c: Point, unit: string = '', dp: number = 3): string {
    const m = Math.sqrt(c[0]*c[0] + c[1]*c[1]);
    const a = Math.atan2(c[1], c[0]) * 180.0 / Math.PI;
    return `${m.toFixed(dp)}${unit} ∠${a.toFixed(dp)}°`;
  }

  public formatNumber(val: number): string {
    if (val > 1e24 ) { return (val / 1e24 ).toFixed(3) + ' Y'; }
    if (val > 1e21 ) { return (val / 1e21 ).toFixed(3) + ' Z'; }
    if (val > 1e18 ) { return (val / 1e18 ).toFixed(3) + ' E'; }
    if (val > 1e15 ) { return (val / 1e15 ).toFixed(3) + ' P'; }
    if (val > 1e12 ) { return (val / 1e12 ).toFixed(3) + ' T'; }
    if (val > 1e9  ) { return (val / 1e9  ).toFixed(3) + ' G'; }
    if (val > 1e6  ) { return (val / 1e6  ).toFixed(3) + ' M'; }
    if (val > 1e3  ) { return (val / 1e3  ).toFixed(3) + ' k'; }
    if (val > 1    ) { return (val        ).toFixed(3) + ' ';  }
    if (val > 1e-3 ) { return (val / 1e-3 ).toFixed(3) + ' m'; }
    if (val > 1e-6 ) { return (val / 1e-6 ).toFixed(3) + ' μ'; }
    if (val > 1e-9 ) { return (val / 1e-9 ).toFixed(3) + ' n'; }
    if (val > 1e-12) { return (val / 1e-12).toFixed(3) + ' p'; }
    if (val > 1e-15) { return (val / 1e-15).toFixed(3) + ' f'; }
    if (val > 1e-18) { return (val / 1e-18).toFixed(3) + ' a'; }
    if (val > 1e-21) { return (val / 1e-21).toFixed(3) + ' z'; }
    return (val / 1e-24).toFixed(3) + ' y';
  }

  public addS1P(values: S1P): void {
    if (values.length === 0) { return; }
    const data = this.createSmithData(values, this.data.length);
    this.data.push(data);
  }

  private createSmithData(values: S1P, index: number): SmithData {
    const color = d3.schemeCategory10[1+index];
    const data = new SmithData(values, color,
      this.transform, this.fgContainer, this.container
    );
    data.setMarkerMoveHandler((marker, data) => {
      const rc = data.point;
      this.userActionHandler && this.userActionHandler({
        type: SmithEventType.Marker,
        data: {
          reflectionCoefficient: rc,
          impedance: this.getImpedance(rc),
          admittance: this.getAdmittance(rc),
          swr: this.getSwr(rc),
          returnLoss: this.getReturnLoss(rc),
          mismatchLoss: this.getMismatchLoss(rc),
          Q: this.getQ(rc),
          freq: data.freq,
        } as SmithMarkerEvent
      });
    });
    data.addMarker();
    return data;
  }

  private drawImpedanceTexts(): SmithGroup {
    const group = new SmithGroup({ stroke: 'none', fill: 'black', });
    group.Element.attr('font-family', 'Verdana');
    group.Element.attr('font-size',   '0.03');
    group.Element.attr('text-anchor', 'start');
    for (const e of SmithArcsDefs.textsTicks()) {
      const p = this.calcs.impedanceToReflectionoefficient([ e[0], 0 ])!;
      group.append(new SmithText(p, e[0].toFixed(e[1]), { rotate: 90, dy: '0.004', dx: '0.001' }));
    }
    return group;
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

  private drawImpedance(opts: SmithCirclesDrawOptions): SmithGroup {
    const group = new SmithGroup();
    group.append(this.drawResistanceCircles(opts));
    group.append(this.drawReactanceCircles(opts));
    group.append(this.drawReactanceAxis({
      stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none'
    }));
    group.append(this.drawResistanceAxis({
      stroke: opts.stroke, strokeWidth: opts.majorWidth, fill: 'none'
    }));
    group.append(this.drawImpedanceTexts());

    group.Element.attr('visibility', 'hidden');
    return group;
  }

  public showImpedance(): void {
    this.impedanceGroup.Element.attr('visibility', 'visible');
  }

  public hideImpedance(): void {
    this.impedanceGroup.Element.attr('visibility', 'hidden');
  }

  public showAdmittance(): void {
    this.admittanceGroup.Element.attr('visibility', 'visible');
  }

  public hideAdmittance(): void {
    this.admittanceGroup.Element.attr('visibility', 'hidden');
  }

  private drawAdmittance(opts: SmithCirclesDrawOptions): SmithGroup {
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

    group.Element.attr('visibility', 'hidden');
    return group;
  }

  public showConstantSwrCircles(): void {
    this.constantSwrGroup.Element.attr('visibility', 'visible');
  }

  public hideConstantSwrCircles(): void {
    this.constantSwrGroup.Element.attr('visibility', 'hidden');
  }

  private drawSwr(): SmithGroup {
    const swrs = [ 1.2, 1.5, 2, 3, 5, 10 ];

    const group = new SmithGroup();

    for (const swr of swrs) {
      group.append(
        new SmithCircle({
          p: [0,0],
          r: this.calcs.swrToAbsReflectionCoefficient(swr)
        }, { stroke: 'orange', strokeWidth: '0.003', fill: 'none'})
      );
    }

    group.Element.attr('visibility', 'hidden');
    return group;
  }

  private drawConstantQ(): SmithGroup {
    // Center is (0, +1/Q) or (0, -1/Q).
    // Radius is sqrt(1+1/Q^2).

    const Qs = [ 0.5, 1, 2, 5, 10 ];

    const group = new SmithGroup({
      stroke: 'blue', strokeWidth: '0.001', fill: 'none'
    });

    for (const Q of Qs) {
      const r = Math.sqrt(1 + 1 / (Q * Q));
      const q1 = new SmithArc([-1, 0], [1, 0], r, false, false);
      group.append(q1);

      const q2 = new SmithArc([-1, 0], [1, 0], r, false, true);
      group.append(q2);
    }

    group.Element.attr('visibility', 'hidden');

    return group;
  }

  public showConstantQ(): void {
    this.constantQGroup.Element.attr('visibility', 'visible');
  }

  public hideConstantQ(): void {
    this.constantQGroup.Element.attr('visibility', 'hidden');
  }

  public setUserActionHandler(handler: (event: SmithEvent) => void): void {
    this.userActionHandler = handler;
  }

  private getImpedance(rc: Point): Point|undefined {
    const impedance = this.calcs.reflectionCoefficientToImpedance(rc);
    if (impedance) {
      impedance[0] *= this.Z0;
      impedance[1] *= this.Z0;
    }
    return impedance;
  }
  public getAdmittance(rc: Point): Point|undefined {
    const admittance = this.calcs.reflectionCoefficientToAdmittance(rc);
    if (admittance) {
      admittance[0] *= 1 / this.Z0 * 1000.0; // mS
      admittance[1] *= 1 / this.Z0 * 1000.0; // mS
    }
    return admittance;
  }
  private getQ(rc: Point): number|undefined {
    const impedance = this.calcs.reflectionCoefficientToImpedance(rc);
    if (!impedance) { return; }
    return Math.abs(impedance[1] / impedance[0]);
  }
  private getSwr(rc: Point): number {
    return this.calcs.reflectionCoefficientToSwr(rc);
  }
  private getReturnLoss(rc: Point): number {
    return this.calcs.reflectionCoefficientToReturnLoss(rc);
  }
  private getMismatchLoss(rc: Point): number {
    return this.calcs.reflectionCoefficientToMismatchLoss(rc);
  }

  private drawResistanceAxis(opts: SmithDrawOptions): SmithShape {
    return  new SmithLine([ -1, 0 ], [ 1, 0 ], opts);
  }

  private addResistanceAxisClipPath(): void {
    const res = this.calcs.resistanceCircle(0);

    this.defs
      .append('clipPath')
      .attr('id', 'resistance-axis-clip')
      .append('circle')
        .attr('cx', res.p[0])
        .attr('cy', res.p[1])
        .attr('r',  res.r);
  }

  private drawReactanceAxis(opts: SmithDrawOptions): SmithCircle {
    return new SmithCircle(this.calcs.resistanceCircle(0), opts);
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
      return new SmithCircle(this.calcs.resistanceCircle(def[SmithArcEntry.circle]));
    }
    return this.resistanceArc(def);
  }

  private drawReactanceCircle(def: SmithArcDef): SmithShape|null {
    return this.reactanceArc(def);
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

  private resistanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.calcs.resistanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
  }

  private reactanceArc(def: SmithArcDef): SmithShape|null {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];

    if (cc === undefined || arcOpts === undefined) { return null; }

    const c  = this.calcs.reactanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[1][0]));

    return this.drawArc(def, c, i1, i2);
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
  };

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
