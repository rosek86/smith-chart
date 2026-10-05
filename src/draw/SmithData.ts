import { SmithGroup } from './SmithGroup.js';
import { SmithCircle } from './SmithCircle.js';
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
  private pointRadius = 2;
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
  ) {
    this.data = this.copySamples(data);
    this.group = this.drawPoints(this.data);
    this.group.attr('pointer-events', 'none');
    this.fgContainer.append(this.group);
    this.zoomDataPoints();
  }

  private drawPoints(data: TraceSamples): SmithGroup {
    const group = new SmithGroup({
      stroke: 'none',
      strokeWidth: 'none',
      fill: this.color,
    });
    group.attr('data-role', 'samples');
    data.forEach((dp) => {
      const p = this.scaler.point(dp.reflectionCoefficient);
      group.append(new SmithCircle({ p, r: this.pointRadius }));
    });
    return group;
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
    this.group.Element.selectAll('*').attr('r', this.pointRadius / k);
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
    this.markers.forEach(({ marker }) => marker.setColor(color));
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
    const group = this.drawPoints(samples).attr('pointer-events', 'none');
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
