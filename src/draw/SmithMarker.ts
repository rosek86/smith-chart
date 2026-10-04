import * as d3 from 'd3';

import { MouseGesture } from './MouseGesture.js';
import { SmithShape } from './SmithShape.js';
import { Point } from '../shapes/Point.js';

export class SmithMarker extends SmithShape {
  private readonly size = 18;
  private mouseGesture = new MouseGesture();
  private activeDrags = new Set<string | number>();
  private destroyed = false;

  private triangle: d3.Selection<SVGPolygonElement, unknown, null, undefined>;
  private inner: d3.Selection<SVGPolygonElement, unknown, null, undefined>;
  private text: d3.Selection<SVGTextElement, unknown, null, undefined>;

  private rc: Point = [0, 0];
  private dragHandler: ((p: Point) => void) | null = null;

  public constructor(
    marker: number,
    color: string,
    private dragStateHandler: ((dragging: boolean) => void) | null = null,
  ) {
    super(
      d3.select<SVGElement, unknown>(document.createElementNS('http://www.w3.org/2000/svg', 'g')),
    );

    const g = this.Element.style('cursor', 'var(--smithkit-marker-cursor, grab)');

    this.triangle = g
      .append<SVGPolygonElement>('polygon')
      .attr('stroke', 'none')
      .attr('fill', 'gray')
      .attr('transform', 'translate(0,0)');

    this.inner = g
      .append<SVGPolygonElement>('polygon')
      .attr('stroke', 'none')
      .attr('fill', color)
      .attr('transform', 'translate(0,0)');

    this.text = g
      .append<SVGTextElement>('text')
      .attr('pointer-events', 'none')
      .attr('transform', 'translate(0,0)')
      .attr('font-family', 'Verdana')
      .attr('font-weight', 'normal')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('x', '0')
      .attr('y', '0')
      .attr('fill', 'white')
      .text(marker.toString());

    this.zoom(1);

    const drag = d3
      .drag<SVGPolygonElement, unknown>()
      .on('start', (event: d3.D3DragEvent<SVGPolygonElement, unknown, unknown>) => {
        if (this.destroyed) {
          return;
        }
        this.mouseGesture.capture(event.sourceEvent, 'drag');
        const wasIdle = this.activeDrags.size === 0;
        this.activeDrags.add(event.identifier);
        if (wasIdle) {
          this.dragStateHandler?.(true);
        }
      })
      .on('drag', (event: d3.D3DragEvent<SVGPolygonElement, unknown, unknown>) =>
        this.onDrag(event),
      )
      .on('end', (event: d3.D3DragEvent<SVGPolygonElement, unknown, unknown>) => {
        if (this.activeDrags.delete(event.identifier) && this.activeDrags.size === 0) {
          this.dragStateHandler?.(false);
        }
      });
    this.triangle.call(drag);
    this.inner.call(drag);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.dragHandler = null;
    this.cancelDrag();
    this.dragStateHandler = null;
    this.Element.selectAll('*').on('.drag', null).interrupt();
    this.Element.remove();
  }

  public cancelDrag(): void {
    if (this.activeDrags.size > 0) {
      this.activeDrags.clear();
      this.dragStateHandler?.(false);
    }
    this.mouseGesture.destroy();
  }

  public setColor(color: string): void {
    this.inner.attr('fill', color);
  }

  private onDrag(event: d3.D3DragEvent<SVGPolygonElement, unknown, unknown>) {
    if (this.dragHandler) {
      this.dragHandler([event.x, event.y]);
    }
  }

  public get Position(): Point {
    return this.rc;
  }

  public move(p: Point): void {
    this.rc = p;
    this.triangle.attr('transform', `translate(${p[0]},${p[1]})`);
    this.inner.attr('transform', `translate(${p[0]},${p[1]})`);
    this.text.attr('x', `${p[0]}`).attr('y', `${p[1]}`);
  }

  public zoom(k: number) {
    const size = this.size / k;

    const h = size / 12;
    const dy = -size / 1.6;
    const fs = size / 1.8;

    // calculate inner triangle
    const alpha = Math.atan(1 / 2);
    const beta = Math.PI / 2 - alpha;
    const x = h / Math.sin(alpha);
    const y = h / Math.sin(beta) + h / Math.tan(beta);

    this.triangle.attr('points', `0,0 ${size / 2},${-size} ${-size / 2},${-size}`);
    this.inner.attr('points', `0,${-x} ${size / 2 - y},${-size + h} ${-size / 2 + y},${-size + h}`);
    this.text.attr('font-size', `${fs}`).attr('dy', `${dy}`);
  }

  public show(): void {
    this.Element.attr('opacity', null);
  }

  public hide(): void {
    this.Element.attr('opacity', '0');
  }

  public setDragHandler(handler: (p: Point) => void): void {
    this.dragHandler = handler;
  }
}
