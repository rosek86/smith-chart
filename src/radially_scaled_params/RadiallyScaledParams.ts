import { SmithLine } from '../draw/SmithLine';
import { SmithGroup } from '../draw/SmithGroup';
import { SmithScaler } from '../draw/SmithScaler';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { Complex } from '../complex/Complex';

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
      1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 10, 20, 40, 100, 1e9
    ];
    for (const swr of swrTicks) {
      const rc = this.calcs.swrToRflCoeffEOrI(swr);
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
      1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 1e9
    ];
    for (const dbs of dbsTicks) {
      const rc = this.calcs.dBSToAbsRflCoeff(dbs);
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset - tickSize ]),
        this.scaler.point([ -rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      dbsTicksGroup.append(tick);
    }

    // SW. LOSS COEF.
    const swLossCoeffTicksGroup = new SmithGroup();
    const swLossCoeffTicks = [
      1, 1.1, 1.2, 1.3, 1.4, 1.6, 1.8, 2, 3, 4, 5, 10, 20, 1e9
    ];
    for (const swl of swLossCoeffTicks) {
      const rc = this.calcs.swLossCoeffToRflCoeffEOrI(swl);
      const tick = new SmithLine(
        this.scaler.point([ rc, offset - tickSize ]),
        this.scaler.point([ rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      swLossCoeffTicksGroup.append(tick);
    }

    offset = offsets[1];

    // return loss (dB)
    const rlTicksGroup = new SmithGroup();
    const rlTicks = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 30
    ];
    for (const rl of rlTicks) {
      const rc = this.calcs.returnLossToRflCoeffEOrI(rl);
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
      const rc = this.calcs.rflCoeffPToEOrI(rcp);
      const tick = new SmithLine(
        this.scaler.point([ -rc, offset - tickSize ]),
        this.scaler.point([ -rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      rcpTicksGroup.append(tick);
    }

    // reflection loss
    const mismatchLossTicksGroup = new SmithGroup();
    const mismatchLossTicks = [
      0, 0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 5, 10, 15, 1e9
    ];
    for (const rl of mismatchLossTicks) {
      const rc = this.calcs.mismatchLossToRflCoeffEOrI(rl);
      const tick = new SmithLine(
        this.scaler.point([ rc, offset + tickSize ]),
        this.scaler.point([ rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      mismatchLossTicksGroup.append(tick);
    }

    // s. w. peak (const. p)
    const swPeakTicksGroup = new SmithGroup();
    const swPeakTicks = [
      0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.5, 3, 4, 5, 10, 1e9
    ];
    for (const swp of swPeakTicks) {
      const rc = this.calcs.swPeakConstPToRflCoeffEOrI(swp);
      const tick = new SmithLine(
        this.scaler.point([ rc, offset - tickSize ]),
        this.scaler.point([ rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      swPeakTicksGroup.append(tick);
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

    const tcpTicksGroup = new SmithGroup();
    const tcpTicks = [
      1, 0.99, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0
    ];
    for (const tcp of tcpTicks) {
      const rc = this.calcs.transmCoeffPToRflCoeffEOrI(tcp);
      const tick = new SmithLine(
        this.scaler.point([ rc, offset + tickSize ]),
        this.scaler.point([ rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      tcpTicksGroup.append(tick);
    }

    offset = offsets[3];

    const tcTicksGroup = new SmithGroup();
    const tcTicks = [
      0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
      1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0
    ];
    for (const tc of tcTicks) {
      const rc = this.calcs.transmCoeffToRflCoeff(Complex.from(tc, 0)).imag;
      const tick = new SmithLine(
        this.scaler.point([ rc, offset + tickSize ]),
        this.scaler.point([ rc, offset ]), {
          stroke:       'black',
          strokeWidth:  '1'
        }
      );
      tcTicksGroup.append(tick);
    }

    const container = new SmithGroup();
    container.append(this.drawAxis(offsets));
    container.append(swrTicksGroup);
    container.append(rlTicksGroup);
    container.append(dbsTicksGroup);
    container.append(rcpTicksGroup);
    container.append(rcTicksGroup);
    container.append(mismatchLossTicksGroup);
    container.append(tcpTicksGroup);
    container.append(swPeakTicksGroup);
    container.append(swLossCoeffTicksGroup);
    container.append(tcTicksGroup);

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
        this.scaler.point([  1.05,       offset       ]),
        this.scaler.point([  1.05 + len, offset + len ]), {
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
