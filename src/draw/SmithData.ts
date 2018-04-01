import { SmithGroup } from "./SmithGroup";
import { S1P, S1PEntry } from "../SnP";
import { SmithCircle } from "./SmithCircle";
import { SmithMarker } from "./SmithMarker";
import { Point } from "./Point";

interface Marker {
  marker: SmithMarker;
  selectedPoint: S1PEntry;
}

interface Transform {
  x:number;
  y:number;
  k:number;
}

export class SmithData {
  private group: SmithGroup;

  private markersCount = 0;
  private markers: Marker[] = [];

  private pointSize = 1;

  private handler: ((marker: number, data: S1PEntry) => void)|null = null;

  public constructor(private data: S1P, private transform: Transform, private fgContainer: SmithGroup, private bgContainer: SmithGroup) {
    this.group = this.drawPoints(data, 'purple');
    this.bgContainer.append(this.group);

    this.addMarker();
  }

  private drawPoints(data: S1P, fill: string): SmithGroup {
    const group = new SmithGroup({ stroke: 'none', strokeWidth: 'none', fill });
    data.forEach((dp) => group.append(new SmithCircle({ p: dp.point, r: 0.005 })));
    return group;
  }

  public zoom(transform: Transform): void {
    this.transform = transform;
    this.zoomDataPoints();
    this.zoomAllMarkers();
  }

  private zoomDataPoints(): void {
    const k = this.transform.k;
    const g = this.group.Element;

    if (this.pointSize === 5 && k > 10.1) {
      g.selectAll('*').attr('r', '0.001');
      this.pointSize = 10;
    }
    if (this.pointSize === 10 && k < 9.9) {
      g.selectAll('*').attr('r', '0.003');
      this.pointSize = 5;
    }
    if (this.pointSize === 1 && k > 5.1) {
      g.selectAll('*').attr('r', '0.003');
      this.pointSize = 5;
    }
    if (this.pointSize === 5 && k < 4.9) {
      g.selectAll('*').attr('r', '0.005');
      this.pointSize = 1;
    }
  }

  private zoomAllMarkers(): void {
    for (const marker of this.markers) {
      const rc = marker.selectedPoint;
      marker.marker.move(this.bg2fg(rc.point));
    }
  }

  public addMarker(): void {
    const markerIndex = this.markersCount++;
    const marker = new SmithMarker(markerIndex + 1);

    const markerDesc = { marker, selectedPoint: this.data[0], };
    this.markers.push(markerDesc);

    marker.move(this.bg2fg(markerDesc.selectedPoint.point));
    marker.show();

    this.fgContainer.append(marker);
    marker.Element.raise();

    marker.setDragHandler((mp) => {
      const dp = this.findClosestPointTo(this.fg2bg(mp));

      if (markerDesc.selectedPoint === dp) { return; }
      markerDesc.selectedPoint = dp;

      marker.move(this.bg2fg(dp.point));
      this.handler && this.handler(markerIndex, dp);
    });
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
