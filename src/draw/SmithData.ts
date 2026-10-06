import { SmithGroup } from './SmithGroup.js';
import { line } from 'd3';
import type { TraceStyle } from '../measurements.js';
import { SmithMarker } from './SmithMarker.js';
import { SmithScaler } from './SmithScaler.js';

import { TraceSamples, TraceSample } from '../samples.js';
import { Point } from '../shapes/Point.js';

interface Marker {
  marker: SmithMarker;
  selectedPoint: TraceSample;
  number: number;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

export class SmithData {
  private style: TraceStyle;
  private destroyed = false;
  private visible = true;
  private pendingEvents = new Set<ReturnType<typeof setTimeout>>();

  private group: SmithGroup;

  private markersCount = 0;
  private markers: Marker[] = [];

  private handler: ((marker: number, data: TraceSample) => void) | null = null;

  public constructor(
    private data: TraceSamples,
    private color: string,
    private transform: Transform,
    private fgContainer: SmithGroup,
    private scaler: SmithScaler,
    private markerDragHandler?: (marker: SmithMarker, dragging: boolean) => void,
    private markerContainer: SmithGroup = fgContainer,
    style: Partial<TraceStyle> = {},
  ) {
    this.style = {
      mode: style.mode ?? 'points',
      lineWidth: style.lineWidth ?? 2,
      pointRadius: style.pointRadius ?? 2,
    };
    this.data = this.copySamples(data);
    this.group = this.drawTrace(this.data);
    this.group.attr('pointer-events', 'none');
    this.fgContainer.append(this.group);
    this.zoomDataPoints();
  }

  private drawTrace(data: TraceSamples): SmithGroup {
    const group = new SmithGroup({
      stroke: 'none',
      strokeWidth: 'none',
      fill: this.color,
    });
    group.attr('data-role', 'samples');
    group.attr('data-mode', this.style.mode);
    if (this.style.mode !== 'points') {
      const path = line<TraceSample>()
        .x((sample) => this.scaler.x(sample.reflectionCoefficient[0]))
        .y((sample) => this.scaler.y(sample.reflectionCoefficient[1]));
      group.Element.append('path')
        .attr('class', 'trace-line')
        .attr('d', path(data))
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .attr('stroke-width', this.style.lineWidth)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');
    }
    if (this.style.mode !== 'line') {
      this.renderPoints(group, data);
    }
    return group;
  }

  private renderPoints(group: SmithGroup, data: TraceSamples): void {
    let visible = data;
    if (data.length > 5000) {
      const cells = new Set<string>();
      const cellSize = Math.max(0.5, this.style.pointRadius);
      const extent = this.scaler.x(1);
      const margin = this.style.pointRadius;
      visible = data.filter((sample) => {
        const x =
          this.scaler.x(sample.reflectionCoefficient[0]) * this.transform.k + this.transform.x;
        const y =
          this.scaler.y(sample.reflectionCoefficient[1]) * this.transform.k + this.transform.y;
        if (x < -margin || y < -margin || x > extent + margin || y > extent + margin) {
          return false;
        }
        const cell = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
        if (cells.has(cell)) {
          return false;
        }
        cells.add(cell);
        return true;
      });
    }
    group.Element.selectAll('circle')
      .data(visible)
      .join('circle')
      .attr('cx', (sample) => this.scaler.x(sample.reflectionCoefficient[0]))
      .attr('cy', (sample) => this.scaler.y(sample.reflectionCoefficient[1]))
      .attr('r', this.style.pointRadius / this.transform.k);
  }

  public zoom(transform: Transform): void {
    if (this.destroyed) {
      return;
    }
    this.transform = transform;
    this.zoomDataPoints();
    this.zoomAllMarkers();
  }

  private zoomDataPoints(): void {
    const k = this.transform.k;
    if (this.style.mode === 'line') {
      return;
    }
    if (this.data.length > 5000) {
      this.renderPoints(this.group, this.data);
    } else {
      this.group.Element.selectAll('circle').attr('r', this.style.pointRadius / k);
    }
  }

