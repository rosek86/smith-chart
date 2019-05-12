import * as d3 from 'd3';

import { Point } from './Point';
import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithArc extends SmithShape {
  public constructor(p1: Point, p2: Point, r: number, largeArc: boolean, sweep: boolean, options?: SmithDrawOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'path')
    ));
    if (options) {
      this.setDrawOptions(options);
    }
    this.move(p1, p2, r, largeArc, sweep);
  }

  public move(p1: Point, p2: Point, r: number, largeArc: boolean, sweep: boolean): SmithArc {
    const la = largeArc ? '1' : '0';
    const s = sweep ? '1' : '0';
    this.element.attr('d',
      `M${p1[0]},${p1[1]} A${r},${r} 0 ${la},${s} ${p2[0]},${p2[1]}`
    );
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
