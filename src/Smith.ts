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

import { SmithConstantCircle } from './SmithConstantCircle';
import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from './SmithArcsDefs';
import { SmithDrawOptions } from './draw/SmithDrawOptions';

import { S1P, S1PEntry } from './SnP';

type Vector = [ number, number ];

interface SmithCirclesDrawOptions {
  stroke: string, minorWidth: string, majorWidth: string,
}

interface SmithCursor {
  group: SmithGroup;
  point: SmithCircle;
  impedance: {
    resistance: { circle: SmithCircle; };
    reactance: { circle: SmithCircle; line: SmithLine; };
  };
  admittance: {
    conductance: { circle: SmithCircle; };
    susceptance: { circle: SmithCircle; line: SmithLine; };
  }
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

export class Smith {
  private svg: SmithSvg;
  private defs: d3.Selection<SVGElement, {}, null, undefined>;
  private container: SmithGroup;

  private impedanceGroup: SmithGroup;
  private admittanceGroup: SmithGroup;
  private constantSwrGroup: SmithGroup;
  private constantQGroup: SmithGroup;

  private interactionGroup: SmithGroup|null = null;

  private constantCircle: SmithConstantCircle = new SmithConstantCircle();
  private userActionHandler: ((event: SmithEvent) => void)|null = null;

  private mouseMoveContainer: SmithCircle;

  private reflectionCoefficient: Point = [0,0];
  private cursor: SmithCursor;

  private marker: SmithMarker;

  private dataPoints: S1P = [];

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

    this.cursor = this.drawCursor();
    this.cursor.group.Element.attr('opacity', '0');
    this.container.append(this.cursor.group);

    this.marker = new SmithMarker(1);
    this.marker.move([0, 0.5]);
    this.marker.hide();
    this.container.append(this.marker);

    this.mouseMoveContainer = this.drawReactanceAxis({
      stroke: 'none', fill: 'transparent' }
    );
    const that = this;
    this.mouseMoveContainer.Element
      .on('mousemove', function () {
        that.cursorOver(d3.mouse(this as any))
      })
      .on('mouseleave', function () {
        that.cursorOut();
      });
    this.container.append(this.mouseMoveContainer);


    d3.select(selector).append(() => this.svg.Node);
  }

  private cursorOver(point: Point): void {
    this.cursor.group.Element.attr('opacity', null);
    this.moveCursor(point[0], point[1]);
  }

  private cursorOut(): void {
    this.cursor.group.Element.attr('opacity', '0');
  }

