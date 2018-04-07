
import { SmithGroup } from './SmithGroup';
import { SmithArc } from './SmithArc';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { SmithDrawOptions } from './SmithDrawOptions';

interface ConstQDrawOptions {
  stroke: string;
  strokeWidth: string;
}

export class ConstQCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();
  private circles = [ 0.5, 1, 2, 5, 10 ];
  private opts: ConstQDrawOptions;
  private container: SmithGroup;

  public constructor() {
    this.container = new SmithGroup()
      .attr('fill', 'none')
      .hide();

    this.drawConstQCircles(this.circles);

    this.opts = this.getDefaultDrawOptions();
    this.setDrawOptions(this.opts);
  }

  private drawConstQCircles(Qs: number[]): void {
    Qs.forEach((Q) => this.drawConstQCircle(Q));
  }

  private drawConstQCircle(Q: number): void {
    const r = this.calcs.constQCircle(Q).r;
    this.container.append(new SmithArc([-1, 0], [1, 0], r, false, false));
    this.container.append(new SmithArc([-1, 0], [1, 0], r, false, true));
  }

  private getDefaultDrawOptions(): ConstQDrawOptions {
    return { stroke: 'blue', strokeWidth: '0.001' };
  }

  public setDrawOptions(opts: ConstQDrawOptions): void {
    this.opts = opts;
    this.container.setDrawOptions(opts);
  }

  public set Stroke(stroke: string) {
    this.opts.stroke = stroke;
    this.container.Stroke = stroke;
  }

  public get Stroke(): string {
    return this.opts.stroke;
  }

  public set StrokeWidth(width: string) {
    this.opts.strokeWidth = width;
    this.container.StrokeWidth = width;
  }

  public get StrokeWidth(): string {
    return this.opts.strokeWidth;
  }

  public draw(): SmithGroup {
    return this.container;
  }

  public show(): void {
    this.container.show();
  }

  public hide(): void {
    this.container.hide();
  }

  public append(Q: number): void {
    const index = this.circles.indexOf(Q);
    if (index !== -1) { return; }

    this.circles.push(Q);
    this.drawConstQCircle(Q);
  }

  public remove(swr: number): void {
    const index = this.circles.indexOf(swr);
    if (index === -1) { return; }

    this.circles.splice(index, 1);
    this.container.Element.selectAll('*').remove();
    this.drawConstQCircles(this.circles);
  }
}
