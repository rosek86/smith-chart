
import { SmithGroup } from './SmithGroup';
import { SmithArc } from './SmithArc';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { SmithDrawOptions } from './SmithDrawOptions';

export class ConstQCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  private container: SmithGroup;

  public constructor(opts: SmithDrawOptions) {
    const Qs = [ 0.5, 1, 2, 5, 10 ];
    this.container = this.drawConstQCircles(Qs, opts);
  }
  
  private drawConstQCircles(Qs: number[], opts: SmithDrawOptions): SmithGroup {
    const group = new SmithGroup(opts);

    for (const Q of Qs) {
      const r = this.calcs.constQCircle(Q).r;
      group.append(new SmithArc([-1, 0], [1, 0], r, false, false));
      group.append(new SmithArc([-1, 0], [1, 0], r, false, true));
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
