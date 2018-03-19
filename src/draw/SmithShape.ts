import * as d3 from 'd3';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithShape {
  constructor(protected element: d3.Selection<SVGElement, {}, null, undefined>) {
  }

  public setDrawOptions(opts: SmithDrawOptions): SmithShape {
    opts.stroke      !== undefined && (this.Stroke      = opts.stroke     );
    opts.strokeWidth !== undefined && (this.StrokeWidth = opts.strokeWidth);
    opts.fill        !== undefined && (this.Fill        = opts.fill       );
    return this;
  }

  public set Stroke(color: string) {
    this.element.attr('stroke', color);
  }

  public set StrokeWidth(width: string) {
    this.element.attr('stroke-width', width);
  }

  public set Fill(color: string) {
    this.element.attr('fill', color);
  }

  public get Node(): SVGElement|null {
    return this.element.node();
  }

  public get Element(): d3.Selection<SVGElement, {}, null, undefined> {
    return this.element;
  }
}
