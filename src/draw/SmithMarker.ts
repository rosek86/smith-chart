import * as d3 from 'd3';

import { SmithShape } from './SmithShape';
import { Point } from './Point';

export class SmithMarker extends SmithShape {
  private triangle: d3.Selection<SVGPolygonElement, {}, null, undefined>;
  private text: d3.Selection<SVGTextElement, {}, null, undefined>;

  private rc: Point = [ 0, 0 ];
  private dragHandler: ((p: Point) => void)|null = null;

  public constructor(marker: number, color: string) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'g')
    ));

    const g = this.Element;

    this.triangle = g.append<SVGPolygonElement>('polygon')
      .attr('points', '0,0 0.03,-0.06 -0.03,-0.06')
      .attr('stroke-width', '0.005')
      .attr('stroke', 'gray')
      .attr('fill', color)
      .attr('transform', 'translate(0,0)');

    this.text = g.append<SVGTextElement>('text')
      .attr('pointer-events', 'none')
      .attr('transform', 'translate(0,0)')
      .attr('font-family', 'Verdana')
      .attr('font-size',   '0.04')
      .attr('font-weight', 'normal')
      .attr('text-anchor', 'middle')
      .attr('x', '0')
      .attr('y', '0')
      .attr('dy', '-0.025')
      .attr('fill', 'white')
      .text(marker.toString());

    this.triangle.call(d3.drag<SVGPolygonElement, {}>()
      .on('start', () => {
        this.triangle.attr('stroke', 'gray');
      })
      .on('drag', () => {
        if (this.dragHandler) {
          this.dragHandler([ d3.event.x, d3.event.y ]);
        }
      })
      .on('end', () => {
        this.triangle.attr('stroke', 'gray');
      }));
  }

  public get Position(): Point {
    return this.rc;
  }

  public move(p: Point): void {
    this.rc = p;
    this.triangle.attr('transform', `translate(${p[0]},${p[1]})`);
    this.text.attr('x', `${p[0]}`).attr('y', `${p[1]}`);
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
