import * as d3 from 'd3';
import { ZoomTransform } from 'd3';

import { Point } from './shapes/Point.js';

import { MouseGesture } from './draw/MouseGesture.js';
import { SmithSvg } from './draw/SmithSvg.js';
import { SmithGroup } from './draw/SmithGroup.js';
import { SmithCircle } from './draw/SmithCircle.js';

import { SmithData } from './draw/SmithData.js';
import type { SmithMarker } from './draw/SmithMarker.js';
import { SmithCursor } from './draw/SmithCursor.js';

import { ConstResistance } from './draw/ConstResistance.js';
import { ConstReactance } from './draw/ConstReactance.js';
import { ConstConductance } from './draw/ConstConductance.js';
import { ConstSusceptance } from './draw/ConstSusceptance.js';
import { ConstQCircles } from './draw/ConstQCircles.js';
import { ConstSwrCircles } from './draw/ConstSwrCircles.js';

import { SmithDrawOptions } from './draw/SmithDrawOptions.js';
import { SmithScaler } from './draw/SmithScaler.js';

import { S1P } from './SnP.js';
import { SmithConstantCircle } from './SmithConstantCircle.js';
import { SmithArcsDefs } from './SmithArcsDefs.js';

import { Complex } from './complex/Complex.js';

export interface SmithCursorEvent {
  reflectionCoefficient: Complex;
  impedance: Complex | undefined;
  admittance: Complex | undefined;
  swr: number;
  returnLoss: number;
  mismatchLoss: number; // reflection loss
  Q: number | undefined;
  dBS: number;
  rflCoeffP: number;
  rflCoeffEOrI: number;
  transmCoeffP: number;
}

export interface SmithMarkerEvent {
  datasetNo: number;
  markerNo: number;
  reflectionCoefficient: Complex;
  impedance: Complex | undefined;
  admittance: Complex | undefined;
  swr: number;
  returnLoss: number;
  mismatchLoss: number;
  Q: number | undefined;
  freq: number;
}

export enum SmithEventType {
  Cursor,
  Marker,
}

export interface SmithEvent {
  type: SmithEventType;
  data: SmithCursorEvent | SmithMarkerEvent | undefined;
}

interface Scalers {
  default: SmithScaler;
  impedance: SmithScaler;
  admittance: SmithScaler;
}

export class Smith {
  private calcs: SmithConstantCircle = new SmithConstantCircle();
  private scalers: Scalers;

  private transform = d3.zoomIdentity;
  private zoomBehavior = d3.zoom<SVGElement, unknown>();

  private svg: SmithSvg;
  private container: SmithGroup;
  private dataContainer: SmithGroup;

  private reactanceAxis: SmithCircle;

  private constResistance: ConstResistance;
  private constReactance: ConstReactance;
  private constConductance: ConstConductance;
  private constSusceptance: ConstSusceptance;
  private constSwrCircles: ConstSwrCircles;
  private constQCircles: ConstQCircles;

  private cursor: SmithCursor;
  private data: SmithData[] = [];
  private destroyed = false;
  private mouseGesture = new MouseGesture();
  private nextDatasetColor = 0;
  private draggedMarkers = new Set<SmithMarker>();
  private cursorBeforeMarkerDrag: string | null = null;

  private userActionHandler: ((event: SmithEvent) => void) | null = null;

