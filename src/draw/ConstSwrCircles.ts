
import { SmithGroup } from './SmithGroup';
import { SmithCircle } from './SmithCircle';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { SmithDrawOptions } from './SmithDrawOptions';

export class ConstSwrCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  private container: SmithGroup;

  public constructor(opts: SmithDrawOptions) {
    const swrs = [ 1.2, 1.5, 2, 3, 5, 10 ];
    this.container = this.drawConstSwrCircles(swrs, opts);
  }

  private drawConstSwrCircles(swrs: number[], opts: SmithDrawOptions): SmithGroup {
    const group = new SmithGroup();

    for (const swr of swrs) {
      group.append(new SmithCircle({
        p: [ 0, 0 ],
        r: this.calcs.swrToAbsReflectionCoefficient(swr)
      }, opts));
    }

    group.hide();
    return group;
  }

  public setDrawOptions(opts: SmithDrawOptions): void {
    this.container.setDrawOptions(opts);
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
}
