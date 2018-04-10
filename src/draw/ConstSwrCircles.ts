
import { SmithGroup } from './SmithGroup';
import { SmithCircle } from './SmithCircle';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { SmithDrawOptions } from './SmithDrawOptions';

interface ConstSwrDrawOptions {
  stroke: string;
  strokeWidth: string;
}

export class ConstSwrCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();
  private circles = [ 1.2, 1.5, 2, 3, 5, 10 ];
  private opts: ConstSwrDrawOptions;
  private container: SmithGroup;

  public constructor() {
    this.container = new SmithGroup()
      .attr('fill', 'none')
      .hide();

    this.drawConstSwrCircles(this.circles);

    this.opts = this.getDefaultDrawOptions();
    this.setDrawOptions(this.opts);
  }

  private drawConstSwrCircles(swrs: number[]): void {
    swrs.forEach((swr) => this.drawConstSwrCircle(swr));
  }

  private drawConstSwrCircle(swr: number): void {
    this.container.append(new SmithCircle({
      p: [ 0, 0 ],
      r: this.calcs.swrToAbsReflectionCoefficient(swr)
    }));
  }

  private getDefaultDrawOptions(): ConstSwrDrawOptions {
    return { stroke: 'orange', strokeWidth: '0.003' };
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
    if (index !== -1) { return; }

    this.circles.push(swr);
    this.drawConstSwrCircle(swr);
  }

  public remove(swr: number): void {
    const index = this.circles.indexOf(swr);
    if (index === -1) { return; }

    this.circles.splice(index, 1);
    this.container.Element.selectAll('*').remove();
    this.drawConstSwrCircles(this.circles);
  }
}