  constructor(private Z0: number = 50) {
    if (!Number.isFinite(Z0) || Z0 <= 0) {
      throw new Error('Reference impedance must be positive and finite.');
    }
    const viewBoxSize = 500;
    const gridData = SmithArcsDefs.getData();
    this.scalers = this.createScalers(viewBoxSize);

    this.svg = new SmithSvg(viewBoxSize);
    this.container = new SmithGroup();

    this.constResistance = new ConstResistance({
      data: gridData,
      scaler: this.scalers.default,
      showMinor: true,
    });
    this.constResistance.show();

    this.constReactance = new ConstReactance({
      data: gridData,
      scaler: this.scalers.default,
      showMinor: true,
    });
    this.constReactance.show();

    this.constConductance = new ConstConductance({
      data: gridData,
      scaler: this.scalers.default,
      showMinor: true,
    });
    this.constConductance.hide();

    this.constSusceptance = new ConstSusceptance({
      data: gridData,
      scaler: this.scalers.default,
      showMinor: true,
    });
    this.constSusceptance.hide();

    this.constQCircles = new ConstQCircles(this.scalers.default);
    this.constQCircles.hide();

    this.constSwrCircles = new ConstSwrCircles(this.scalers.default);
    this.constSwrCircles.hide();

    this.cursor = this.initCursor();
    const cursorContainer = this.cursorContainer();

    this.reactanceAxis = this.drawReactanceAxis({
      stroke: 'blue',
      strokeWidth: '1',
      fill: 'none',
    });

    this.dataContainer = new SmithGroup();

    // build chart
    this.svg.append(this.container);
    this.container.append(this.constConductance.draw().attr('data-layer', 'conductance'));
    this.container.append(this.constSusceptance.draw().attr('data-layer', 'susceptance'));
    this.container.append(this.constResistance.draw().attr('data-layer', 'resistance'));
    this.container.append(this.constReactance.draw().attr('data-layer', 'reactance'));
    this.container.append(this.constQCircles.draw());
    this.container.append(this.constSwrCircles.draw());
    this.container.append(this.cursor.Group);
    this.container.append(this.reactanceAxis);
    this.container.append(cursorContainer);
    this.container.append(this.dataContainer);
    this.dataContainer.Element.raise();

    this.initializeZoom();
  }

