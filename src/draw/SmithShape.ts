import * as d3 from 'd3';
import { SmithDrawOptions } from './SmithDrawOptions';

export class SmithShape {
  constructor(protected element: d3.Selection<SVGElement, {}, null, undefined>) {
  }

  public setDrawOptions(opts: SmithDrawOptions): SmithShape {
    if (opts.stroke     ) { this.Stroke      = opts.stroke;      }
    if (opts.strokeWidth) { this.StrokeWidth = opts.strokeWidth; }
    if (opts.fill       ) { this.Fill        = opts.fill;        }
    return this;
  }

  public set Stroke(color: string) {
    this.element.attr('stroke', color);
  }

  public get Stroke(): string {
    return this.element.attr('stroke');
  }

  public set StrokeWidth(width: string) {
    this.element.attr('stroke-width', width);
  }

  public get StrokeWidth(): string {
    return this.element.attr('stroke-width');
  }

  public set Fill(color: string) {
    this.element.attr('fill', color);
  }

  public get Fill(): string {
    return this.element.attr('fill');
  }

  public get Node(): SVGElement|null {
    return this.element.node();
  }

  public get Element(): d3.Selection<SVGElement, {}, null, undefined> {
    return this.element;
  }
}
