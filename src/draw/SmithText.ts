import * as d3 from 'd3';

import { Point } from './Point';
import { SmithShape } from './SmithShape';
import { SmithDrawOptions } from './SmithDrawOptions';

interface TextOptions {
  dx?: string;
  dy?: string;
  stroke?: string;
  fill?: string;
  fontFamily?: string;
  fontSize?: string;
  textAnchor?: string;
}

export class SmithText extends SmithShape {
  public constructor(p: Point, text: string, opts?: TextOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'text')
    ));
    this.element
      .attr('pointer-events', 'none')
      .attr('transform', 'translate(0,0) scale(1,-1)')
      .text(text);
    opts && this.setTextOptions(opts);
    this.move(p);
  }

  public move(p1: Point): SmithText {
    this.element.attr('x', p1[0]).attr('y', p1[1]);
    return this;
  }

  public text(text: string): SmithText {
    this.element.text(text);
    return this;
  }

  public setTextOptions(opts: TextOptions): SmithText {
    opts.dx         !== undefined && this.element.attr('dx',          opts.dx        );
    opts.dy         !== undefined && this.element.attr('dy',          -opts.dy       );
    opts.stroke     !== undefined && this.element.attr('stroke',      opts.stroke    );
    opts.fill       !== undefined && this.element.attr('fill',        opts.fill      );
    opts.fontFamily !== undefined && this.element.attr('font-family', opts.fontFamily);
    opts.fontSize   !== undefined && this.element.attr('font-size',   opts.fontSize  );
    opts.textAnchor !== undefined && this.element.attr('text-anchor', opts.textAnchor);
    return this;
  }
}
