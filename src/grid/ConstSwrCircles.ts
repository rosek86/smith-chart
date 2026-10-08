import { SmithGroup } from '../svg/SmithGroup.js';
import { SmithCircle } from '../svg/SmithCircle.js';
import { SmithConstantCircle } from '../rf/SmithConstantCircle.js';
import { SmithScaler } from '../svg/SmithScaler.js';

interface ConstSwrDrawOptions {
  stroke: string;
  strokeWidth: string;
}

export class ConstSwrCircles {
  private calcs = new SmithConstantCircle();
  private circles = [1.2, 1.5, 2, 3, 5, 10];
  private opts: ConstSwrDrawOptions;
  private container: SmithGroup;

  public constructor(private scaler: SmithScaler) {
    this.container = new SmithGroup().attr('fill', 'none').hide();

    this.drawConstSwrCircles(this.circles);

    this.opts = this.getDefaultDrawOptions();
    this.setDrawOptions(this.opts);
  }

  private drawConstSwrCircles(swrs: number[]): void {
    swrs.forEach((swr) => this.drawConstSwrCircle(swr));
  }

  private drawConstSwrCircle(swr: number): void {
    const c = this.scaler.circle({
      p: [0, 0],
      r: this.calcs.swrToRflCoeffEOrI(swr),
    });
    const circle = new SmithCircle(c);
    circle.nonScalingStroke();
    this.container.append(circle);
  }

  private getDefaultDrawOptions(): ConstSwrDrawOptions {
    return { stroke: 'var(--smithkit-circles-vswr)', strokeWidth: 'var(--smithkit-circles-width)' };
  }

  public setDrawOptions(opts: ConstSwrDrawOptions): void {
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

  public visibility(visible: boolean): ConstSwrCircles {
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

  public append(swr: number): void {
    const index = this.circles.indexOf(swr);
    if (index !== -1) {
      return;
    }

    this.circles.push(swr);
    this.drawConstSwrCircle(swr);
  }

  public remove(swr: number): void {
    const index = this.circles.indexOf(swr);
    if (index === -1) {
      return;
    }

    this.circles.splice(index, 1);
    this.container.Element.selectAll('*').remove();
    this.drawConstSwrCircles(this.circles);
  }
}
