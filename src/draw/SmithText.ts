import * as d3 from 'd3';

import { Point } from '../shapes/Point';
import { SmithShape } from './SmithShape';

interface TextOptions {
  dx?: string;
  dy?: string;
  stroke?: string;
  fill?: string;
  fontFamily?: string;
  fontSize?: string;
  textAnchor?: string;
  rotate?: number;
  dominantBaseline?: string;
}

export class SmithText extends SmithShape {
  public constructor(private p: Point, text: string, opts?: TextOptions) {
    super(d3.select<SVGElement, {}>(
      document.createElementNS('http://www.w3.org/2000/svg', 'text')
    ));
    this.element
      .attr('pointer-events', 'none')
      .text(text);
    if (opts) {
      this.setTextOptions(opts);
    }
    this.move(p);
  }

  public move(p: Point): SmithText {
    this.element.attr('x', p[0]).attr('y', p[1]);
    this.p = p;
    return this;
  }

  public text(text: string): SmithText {
    this.element.text(text);
    return this;
  }

  public setTextOptions(opts: TextOptions): SmithText {
    if (opts.dx              ) { this.element.attr('dx',                opts.dx              ); }
    if (opts.dy              ) { this.element.attr('dy',                opts.dy              ); }
    if (opts.stroke          ) { this.element.attr('stroke',            opts.stroke          ); }
    if (opts.fill            ) { this.element.attr('fill',              opts.fill            ); }
    if (opts.fontFamily      ) { this.element.attr('font-family',       opts.fontFamily      ); }
    if (opts.fontSize        ) { this.element.attr('font-size',         opts.fontSize        ); }
    if (opts.textAnchor      ) { this.element.attr('text-anchor',       opts.textAnchor      ); }
    if (opts.dominantBaseline) { this.element.attr('dominant-baseline', opts.dominantBaseline); }

    if (opts.rotate !== undefined) {
      this.element.attr(
        'transform',
        `rotate(${opts.rotate}, ${this.p[0]}, ${this.p[1]})`
      );
    }
    return this;
  }

  public setDominantBaseline(db: string) {
    this.element.attr('dominant-baseline', db);
  }
}
