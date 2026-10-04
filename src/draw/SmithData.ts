import { SmithGroup } from './SmithGroup.js';
import { SmithCircle } from './SmithCircle.js';
import { SmithMarker } from './SmithMarker.js';
import { SmithScaler } from './SmithScaler.js';

import { S1P, S1PEntry } from '../SnP.js';
import { Point } from '../shapes/Point.js';

interface Marker {
  marker: SmithMarker;
  selectedPoint: S1PEntry;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

export class SmithData {
  private pointRadius = 2;
  private destroyed = false;
  private pendingEvents = new Set<ReturnType<typeof setTimeout>>();

  private group: SmithGroup;

  private markersCount = 0;
  private markers: Marker[] = [];

  private handler: ((marker: number, data: S1PEntry) => void) | null = null;

  public constructor(
    private data: S1P,
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

  private drawPoints(data: S1P): SmithGroup {
    const group = new SmithGroup({
      stroke: 'none',
      strokeWidth: 'none',
      fill: this.color,
    });
    group.attr('data-role', 'samples');
    data.forEach((dp) => {
      const p = this.scaler.point(dp.point);
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

  public addMarker(): void {
    if (this.destroyed) {
      throw new Error('This dataset has been removed.');
    }
    const markerIndex = this.markersCount++;
    const marker = new SmithMarker(markerIndex + 1, this.color, (dragging) =>
      this.markerDragHandler?.(marker, dragging),
    );

    const markerDesc: Marker = { marker, selectedPoint: this.data[0] };
    this.markers.push(markerDesc);

    marker.Element.attr('data-role', 'marker');
    this.markerContainer.append(marker);

    marker.setDragHandler((mp) => {
      const dp = this.findClosestPointTo(this.scaler.pointInvert(mp));

      if (markerDesc.selectedPoint === dp) {
        return;
      }
      markerDesc.selectedPoint = dp;

      marker.move(this.scaler.point(dp.point));
      marker.zoom(this.transform.k);

      this.notifyMarker(markerIndex);
    });

    marker.zoom(this.transform.k);
    marker.show();
    marker.move(this.scaler.point(markerDesc.selectedPoint.point));

    this.notifyMarker(markerIndex);
  }

  private copySamples(values: S1P): S1P {
    if (
      !values.length ||
      values.some(
        ({ freq, point }) =>
          !Number.isFinite(freq) || freq < 0 || point.length !== 2 || !point.every(Number.isFinite),
      )
    ) {
      throw new Error(
        'A dataset requires samples with a non-negative finite frequency and two finite coordinates.',
      );
    }
    return values.map(({ freq, point }) => ({ freq, point: [point[0], point[1]] }));
  }

  private notifyMarker(index: number): void {
    const timer = setTimeout(() => {
      this.pendingEvents.delete(timer);
      if (!this.destroyed) {
        this.handler?.(index, this.markers[index].selectedPoint);
      }
    }, 0);
    this.pendingEvents.add(timer);
  }

  private cancelEvents(): void {
    this.pendingEvents.forEach((timer) => clearTimeout(timer));
    this.pendingEvents.clear();
  }

  public update(values: S1P): void {
    if (this.destroyed) {
      throw new Error('This dataset has been removed.');
    }
    const samples = this.copySamples(values);
    this.cancelEvents();
    this.data = samples;
    const group = this.drawPoints(samples).attr('pointer-events', 'none');
    this.group.Element.remove();
    this.group = group;
    this.fgContainer.append(group);
    this.zoomDataPoints();
    this.markers.forEach((entry, index) => {
      entry.selectedPoint = this.findClosestPointTo(entry.selectedPoint.point);
      entry.marker.move(this.scaler.point(entry.selectedPoint.point));
      this.notifyMarker(index);
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

  public setMarkerMoveHandler(handler: (marker: number, data: S1PEntry) => void): void {
    this.handler = handler;
  }

  private findClosestPointTo(p: Point): S1PEntry {
    const dist = (p1: Point, p2: Point) => {
      const xd = p1[0] - p2[0];
      const yd = p1[1] - p2[1];
      return Math.sqrt(xd * xd + yd * yd);
    };

    return this.data.reduce((prev, curr) => {
      const d1 = dist(p, prev.point);
      const d2 = dist(p, curr.point);
      return d1 <= d2 ? prev : curr;
    });
  }
}