  private zoomAllMarkers(): void {
    const k = this.transform.k;
    for (const marker of this.markers) {
      const entry = marker.selectedPoint;
      if (entry) {
        marker.marker.zoom(k);
      }
    }
  }

  public addMarker(sampleIndex = 0): number {
    if (this.destroyed) {
      throw new Error('This dataset has been removed.');
    }
    this.validateSampleIndex(sampleIndex);
    const markerIndex = this.markersCount++;
    const marker = new SmithMarker(markerIndex + 1, this.color, (dragging) =>
      this.markerDragHandler?.(marker, dragging),
    );

    const markerDesc: Marker = {
      marker,
      selectedPoint: this.data[sampleIndex],
      number: markerIndex + 1,
    };
    this.markers.push(markerDesc);

    marker.Element.attr('data-role', 'marker');
    this.markerContainer.append(marker);

    marker.setDragHandler((mp) => {
      const dp = this.findClosestPointTo(this.scaler.pointInvert(mp));

      if (markerDesc.selectedPoint === dp) {
        return;
      }
      markerDesc.selectedPoint = dp;

      marker.move(this.scaler.point(dp.reflectionCoefficient));
      marker.zoom(this.transform.k);

      this.notifyMarker(markerDesc);
    });

    marker.zoom(this.transform.k);
    marker.show();
    marker.move(this.scaler.point(markerDesc.selectedPoint.reflectionCoefficient));
    marker.Element.style('display', () => (this.visible ? null : 'none'));

    this.notifyMarker(markerDesc);
    return this.markers.length - 1;
  }

  public removeMarker(index: number): boolean {
    const entry = this.markers[index];
    if (!entry) {
      return false;
    }
    entry.marker.destroy();
    this.markers.splice(index, 1);
    return true;
  }

  public setMarkerSample(index: number, sampleIndex: number): boolean {
    const entry = this.markers[index];
    if (!entry) {
      return false;
    }
    this.validateSampleIndex(sampleIndex);
    entry.selectedPoint = this.data[sampleIndex];
    entry.marker.move(this.scaler.point(entry.selectedPoint.reflectionCoefficient));
    this.notifyMarker(entry);
    return true;
  }

  public setMarkerFrequency(index: number, frequencyHz: number): boolean {
    if (!this.markers[index]) {
      return false;
    }
    if (!Number.isFinite(frequencyHz) || frequencyHz < 0) {
      throw new RangeError('Marker frequency must be finite and non-negative.');
    }
    let closest = 0;
    let distance = Math.abs(this.data[0].frequencyHz - frequencyHz);
    for (let i = 1; i < this.data.length; i++) {
      const nextDistance = Math.abs(this.data[i].frequencyHz - frequencyHz);
      if (nextDistance < distance) {
        closest = i;
        distance = nextDistance;
      }
    }
    return this.setMarkerSample(index, closest);
  }