  public draw(target: string | HTMLElement): void {
    this.assertAlive();
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) {
      throw new Error('Chart container was not found.');
    }
    host.appendChild(this.svg.Node!);
  }

  /** Remove this chart and release its event handlers. Safe to call more than once. */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.clearS1P();
    this.destroyed = true;
    this.userActionHandler = null;
    this.cursor.setMoveHandler(null);
    this.mouseGesture.destroy();
    this.zoomBehavior.on('start', null).on('zoom', null);
    this.svg.Element.interrupt().on('.zoom', null);
    this.svg.Element.selectAll('*').interrupt().on('.smithkit', null).on('.drag', null);
    this.svg.Element.remove();
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('This Smith chart has been destroyed. Create a new instance.');
    }
  }

  private createScalers(size: number): Scalers {
    const impedance = new SmithScaler(
      d3.scaleLinear().domain([-1, 1]).range([0, size]),
      d3.scaleLinear().domain([1, -1]).range([0, size]),
      d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, size / 2]),
    );
    const admittance = new SmithScaler(
      d3.scaleLinear().domain([1, -1]).range([0, size]),
      d3.scaleLinear().domain([-1, 1]).range([0, size]),
      d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, size / 2]),
    );
    return { default: impedance, impedance, admittance };
  }

  private cursorMove(p: Point): void {
    if (this.draggedMarkers.size > 0) {
      return;
    }
    this.cursor.Position = Complex.from(this.scalers.default.pointInvert(p));
  }

  private markerDragChanged(marker: SmithMarker, dragging: boolean): void {
    const wasDragging = this.draggedMarkers.size > 0;
    if (dragging) {
      this.draggedMarkers.add(marker);
    } else {
      this.draggedMarkers.delete(marker);
    }
    const isDragging = this.draggedMarkers.size > 0;
    if (isDragging === wasDragging) {
      return;
    }
    if (isDragging) {
      this.cursorBeforeMarkerDrag = this.svg.Node!.style.getPropertyValue('cursor') || null;
      this.svg.Element.style('cursor', 'grabbing').style('--smithkit-marker-cursor', 'grabbing');
      this.cursor.hide();
      this.userActionHandler?.({ type: SmithEventType.Cursor, data: undefined });
    } else {
      this.svg.Element.style('cursor', () => this.cursorBeforeMarkerDrag).style(
        '--smithkit-marker-cursor',
        null,
      );
      this.cursorBeforeMarkerDrag = null;
    }
  }

  private initCursor(): SmithCursor {
    const cursor = new SmithCursor(this.scalers.default);
    cursor.Group.attr('class', 'smith-cursor');
    cursor.setMoveHandler(() => {
      if (this.userActionHandler) {
        this.userActionHandler({
          type: SmithEventType.Cursor,
          data: this.CursorData,
        });
      }
    });
    return cursor;
  }

  public get CursorData(): SmithCursorEvent {
    const rc = this.cursor.Position;
    return {
      reflectionCoefficient: rc,
      impedance: this.calcImpedance(rc),
      admittance: this.calcAdmittance(rc),
      swr: this.calcs.rflCoeffToSwr(rc),
      returnLoss: this.calcs.rflCoeffToReturnLoss(rc),
      mismatchLoss: this.calcs.rflCoeffToMismatchLoss(rc),
      Q: this.calcs.rflCoeffToQ(rc),
      dBS: this.calcs.rflCoeffToDBS(rc),
      rflCoeffP: this.calcs.rflCoeffP(rc),
      rflCoeffEOrI: this.calcs.rflCoeffEOrI(rc),
      transmCoeffP: this.calcs.rflCoeffToTransmCoeffP(rc),
    };
  }

  private initializeZoom(): void {
    const zoom = this.zoomBehavior
      .scaleExtent([0.6, 1000])
      .on('start', (event: d3.D3ZoomEvent<SVGElement, unknown>) => {
        if (event.sourceEvent) {
          this.mouseGesture.capture(event.sourceEvent, 'zoom');
        }
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGElement, unknown>) => this.onZoom(event.transform));

    this.svg.Element.call(zoom);
    this.resetView();
  }

  public resetView(): void {
    this.assertAlive();
    const transform = d3.zoomIdentity.translate(50, 50).scale(0.8);
    this.svg.Element.call(this.zoomBehavior.transform, transform);
  }

  private onZoom(transform: ZoomTransform): void {
    if (this.destroyed) {
      return;
    }
    this.transform = transform;
    this.container.Element.attr('transform', transform.toString());
    this.data.forEach((d) => d.zoom(transform));
  }

  private cursorContainer(): SmithCircle {
    const shape = this.drawReactanceAxis({ fill: 'transparent', stroke: 'none' });

    shape.Element.style('pointer-events', 'all')
      .on('pointermove.smithkit', (event: PointerEvent) => {
        this.cursorMove(d3.pointer(event));
      })
      .on('pointerleave.smithkit', () => {
        this.cursor.hide();
        this.userActionHandler?.({ type: SmithEventType.Cursor, data: undefined });
      });

    return shape;
  }

  private drawReactanceAxis(opts: SmithDrawOptions): SmithCircle {
    const c = this.calcs.resistanceCircle(0);
    c.p[0] = this.scalers.default.x(c.p[0]);
    c.p[1] = this.scalers.default.y(c.p[1]);
    c.r = this.scalers.default.r(c.r);
    return new SmithCircle(c, opts);
  }

  public getReactanceComponentValue(p: Complex, f: number): string {
    const z = this.calcs.rflCoeffToImpedance(p);
    if (!z) {
      return 'Undefined';
    }

    const x = z.imag * this.Z0;

    if (x < 0) {
      const cap = 1 / (2 * Math.PI * f * -x);
      return this.formatNumber(cap) + 'F';
    }

    const ind = x / (2 * Math.PI * f);
    return this.formatNumber(ind) + 'H';
  }

  public formatComplex(c: Complex, unit: string = '', dp: number = 3): string {
    if (unit !== '') {
      unit = `[${unit}]`;
    }
    return `${c.toString(dp)} ${unit}`;
  }

  public formatComplexPolar(c: Complex, unit: string = '', dp: number = 3): string {
    const m = c.abs();
    const a = this.calcs.rad2deg(c.arg());
    return `${m.toFixed(dp)} ${unit} ∠${a.toFixed(dp)}°`;
  }

  public formatNumber(val: number): string {
    const formatted = d3.format('.3~s')(val);
    return Number.isFinite(val) && /[a-zA-Zµ]$/.test(formatted)
      ? formatted.replace(/([a-zA-Zµ])$/, ' $1')
      : formatted + ' ';
  }

  /** Add samples and return their current dataset index; empty input is ignored. */
  public addS1P(values: S1P): number | undefined {
    this.assertAlive();
    if (values.length === 0) {
      return;
    }
    const data = this.createSmithData(values, this.nextDatasetColor);
    this.nextDatasetColor++;
    return this.data.push(data) - 1;
  }

  /** Replace samples, retaining color and markers. Empty input removes the dataset. */
  public updateS1P(datasetNo: number, values: S1P): boolean {
    this.assertAlive();
    if (!Number.isInteger(datasetNo) || !this.data[datasetNo]) {
      return false;
    }
    if (values.length === 0) {
      return this.removeS1P(datasetNo);
    }
    this.data[datasetNo].update(values);
    return true;
  }

  /** Remove a dataset. Later dataset indices shift down by one. */
  public removeS1P(datasetNo: number): boolean {
    this.assertAlive();
    if (!Number.isInteger(datasetNo) || !this.data[datasetNo]) {
      return false;
    }
    this.data[datasetNo].destroy();
    this.data.splice(datasetNo, 1);
    return true;
  }

  public clearS1P(): void {
    this.assertAlive();
    this.data.forEach((dataset) => dataset.destroy());
    this.data = [];
  }

  private createSmithData(values: S1P, dataset: number): SmithData {
    const color = d3.schemeCategory10[(1 + dataset) % d3.schemeCategory10.length];
    const data = new SmithData(
      values,
      color,
      this.transform,
      this.dataContainer,
      this.scalers.default,
      (marker, dragging) => this.markerDragChanged(marker, dragging),
    );
    data.setMarkerMoveHandler((marker) => {
      if (this.userActionHandler) {
        this.userActionHandler({
          type: SmithEventType.Marker,
          data: this.getMarkerData(this.data.indexOf(data), marker),
        });
      }
    });
    data.addMarker();
    return data;
  }

  public getMarkerData(datasetNo: number, markerNo: number): SmithMarkerEvent | undefined {
    if (!this.data[datasetNo]) {
      return;
    }

    const m = this.data[datasetNo].getMarker(markerNo);
    if (!m) {
      return;
    }

    const rc = Complex.from(...m.selectedPoint.point);
    const freq = m.selectedPoint.freq;

    return {
      datasetNo,
      markerNo,
      freq,
      reflectionCoefficient: rc,
      impedance: this.calcImpedance(rc),
      admittance: this.calcAdmittance(rc),
      swr: this.calcs.rflCoeffToSwr(rc),
      returnLoss: this.calcs.rflCoeffToReturnLoss(rc),
      mismatchLoss: this.calcs.rflCoeffToMismatchLoss(rc),
      Q: this.calcs.rflCoeffToQ(rc),
    };
  }

  public get Datasets(): SmithData[] {
    return this.data.slice();
  }

  public get ConstResistance(): ConstResistance {
    return this.constResistance;
  }

  public get ConstReactance(): ConstReactance {
    return this.constReactance;
  }

  public get ConstConductance(): ConstConductance {
    return this.constConductance;
  }

  public get ConstSusceptance(): ConstSusceptance {
    return this.constSusceptance;
  }

  public get ConstQCircles(): ConstQCircles {
    return this.constQCircles;
  }

  public get ConstSwrCircles(): ConstSwrCircles {
    return this.constSwrCircles;
  }

  public setUserActionHandler(handler: ((event: SmithEvent) => void) | null): void {
    this.assertAlive();
    this.userActionHandler = handler;
  }

  public calcImpedance(rc: Complex): Complex | undefined {
    const impedance = this.calcs.rflCoeffToImpedance(rc);
    if (impedance) {
      return impedance.mul(this.Z0);
    }
    return impedance;
  }
  public calcAdmittance(rc: Complex): Complex | undefined {
    const admittance = this.calcs.rflCoeffToAdmittance(rc);
    if (admittance) {
      return admittance.mul((1 / this.Z0) * 1000.0); // mS
    }
    return admittance;
  }
}
