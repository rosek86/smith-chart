import * as d3 from 'd3';

import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithPath extends SmithShape {
  public constructor(options?: SmithDrawOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'path')
    ));
    options && this.setDrawOptions(options);
  }

  public move(d: string): SmithPath {
    this.element.attr('d', d);
    return this;
  }

  public hide(): void {
    this.Element.attr('opacity', '0');
  }

  public show(): void {
    this.Element.attr('opacity', null);
  }
}