  private validateSampleIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.data.length) {
      throw new RangeError('Sample index is outside this trace.');
    }
  }

  public get Samples(): TraceSamples {
    return this.data;
  }

  public get SampleCount(): number {
    return this.data.length;
  }
  public get Color(): string {
    return this.color;
  }
  public get Visible(): boolean {
    return this.visible;
  }
  public markerSampleIndex(index: number): number {
    const entry = this.markers[index];
    return entry ? this.data.indexOf(entry.selectedPoint) : -1;
  }

  public setColor(color: string): void {
    this.color = color;
    this.group.attr('fill', color);
    this.group.Element.select('.trace-line').attr('stroke', color);
    this.markers.forEach(({ marker }) => marker.setColor(color));
  }

  public get Style(): TraceStyle {
    return { ...this.style };
  }

  public setStyle(options: Partial<TraceStyle>): void {
    const next = {
      mode: options.mode ?? this.style.mode,
      lineWidth: options.lineWidth ?? this.style.lineWidth,
      pointRadius: options.pointRadius ?? this.style.pointRadius,
    };
    if (
      next.mode === this.style.mode &&
      next.lineWidth === this.style.lineWidth &&
      next.pointRadius === this.style.pointRadius
    ) {
      return;
    }
    const modeChanged = next.mode !== this.style.mode;
    this.style = next;
    if (modeChanged) {
      this.redraw();
    } else {
      this.group.Element.select('.trace-line').attr('stroke-width', next.lineWidth);
      this.zoomDataPoints();
    }
  }

  private redraw(): void {
    const group = this.drawTrace(this.data).attr('pointer-events', 'none');
    // Replace in place to retain trace ordering beneath the separate marker layer.
    this.group.Node!.replaceWith(group.Node!);
    this.group = group;
    this.group.Element.style('display', () => (this.visible ? null : 'none'));
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.Element.style('display', () => (visible ? null : 'none'));
    this.markers.forEach(({ marker }) => {
      if (!visible) {
        marker.cancelDrag();
      }
      marker.Element.style('display', () => (visible ? null : 'none'));
    });
  }

  private copySamples(values: TraceSamples): TraceSamples {
    if (
      !values.length ||
      values.some(
        ({ frequencyHz, reflectionCoefficient }) =>
          !Number.isFinite(frequencyHz) ||
          frequencyHz < 0 ||
          reflectionCoefficient.length !== 2 ||
          !reflectionCoefficient.every(Number.isFinite),
      )
    ) {
      throw new Error(
        'A dataset requires samples with a non-negative finite frequency and two finite coordinates.',
      );
    }
    return values.map(({ frequencyHz, reflectionCoefficient }) => ({
      frequencyHz,
      reflectionCoefficient: [reflectionCoefficient[0], reflectionCoefficient[1]],
    }));
  }

  private notifyMarker(entry: Marker): void {
    const timer = setTimeout(() => {
      this.pendingEvents.delete(timer);
      const index = this.markers.indexOf(entry);
      if (!this.destroyed && index >= 0) {
        this.handler?.(index, entry.selectedPoint);
      }
    }, 0);
    this.pendingEvents.add(timer);
  }

  private cancelEvents(): void {
    this.pendingEvents.forEach((timer) => clearTimeout(timer));
    this.pendingEvents.clear();
  }

  public update(values: TraceSamples, preserveMarkerIndices = false): void {
    if (this.destroyed) {
      throw new Error('This dataset has been removed.');
    }
    const samples = this.copySamples(values);
    const selectedIndices = this.markers.map((entry) => this.data.indexOf(entry.selectedPoint));
    this.cancelEvents();
    this.data = samples;
    const group = this.drawTrace(samples).attr('pointer-events', 'none');
    this.group.Element.remove();
    this.group = group;
    this.group.Element.style('display', () => (this.visible ? null : 'none'));
    this.fgContainer.append(group);
    this.zoomDataPoints();
    this.markers.forEach((entry, index) => {
      entry.selectedPoint = preserveMarkerIndices
        ? samples[selectedIndices[index]]
        : this.findClosestPointTo(entry.selectedPoint.reflectionCoefficient);
      entry.marker.move(this.scaler.point(entry.selectedPoint.reflectionCoefficient));
      this.notifyMarker(entry);
    });
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.cancelEvents();
    this.handler = null;
    this.markers.forEach(({ marker }) => marker.destroy());
    this.markers = [];
    this.markerDragHandler = undefined;
    this.data = [];
    this.group.Element.remove();
  }

  public getMarker(index: number): Marker | undefined {
    return this.markers[index];
  }

  public get Markers(): Marker[] {
    return this.markers.slice();
  }

  public setMarkerMoveHandler(handler: (marker: number, data: TraceSample) => void): void {
    this.handler = handler;
  }

  private findClosestPointTo(p: Point): TraceSample {
    const dist = (p1: Point, p2: Point) => {
      const xd = p1[0] - p2[0];
      const yd = p1[1] - p2[1];
      return Math.sqrt(xd * xd + yd * yd);
    };

    return this.data.reduce((prev, curr) => {
      const d1 = dist(p, prev.reflectionCoefficient);
      const d2 = dist(p, curr.reflectionCoefficient);
      return d1 <= d2 ? prev : curr;
    });
  }
}
