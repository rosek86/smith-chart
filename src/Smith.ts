import * as d3 from 'd3';
import { sprintf } from 'sprintf-js';

import { Point } from './draw/Point';
import { Circle } from './draw/Circle';

import { SmithSvg } from './draw/SmithSvg';
import { SmithGroup } from './draw/SmithGroup';
import { SmithCircle } from './draw/SmithCircle';

import { SmithData } from './draw/SmithData';
import { SmithMarker } from './draw/SmithMarker';
import { SmithCursor } from './draw/SmithCursor';

import { ConstImpCircles } from './draw/ConstImpCircles';
import { ConstAdmCircles } from './draw/ConstAdmCircles';
import { ConstQCircles } from './draw/ConstQCircles';
import { ConstSwrCircles } from './draw/ConstSwrCircles';

import { SmithConstantCircle } from './SmithConstantCircle';
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

    this.impedanceGroup   = new ConstImpCircles().draw({ stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' });
    this.admittanceGroup  = new ConstAdmCircles().draw({ stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' });
    this.constantSwrGroup = new ConstSwrCircles().draw();
    this.constantQGroup   = new ConstQCircles().draw();

    this.container.append(this.admittanceGroup);
    this.container.append(this.impedanceGroup);
    this.container.append(this.constantSwrGroup);
    this.container.append(this.constantQGroup);

    this.container.append(this.drawReactanceAxis({
      stroke: 'blue', strokeWidth: '0.005', fill: 'transparent' }
    ));

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

    this.cursor = new SmithCursor(this.transform);
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
    this.container.append(this.cursor.Group);

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

  private drawReactanceAxis(opts: SmithDrawOptions): SmithCircle {
    return new SmithCircle(this.calcs.resistanceCircle(0), opts);
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

  public showImpedance(): void {
    this.impedanceGroup.show();
  }

  public hideImpedance(): void {
    this.impedanceGroup.hide();
  }

  public showAdmittance(): void {
    this.admittanceGroup.show();
  }

  public hideAdmittance(): void {
    this.admittanceGroup.hide();
  }

  public showConstantSwrCircles(): void {
    this.constantSwrGroup.show();
  }

  public hideConstantSwrCircles(): void {
    this.constantSwrGroup.hide();
  }

  public showConstantQ(): void {
    this.constantQGroup.show();
  }

  public hideConstantQ(): void {
    this.constantQGroup.hide();
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
}
