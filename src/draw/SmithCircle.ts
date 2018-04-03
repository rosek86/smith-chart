import * as d3 from 'd3';

import { Circle } from './Circle';
import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithCircle extends SmithShape {
  public constructor(c: Circle, options?: SmithDrawOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    ));
    options && this.setDrawOptions(options);
    this.move(c);
  }

  public move(c: Circle): SmithCircle {
    this.element.attr('cx', c.p[0]).attr('cy', c.p[1]).attr('r', c.r);
    return this;
  }

  public hide(): void {
    // this.Element.attr('visibility', 'hidden');
    this.Element.attr('opacity', '0');
  }

  public show(): void {
    // this.Element.attr('visibility', 'visible');
    this.Element.attr('opacity', null);
  }
}
