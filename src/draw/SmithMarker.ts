import * as d3 from 'd3';

import { SmithShape } from './SmithShape';
import { Point } from '../shapes/Point';

export class SmithMarker extends SmithShape {
  private readonly size = 18;

  private triangle: d3.Selection<SVGPolygonElement, {}, null, undefined>;
  private inner: d3.Selection<SVGPolygonElement, {}, null, undefined>;
  private text: d3.Selection<SVGTextElement, {}, null, undefined>;

  private rc: Point = [ 0, 0 ];
  private dragHandler: ((p: Point) => void)|null = null;

  public constructor(marker: number, color: string) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'g')
    ));

    const g = this.Element;

    this.triangle = g.append<SVGPolygonElement>('polygon')
      .attr('stroke', 'none')
      .attr('fill', 'gray')
      .attr('transform', 'translate(0,0)');

    this.inner = g.append<SVGPolygonElement>('polygon')
      .attr('stroke', 'none')
      .attr('fill', color)
      .attr('transform', 'translate(0,0)');

    this.text = g.append<SVGTextElement>('text')
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

    this.triangle.call(d3.drag<SVGPolygonElement, {}>()
      .on('start', () => { })
      .on('drag', () => this.onDrag())
      .on('end', () => { }));

    this.inner.call(d3.drag<SVGPolygonElement, {}>()
      .on('start', () => { })
      .on('drag', () => this.onDrag())
      .on('end', () => { }));
  }

  private onDrag() {
    if (this.dragHandler) {
      this.dragHandler([ d3.event.x, d3.event.y ]);
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
