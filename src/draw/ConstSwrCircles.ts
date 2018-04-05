
import { SmithGroup } from './SmithGroup';
import { SmithCircle } from './SmithCircle';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';

export class ConstSwrCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  public draw(): SmithGroup {
    const swrs = [ 1.2, 1.5, 2, 3, 5, 10 ];

    const group = new SmithGroup();

    for (const swr of swrs) {
      group.append(
        new SmithCircle({
          p: [0,0],
          r: this.calcs.swrToAbsReflectionCoefficient(swr)
        }, { stroke: 'orange', strokeWidth: '0.003', fill: 'none'})
      );
    }

    group.hide();
    return group;
  }
}
