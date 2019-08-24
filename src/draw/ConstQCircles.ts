
import { SmithGroup } from './SmithGroup';
import { SmithArc } from './SmithArc';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { SmithScaler } from './SmithScaler';
import { SmithCircle } from './SmithCircle';

interface ConstQDrawOptions {
  stroke: string;
  strokeWidth: string;
}

export class ConstQCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();
  private circles = [ 0.5, 1, 2, 5, 10 ];
  private opts: ConstQDrawOptions;
  private container: SmithGroup;

  public constructor(private scaler: SmithScaler) {
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
    const a = this.scaler.arc({ p1: [-1, 0], p2: [1, 0], r });

    const a1 = new SmithArc(a.p1, a.p2, a.r, false, false);
    a1.nonScalingStroke();
    this.container.append(a1);

    const a2 = new SmithArc(a.p1, a.p2, a.r, false, true);
    a2.nonScalingStroke();
    this.container.append(a2);
  }

  private getDefaultDrawOptions(): ConstQDrawOptions {
    return { stroke: 'blue', strokeWidth: '1' };
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

  public visibility(visible: boolean): ConstQCircles {
    if (visible) {
      this.container.show();
    } else {
      this.container.hide();
    }
    return this;
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

  public remove(Q: number): void {
    const index = this.circles.indexOf(Q);
    if (index === -1) { return; }

    this.circles.splice(index, 1);
    this.container.Element.selectAll('*').remove();
    this.drawConstQCircles(this.circles);
  }
}
