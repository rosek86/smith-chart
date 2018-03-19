import * as d3 from 'd3';

import { Point } from './Point';
import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithArc extends SmithShape {
  public constructor(p1: Point, p2: Point, r: number, largeArc: string, sweep: string, options?: SmithDrawOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'path')
    ));
    options && this.setDrawOptions(options);
    this.draw(p1, p2, r, largeArc, sweep);
  }

  private draw(p1: Point, p2: Point, r: number, largeArc: string, sweep: string): SmithArc {
    this.element.attr('d',
      `M${p1[0]},${p1[1]} A${r},${r} 0 ${largeArc},${sweep} ${p2[0]},${p2[1]}`
    );
    return this;
  }
}