  public getReactanceComponentValue(p: Point, f: number): string {
    let z = this.constantCircle.reflectionCoefficientToImpedance(p);
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

  public formatComplex(c: Point, dp: number = 3): string {
    return `${c[0].toFixed(dp)} ${c[1] < 0 ? '-' : '+'} j ${Math.abs(c[1]).toFixed(dp)}`;
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

  public addS1P(data: S1P): void {
    if (data.length === 0) { return; }

    const group = new SmithGroup({ stroke: 'none', strokeWidth: 'none', fill: 'purple' });

    for (const entry of data) {
      group.append(new SmithCircle({ p: entry.point, r: 0.005 }));
      this.dataPoints.push(entry);
    }

    this.container.append(group);
    this.mouseMoveContainer.Element.raise();

    let selectedPoint = data[0];

    this.marker.move(data[0].point);
    this.marker.show();
    this.marker.setDragHandler((mp) => {
      const dp = this.findClosestPointTo(mp);
      this.marker.move(dp.point);

      if (selectedPoint !== dp) {
        selectedPoint = dp;

        const rc = dp.point;
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
            freq: dp.freq,
          } as SmithMarkerEvent
        });
      }
    });
    this.marker.Element.raise();
  }

  private findClosestPointTo(p: Point): S1PEntry {
    const dist = (p1: Point, p2: Point) => {
      const xd = p1[0] - p2[0];
      const yd = p1[1] - p2[1];
      return  Math.sqrt(xd * xd + yd * yd);
    };

    return this.dataPoints.reduce((prev, curr) => {
      const d1 = dist(p, prev.point);
      const d2 = dist(p, curr.point);
      return d1 <= d2 ? prev : curr;
    });
  }

  private drawImpedanceTexts(): SmithGroup {
    const group = new SmithGroup({ stroke: 'none', fill: 'black', });
    group.Element.attr('font-family', 'Verdana');
    group.Element.attr('font-size',   '0.03');
    group.Element.attr('text-anchor', 'start');
    for (const e of SmithArcsDefs.textsTicks()) {
      const p = this.constantCircle.impedanceToReflectionoefficient([ e[0], 0 ])!;
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
      const p = this.constantCircle.admittanceToReflectionCoefficient([ e[0], 0 ])!;
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
          r: this.constantCircle.swrToAbsReflectionCoefficient(swr)
        }, { stroke: 'orange', strokeWidth: '0.003', fill: 'none'})
      );
    }

    group.Element.attr('visibility', 'hidden');
    return group;
  }

  private drawCursor(): SmithCursor {
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

    const cursor: SmithCursor = {
      group, point,
      impedance: {
        resistance: { circle: resistanceCircle },
        reactance: {
          circle: reactanceCircle,
          line: reactanceLine,
        },
      },
      admittance: {
        conductance: { circle: conductanceCircle },
        susceptance: {
          circle: susceptanceCircle,
          line: susceptanceLine
        },
      },
    };

    return cursor;
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
      const q1 = new SmithArc([-1, 0], [1, 0], r, '0', '0');
      group.append(q1);

      const q2 = new SmithArc([-1, 0], [1, 0], r, '0', '1');
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

  private moveCursor(x: number, y: number): void {
    if (this.isWithinPlot([ x, y ]) === false) { return; }

    this.reflectionCoefficient = [ x, y ];
    this.cursor.point.move({ p: [ x, y ], r: 0.015 });

    const impedance = this.constantCircle.reflectionCoefficientToImpedance([ x, y ]);
    if (impedance === undefined) {
      // resistanceText.move([x, 0]).text('∞');
      this.cursor.impedance.resistance.circle.Element.attr('visibility', 'hidden');
    } else {
      const resistance = this.constantCircle.resistanceCircle(impedance[0]);
      this.cursor.impedance.resistance.circle.Element.attr('visibility', 'visible');
      this.cursor.impedance.resistance.circle.move(resistance);
      // resistanceText.move([1-resistance.r*2, 0]).text(sprintf('%5.2f', 1 / resistance.r - 1));
    }

    if (impedance === undefined || Math.abs(impedance[1]) < 1e-10) {
      this.cursor.impedance.reactance.line.Element.attr('visibility', 'visible');
      this.cursor.impedance.reactance.circle.Element.attr('visibility', 'hidden');
      // reactanceText.move([x, -y]).text('∞');
    } else {
      const reactance = this.constantCircle.reactanceCircle(impedance[1]);
      this.cursor.impedance.reactance.line.Element.attr('visibility', 'hidden');
      this.cursor.impedance.reactance.circle.Element.attr('visibility', 'visible');
      this.cursor.impedance.reactance.circle.move(reactance);
      // reactanceText.move([x, -y]).text(sprintf('%5.2f', 1 / reactance.r - 1));
    }

    const admittance = this.constantCircle.reflectionCoefficientToAdmittance([ x, y ]);
    if (admittance === undefined) {
      this.cursor.admittance.conductance.circle.Element.attr('visibility', 'hidden');
      // conductanceText.move([x, 0]).text('∞');
    } else {
      const conductance = this.constantCircle.conductanceCircle(admittance[0]);
      this.cursor.admittance.conductance.circle.Element.attr('visibility', 'visible');
      this.cursor.admittance.conductance.circle.move(conductance);
      // conductanceText.move([-1+conductance.r*2, 0]).text(sprintf('%5.2f', 1 / conductance.r - 1));
    }

    if (admittance === undefined || Math.abs(admittance[1]) < 1e-10) {
      this.cursor.admittance.susceptance.line.Element.attr('visibility', 'visible');
      this.cursor.admittance.susceptance.circle.Element.attr('visibility', 'hidden');
      // susceptanceText.move([x, -y]).text('∞');
    } else {
      this.cursor.admittance.susceptance.line.Element.attr('visibility', 'hidden');
      this.cursor.admittance.susceptance.circle.Element.attr('visibility', 'visible');

      const susceptance = this.constantCircle.susceptanceCircle(admittance[1]);
      this.cursor.admittance.susceptance.circle.move(susceptance);
      // susceptanceText.move([x, -y]).text(sprintf('%5.2f', 1 / susceptance.r - 1));
    }

    const rc = this.getReflectionCoefficient();
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
  }

  private getReflectionCoefficient(): Point {
    return this.reflectionCoefficient;
  }
  private getImpedance(rc: Point): Point|undefined {
    const impedance = this.constantCircle.reflectionCoefficientToImpedance(rc);
    if (impedance) {
      impedance[0] *= this.Z0;
      impedance[1] *= this.Z0;
    }
    return impedance;
  }
  public getAdmittance(rc: Point): Point|undefined {
    const admittance = this.constantCircle.reflectionCoefficientToAdmittance(rc);
    if (admittance) {
      admittance[0] *= 1 / this.Z0 * 1000.0; // mS
      admittance[1] *= 1 / this.Z0 * 1000.0; // mS
    }
    return admittance;
  }
  private getQ(rc: Point): number|undefined {
    const impedance = this.constantCircle.reflectionCoefficientToImpedance(rc);
    if (!impedance) { return; }
    return Math.abs(impedance[1] / impedance[0]);
  }
  private getSwr(rc: Point): number {
    return this.constantCircle.reflectionCoefficientToSwr(rc);
  }
  private getReturnLoss(rc: Point): number {
    return this.constantCircle.reflectionCoefficientToReturnLoss(rc);
  }
  private getMismatchLoss(rc: Point): number {
    return this.constantCircle.reflectionCoefficientToMismatchLoss(rc);
  }

  private drawResistanceAxis(opts: SmithDrawOptions): SmithShape {
    return  new SmithLine([ -1, 0 ], [ 1, 0 ], opts);
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

  private drawReactanceAxis(opts: SmithDrawOptions): SmithCircle {
    return new SmithCircle(this.constantCircle.resistanceCircle(0), opts);
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
