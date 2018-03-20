import * as d3 from 'd3';
import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithGroup extends SmithShape {
  public constructor(options?: SmithDrawOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'g')
    ));
    options && this.setDrawOptions(options);
  }

  public rotateY(): SmithGroup {
    this.element.attr('transform', 'scale(1, -1)');
    return this;
  }

  public get Element(): d3.Selection<SVGElement, {}, null, undefined> {
    return this.element;
  }

  public append(el: SmithShape|null): SmithGroup {
    if (el !== null) {
      this.element.append(() => el.Node);
    }
    return this;
  }
}
