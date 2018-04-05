
import { SmithGroup } from './SmithGroup';
import { SmithArc } from './SmithArc';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';

export class ConstQCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  public draw(): SmithGroup {
    // Center is (0, +1/Q) or (0, -1/Q).
    // Radius is sqrt(1+1/Q^2).

    const Qs = [ 0.5, 1, 2, 5, 10 ];

    const group = new SmithGroup({
      stroke: 'blue', strokeWidth: '0.001', fill: 'none'
    });

    for (const Q of Qs) {
      const r = Math.sqrt(1 + 1 / (Q * Q));
      const q1 = new SmithArc([-1, 0], [1, 0], r, false, false);
      group.append(q1);

      const q2 = new SmithArc([-1, 0], [1, 0], r, false, true);
      group.append(q2);
    }

    group.hide();

    return group;
  }
}
