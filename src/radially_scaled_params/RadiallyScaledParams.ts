import { SmithLine } from '../draw/SmithLine';
import { SmithGroup } from '../draw/SmithGroup';
import { SmithScaler } from '../draw/SmithScaler';
import { SmithConstantCircle } from '../SmithConstantCircle';

export class RadiallyScaledParams {
  private calcs = new SmithConstantCircle();

  constructor(private scaler: SmithScaler) {
  }

  public draw(): SmithGroup {
    const tickSize = 0.02;
    const offsets = [ -1.1, -1.2, -1.3, -1.4 ];

    let offset = offsets[0];

    // swr
    const swrTicksGroup = new SmithGroup();
    const swrTicks = [
      1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 10, 20, 40, 100, Number.MAX_VALUE
    ];
    for (const swr of swrTicks) {
      const rc = this.calcs.swrToAbsReflectionCoefficient(swr);
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset ]),
        this.scaler.point([ -rc, offset + tickSize ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      swrTicksGroup.append(tick);
    }

    // dB referred to Standing Wave Ratio (dBS)
    const dbsTicksGroup = new SmithGroup();
    const dbsTicks = [
      1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, Number.MAX_VALUE
    ];
    for (const dbs of dbsTicks) {
      const rc = this.calcs.dBSToAbsReflectionCoefficient(dbs);
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset - tickSize ]),
        this.scaler.point([ -rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      dbsTicksGroup.append(tick);
    }

    offset = offsets[1];

    // return loss (dB)
    const rlTicksGroup = new SmithGroup();
    const rlTicks = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 30
    ];
    for (const rl of rlTicks) {
      const rc = this.calcs.returnLossToReflectionCoefficientAbs(rl);
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset ]),
        this.scaler.point([ -rc, offset + tickSize ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      rlTicksGroup.append(tick);
    }

    // Reflection coefficient power
    const rcpTicksGroup = new SmithGroup();
    const rcpTicks = [
      1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.01, 0
    ];
    for (const rcp of rcpTicks) {
      const rc = this.calcs.rflCoeffPToRflCoeffEOrI(rcp);
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset - tickSize ]),
        this.scaler.point([ -rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      rcpTicksGroup.append(tick);
    }

    offset = offsets[2];
    const rcTicksGroup = new SmithGroup();
    const rcTicks = [
      1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0
    ];
    for (const rc of rcTicks) {
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset + tickSize ]),
        this.scaler.point([ -rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      rcTicksGroup.append(tick);
    }

    const container = new SmithGroup();
    container.append(this.drawAxis(offsets));
    container.append(swrTicksGroup);
    container.append(rlTicksGroup);
    container.append(dbsTicksGroup);
    container.append(rcpTicksGroup);
    container.append(rcTicksGroup);

    return container;
  }

  private drawAxis(offsets: number[]): SmithGroup {
    const group = new SmithGroup();
    group.append(new SmithLine(
      this.scaler.point([ 0, offsets[0] ]),
      this.scaler.point([ 0, offsets[2] ]), {
        stroke:       'black',
        strokeWidth:  '1'
      }
    ));
    for (const o of offsets) {
      group.append(this.drawAxisLine(o));
    }

    const len = 0.2;
    for (const offset of offsets) {
      group.append(new SmithLine(
        this.scaler.point([ -1.05,       offset       ]),
        this.scaler.point([ -1.05 - len, offset + len ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      ));
      group.append(new SmithLine(
        this.scaler.point([ 1.05,       offset       ]),
        this.scaler.point([ 1.05 + len, offset + len ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      ));
    }
    return group;
  }

  private drawAxisLine(offset: number): SmithLine {
    const p1 = this.scaler.point([ -1.05, offset ]);
    const p2 = this.scaler.point([  1.05, offset ]);
    const line = new SmithLine(p1, p2, {
      stroke:       'black',
      strokeWidth:  '1'
    });
    return line;
  }
}
