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

import { TraceSamples } from './samples.js';
import { SmithConstantCircle } from './SmithConstantCircle.js';
import { SmithArcsDefs } from './SmithArcsDefs.js';

import { Complex } from './complex/Complex.js';
import { SmithPeripheralScales } from './scales/SmithPeripheralScales.js';
import { gridLayer, circleLayer } from './layers.js';
import type { ChartLayers, PeripheralScales } from './layers.js';
import { renormalizeSamples } from './renormalization.js';
import { readReflection } from './rf.js';
import type { SmithReading } from './rf.js';
import { compareMarkerReadings } from './measurements.js';
import type { TraceOptions, TraceInfo, MarkerSnapshot, MarkerComparison } from './measurements.js';

export enum SmithEventType {
  Cursor = 'cursor',
  Marker = 'marker',
  MarkerDragStart = 'marker-drag-start',
  MarkerDragEnd = 'marker-drag-end',
}

export type SmithEvent =
  | { type: SmithEventType.Cursor; data: SmithReading | undefined }
  | {
      type: SmithEventType.Marker | SmithEventType.MarkerDragStart | SmithEventType.MarkerDragEnd;
      data: MarkerSnapshot;
    };

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
  private resizeObserver: ResizeObserver;
  private container: SmithGroup;
  private dataContainer: SmithGroup;
  private markerContainer: SmithGroup;

  private reactanceAxis: SmithCircle;

  private constResistance: ConstResistance;
  private constReactance: ConstReactance;
  private constConductance: ConstConductance;
  private constSusceptance: ConstSusceptance;
  private constSwrCircles: ConstSwrCircles;
  private constQCircles: ConstQCircles;

  private cursor: SmithCursor;
  private peripheralScaleRenderer = new SmithPeripheralScales();
  private data: SmithData[] = [];
  private destroyed = false;
  private mouseGesture = new MouseGesture();
  private nextDatasetColor = 0;
  private nextTraceId = 1;
  private nextMarkerId = 1;
  private traceMetadata = new WeakMap<SmithData, { id: string; name: string }>();
  private markerIds = new WeakMap<SmithMarker, string>();
  private draggedMarkers = new Set<SmithMarker>();
  private cursorBeforeMarkerDrag: string | null = null;

  private listeners = new Set<(event: SmithEvent) => void>();

  public readonly layers: ChartLayers;
  public readonly peripheralScales: PeripheralScales;

  constructor(private referenceOhms: number = 50) {
    if (!Number.isFinite(referenceOhms) || referenceOhms <= 0) {
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
      stroke: '#334155',
      strokeWidth: '1',
      fill: 'none',
    });

    this.dataContainer = new SmithGroup().attr('data-layer', 'samples');
    this.markerContainer = new SmithGroup().attr('data-layer', 'markers');

    // build chart
    this.svg.append(this.container);
    this.container.append(this.constConductance.draw().attr('data-layer', 'conductance'));
    this.container.append(this.constSusceptance.draw().attr('data-layer', 'susceptance'));
    this.container.append(this.constResistance.draw().attr('data-layer', 'resistance'));
    this.container.append(this.constReactance.draw().attr('data-layer', 'reactance'));
    this.container.append(this.constQCircles.draw());
    this.container.append(this.constSwrCircles.draw());
    this.container.append(this.peripheralScaleRenderer);
    this.container.append(this.cursor.Group);
    this.container.append(this.reactanceAxis);
    this.container.append(cursorContainer);
    this.container.append(this.dataContainer);
    this.container.append(this.markerContainer);

    const assertAlive = () => this.assertAlive();
    this.layers = {
      resistance: gridLayer(this.constResistance, assertAlive),
      reactance: gridLayer(this.constReactance, assertAlive),
      conductance: gridLayer(this.constConductance, assertAlive),
      susceptance: gridLayer(this.constSusceptance, assertAlive),
      q: circleLayer(this.constQCircles, 0, assertAlive),
      vswr: circleLayer(this.constSwrCircles, 1, assertAlive),
    };
    this.peripheralScales = {
      setVisible: (visible) => {
        assertAlive();
        if (visible) {
          this.peripheralScaleRenderer.show();
        } else {
          this.peripheralScaleRenderer.hide();
        }
      },
      update: (gamma) => {
        assertAlive();
        this.peripheralScaleRenderer.update(gamma);
      },
    };
    this.initializeZoom();
    this.resizeObserver = new ResizeObserver(() => this.updateViewportScale());
    this.resizeObserver.observe(this.svg.Node!);
  }

  public draw(target: string | HTMLElement): void {
    this.assertAlive();
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) {
      throw new Error('Chart container was not found.');
    }
    host.appendChild(this.svg.Node!);
    this.updateViewportScale();
  }

  /** Remove this chart and release its event handlers. Safe to call more than once. */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.resizeObserver.disconnect();
    this.listeners.clear();
    this.clearTraces();
    this.destroyed = true;
    this.cursor.setMoveHandler(null);
    this.mouseGesture.destroy();
    this.zoomBehavior.on('start', null).on('zoom', null);
    this.svg.Element.interrupt().on('.zoom', null);
    this.svg.Element.selectAll('*').interrupt().on('.smithkit', null).on('.drag', null);
    this.svg.Element.remove();
  }

  private updateViewportScale(): void {
    if (this.destroyed) {
      return;
    }
    const matrix = (this.svg.Node as SVGSVGElement).getScreenCTM();
    if (matrix) {
      const scale = Math.hypot(matrix.a, matrix.b);
      this.data.forEach((trace) => trace.setViewportScale(scale));
    }
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
      this.emit({ type: SmithEventType.Cursor, data: undefined });
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
      this.emit({ type: SmithEventType.Cursor, data: this.cursorReading });
    });
    return cursor;
  }

  /** Last cursor position. Use cursor events to detect pointer leave. */
  public get cursorReading(): SmithReading {
    return readReflection(this.cursor.Position, this.referenceImpedanceOhms);
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
    const transform = d3.zoomIdentity.translate(62.5, 62.5).scale(0.75);
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
        this.emit({ type: SmithEventType.Cursor, data: undefined });
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

    const x = z.im * this.referenceImpedanceOhms;

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

  /** Add a named trace with one initial marker. Returns a chart-local, stable ID. */
  public addTrace(values: TraceSamples, options: TraceOptions = {}): string {
    this.assertAlive();
    this.validateTraceOptions(options);
    if (!values.length) {
      throw new RangeError('A trace requires at least one sample.');
    }
    const data = this.createSmithData(values, this.nextDatasetColor, options);
    this.nextDatasetColor++;
    this.data.push(data);
    this.updateViewportScale();
    const id = this.traceMetadata.get(data)!.id;
    this.setTraceOptions(id, options);
    return id;
  }

  /** Detached metadata snapshots; IDs and marker display numbers survive removals. */
  public getTraces(): TraceInfo[] {
    return this.data.map((data) => ({
      ...this.traceMetadata.get(data)!,
      ...data.Style,
      color: data.Color,
      visible: data.Visible,
      sampleCount: data.SampleCount,
      markers: data.Markers.map((entry, index) => ({
        id: this.markerId(entry.marker),
        number: entry.number,
        sampleIndex: data.markerSampleIndex(index),
      })),
    }));
  }

  private traceIndex(id: string): number {
    return this.data.findIndex((data) => this.traceMetadata.get(data)!.id === id);
  }

  private markerId(marker: SmithMarker): string {
    let id = this.markerIds.get(marker);
    if (!id) {
      id = `marker-${this.nextMarkerId++}`;
      this.markerIds.set(marker, id);
    }
    return id;
  }

  private findMarker(id: string): { datasetNo: number; markerNo: number } | undefined {
    for (const [datasetNo, data] of this.data.entries()) {
      const markerNo = data.Markers.findIndex((entry) => this.markerId(entry.marker) === id);
      if (markerNo >= 0) {
        return { datasetNo, markerNo };
      }
    }
    return;
  }

  private validateTraceOptions(options: TraceOptions): void {
    if (options.mode !== undefined && !['points', 'line', 'both'].includes(options.mode)) {
      throw new TypeError('Trace mode must be points, line, or both.');
    }
    for (const key of ['lineWidth', 'pointRadius'] as const) {
      const value = options[key];
      if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
        throw new RangeError(`${key} must be positive and finite.`);
      }
    }
    if (options.name !== undefined && (typeof options.name !== 'string' || !options.name.trim())) {
      throw new TypeError('Trace name must not be empty.');
    }
    if (
      options.color !== undefined &&
      (typeof options.color !== 'string' || !d3.color(options.color))
    ) {
      throw new TypeError('Trace color must be a solid CSS color.');
    }
    if (options.visible !== undefined && typeof options.visible !== 'boolean') {
      throw new TypeError('Trace visibility must be a boolean.');
    }
  }

  public setTraceOptions(id: string, options: TraceOptions): boolean {
    this.assertAlive();
    const data = this.data[this.traceIndex(id)];
    if (!data) {
      return false;
    }
    this.validateTraceOptions(options);
    data.setStyle(options);
    if (options.name !== undefined) {
      this.traceMetadata.get(data)!.name = options.name.trim();
    }
    if (options.color !== undefined) {
      data.setColor(options.color);
    }
    if (options.visible !== undefined) {
      data.setVisible(options.visible);
    }
    return true;
  }

  public updateTrace(id: string, values: TraceSamples): boolean {
    this.assertAlive();
    const data = this.data[this.traceIndex(id)];
    if (!data) {
      return false;
    }
    data.update(values);
    return true;
  }

  public removeTrace(id: string): boolean {
    this.assertAlive();
    const index = this.traceIndex(id);
    if (index < 0) {
      return false;
    }
    this.data[index].destroy();
    this.data.splice(index, 1);
    return true;
  }

  /** Place a marker on an existing sample; no interpolation is performed. */
  public addMarker(traceId: string, sampleIndex = 0): string | undefined {
    this.assertAlive();
    const data = this.data[this.traceIndex(traceId)];
    if (!data) {
      return;
    }
    const index = data.addMarker(sampleIndex);
    return this.markerId(data.Markers[index].marker);
  }

  public removeMarker(id: string): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location ? this.data[location.datasetNo].removeMarker(location.markerNo) : false;
  }

  public setMarkerSample(id: string, sampleIndex: number): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location
      ? this.data[location.datasetNo].setMarkerSample(location.markerNo, sampleIndex)
      : false;
  }

  /** Select the nearest measured frequency; ties choose the earliest input sample. */
  public setMarkerFrequency(id: string, frequencyHz: number): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location
      ? this.data[location.datasetNo].setMarkerFrequency(location.markerNo, frequencyHz)
      : false;
  }

  public getMarker(id: string): MarkerSnapshot | undefined {
    const location = this.findMarker(id);
    if (!location) {
      return;
    }
    const data = this.data[location.datasetNo];
    const marker = data.Markers[location.markerNo];
    return {
      ...readReflection(
        Complex.from(...marker.selectedPoint.reflectionCoefficient),
        this.referenceImpedanceOhms,
      ),
      frequencyHz: marker.selectedPoint.frequencyHz,
      traceId: this.traceMetadata.get(data)!.id,
      markerId: id,
      markerNumber: marker.number,
      sampleIndex: data.markerSampleIndex(location.markerNo),
    };
  }

  /** Return B − A, or undefined if either marker no longer exists. */
  public compareMarkers(a: string, b: string): MarkerComparison | undefined {
    const first = this.getMarker(a);
    const second = this.getMarker(b);
    return first && second ? compareMarkerReadings(first, second) : undefined;
  }

  /** Current positive real reference impedance, in ohms. */
  public get referenceImpedanceOhms(): number {
    return this.referenceOhms;
  }

  /** Renormalize all traces while retaining physical impedance, IDs, and selected sample indices. */
  public renormalize(referenceImpedanceOhms: number): void {
    this.assertAlive();
    // Validate even with no traces, and prepare every result before changing any state.
    renormalizeSamples([], this.referenceOhms, referenceImpedanceOhms);
    if (referenceImpedanceOhms === this.referenceOhms) {
      return;
    }
    const samples = this.data.map((data) =>
      renormalizeSamples(data.Samples, this.referenceOhms, referenceImpedanceOhms),
    );
    this.data.forEach((data) => data.Markers.forEach((entry) => entry.marker.cancelDrag()));
    this.referenceOhms = referenceImpedanceOhms;
    this.data.forEach((data, index) => data.update(samples[index], true));
    this.cursor.hide();
    this.emit({ type: SmithEventType.Cursor, data: undefined });
  }

  public clearTraces(): void {
    this.assertAlive();
    this.data.forEach((dataset) => dataset.destroy());
    this.data = [];
  }

  private createSmithData(values: TraceSamples, dataset: number, options: TraceOptions): SmithData {
    const color = d3.schemeCategory10[(1 + dataset) % d3.schemeCategory10.length];
    const data = new SmithData(
      values,
      color,
      this.transform,
      this.dataContainer,
      this.scalers.default,
      (marker, dragging) => {
        this.markerDragChanged(marker, dragging);
        const snapshot = this.getMarker(this.markerId(marker));
        if (snapshot) {
          this.emit({
            type: dragging ? SmithEventType.MarkerDragStart : SmithEventType.MarkerDragEnd,
            data: snapshot,
          });
        }
      },
      this.markerContainer,
      options,
    );
    const number = this.nextTraceId++;
    this.traceMetadata.set(data, { id: `trace-${number}`, name: `Trace ${number}` });
    data.setMarkerMoveHandler((index) => {
      const marker = data.Markers[index];
      const snapshot = marker && this.getMarker(this.markerId(marker.marker));
      if (snapshot) {
        this.emit({ type: SmithEventType.Marker, data: snapshot });
      }
    });
    data.addMarker();
    return data;
  }

  /** Subscribe to chart events. The returned function removes this subscription. */
  public onEvent(listener: (event: SmithEvent) => void): () => void {
    this.assertAlive();
    // Separate registrations of the same function remain independently removable.
    const subscription = (event: SmithEvent) => listener(event);
    this.listeners.add(subscription);
    return () => {
      this.listeners.delete(subscription);
    };
  }

  private emit(event: SmithEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
