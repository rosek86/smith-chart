import { SmithGroup } from './SmithGroup';
import { S1P, S1PEntry } from '../SnP';
import { SmithCircle } from './SmithCircle';
import { SmithMarker } from './SmithMarker';
import { Point } from './Point';

import * as d3 from 'd3';

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
  private pointRadius = 0.005;

  private group: SmithGroup;

  private markersCount = 0;
  private markers: Marker[] = [];

  private handler: ((marker: number, data: S1PEntry) => void)|null = null;

  public constructor(
      private data: S1P,
      private color: string,
      private transform: Transform,
      private fgContainer: SmithGroup, private bgContainer: SmithGroup) {
    this.group = this.drawPoints(data);
    this.bgContainer.append(this.group);
  }

  private drawPoints(data: S1P): SmithGroup {
    const group = new SmithGroup({
      stroke: 'none', strokeWidth: 'none', fill: this.color
    });
    data.forEach((dp) => {
      group.append(new SmithCircle({ p: dp.point, r: this.pointRadius }));
    });
    return group;
  }

  public zoom(transform: Transform): void {
    this.transform = transform;
    this.zoomDataPoints();
    this.zoomAllMarkers();
  }

  private zoomDataPoints(): void {
    const k = this.transform.k;
    this.group.Element.selectAll('*').attr('r', this.pointRadius / k);
  }

  private zoomAllMarkers(): void {
    for (const marker of this.markers) {
      const rc = marker.selectedPoint;
      rc && marker.marker.move(this.bg2fg(rc.point));
    }
  }

  public addMarker(): void {
    const markerIndex = this.markersCount++;
    const marker = new SmithMarker(markerIndex + 1, this.color);

    const markerDesc: Marker = { marker, selectedPoint: this.data[0], };
    this.markers.push(markerDesc);

    this.fgContainer.append(marker);
    marker.Element.raise();

    marker.setDragHandler((mp) => {
      const dp = this.findClosestPointTo(this.fg2bg(mp));

      if (markerDesc.selectedPoint === dp) { return; }
      markerDesc.selectedPoint = dp;

      marker.move(this.bg2fg(dp.point));

      setTimeout(() => {
        this.handler && this.handler(markerIndex, dp);
      }, 0);
    });

    marker.show();
    marker.move(this.bg2fg(markerDesc.selectedPoint.point));

    setTimeout(() => {
      this.handler && this.handler(markerIndex, markerDesc.selectedPoint);
    }, 0);
  }

  public getMarker(index: number): Marker|undefined {
    return this.markers[index];
  }

  public get Markers(): Marker[] {
    return this.markers.slice();
  }

  public setMarkerMoveHandler(handler: (marker: number, data: S1PEntry) => void): void {
    this.handler = handler;
  }

  private fg2bg(p: Point): Point {
    const po: Point = [p[0], p[1]];
    po[0] -=  this.transform.x;
    po[1] -=  this.transform.y;
    po[0] /=  this.transform.k;
    po[1] /= -this.transform.k;
    return po;
  }

  private bg2fg(p: Point): Point {
    const po: Point = [p[0], p[1]];
    po[0] *=  this.transform.k;
    po[1] *= -this.transform.k;
    po[0] +=  this.transform.x;
    po[1] +=  this.transform.y;
    return po;
  }

  private findClosestPointTo(p: Point): S1PEntry {
    const dist = (p1: Point, p2: Point) => {
      const xd = p1[0] - p2[0];
      const yd = p1[1] - p2[1];
      return  Math.sqrt(xd * xd + yd * yd);
    };

    return this.data.reduce((prev, curr) => {
      const d1 = dist(p, prev.point);
      const d2 = dist(p, curr.point);
      return d1 <= d2 ? prev : curr;
    });
  }
}
