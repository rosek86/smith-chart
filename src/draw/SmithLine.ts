import * as d3 from 'd3';

import { Point } from '../shapes/Point';
import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithLine extends SmithShape {
  public constructor(p1: Point, p2: Point, options?: SmithDrawOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'line')
    ));
    if (options) {
      this.setDrawOptions(options);
    }
    this.move(p1, p2);
  }

  public move(p1: Point, p2: Point): SmithLine {
    this.element
      .attr('x1', p1[0]).attr('y1', p1[1])
      .attr('x2', p2[0]).attr('y2', p2[1]);
    return this;
  }

  public hide(): void {
    this.Element.attr('opacity', '0');
  }

  public show(): void {
    this.Element.attr('opacity', null);
  }

  public nonScalingStroke(): void {
    this.Element.attr('vector-effect',  'non-scaling-stroke');
  }

  public setStrokeLinecap(linecap: string): void {
    this.Element.attr('stroke-linecap', linecap);
  }
}
