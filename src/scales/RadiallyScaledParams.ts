import { SmithLine } from '../draw/SmithLine.js';
import { SmithGroup } from '../draw/SmithGroup.js';
import { SmithText } from '../draw/SmithText.js';
import { SmithScaler } from '../draw/SmithScaler.js';
import { SmithConstantCircle } from '../SmithConstantCircle.js';

interface RadialScale {
  title: string;
  values: number[];
  position: (value: number) => number;
}

/** Normalized positions along each scale, from zero to one. */
export function radialScales(): RadialScale[] {
  const calcs = new SmithConstantCircle();
  return [
    {
      title: 'VSWR',
      values: [1, 1.5, 2, 3, 5, 10, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swrToRflCoeffEOrI(v)),
    },
    {
      title: 'Standing-wave ratio · dB',
      values: [0, 3, 6, 10, 15, 20, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.dBSToAbsRflCoeff(v)),
    },
    {
      title: 'Return loss · dB',
      values: [Infinity, 20, 14, 10, 6, 3, 0],
      position: (v) => calcs.returnLossToRflCoeffEOrI(v),
    },
    {
      title: 'Mismatch loss · dB',
      values: [0, 0.1, 0.5, 1, 2, 4, Infinity],
      position: (v) => calcs.mismatchLossToRflCoeffEOrI(v),
    },
    {
      title: 'Reflected power · |Γ|²',
      values: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1],
      position: (v) => calcs.rflCoeffPToEOrI(v),
    },
    {
      title: 'Transmitted power · 1 − |Γ|²',
      values: [1, 0.99, 0.9, 0.75, 0.5, 0.25, 0],
      position: (v) => calcs.transmCoeffPToRflCoeffEOrI(v),
    },
    {
      title: 'Standing-wave loss coefficient',
      values: [1, 1.1, 1.5, 2, 3, 5, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swLossCoeffToRflCoeffEOrI(v)),
    },
    {
      title: 'Standing-wave peak · constant power',
      values: [1, 1.2, 1.5, 2, 3, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swPeakConstPToRflCoeffEOrI(v)),
    },
    {
      title: 'Reflection coefficient · |Γ|',
      values: [0, 0.2, 0.4, 0.6, 0.8, 1],
      position: (v) => v,
    },
    {
      title: 'Voltage transmission · Γ real',
      values: [0, 0.4, 0.8, 1.2, 1.6, 2],
      position: (v) => v / 2,
    },
  ];
}

export class RadiallyScaledParams {
  constructor(private readonly scaler: SmithScaler) {}

  public draw(): SmithGroup {
    const group = new SmithGroup().attr('class', 'radial-scales').attr('pointer-events', 'none');
    radialScales().forEach((scale, index) => {
      const left = index % 2 === 0 ? -1 : 0.08;
      const y = -1.22 - Math.floor(index / 2) * 0.2;
      const start = this.scaler.point([left, y]);
      const end = this.scaler.point([left + 0.92, y]);
      const axis = new SmithGroup().attr('data-scale', scale.title);
      axis.append(
        new SmithText([start[0], start[1] - 10], scale.title, {
          fontSize: '8',
          fontFamily: 'system-ui, sans-serif',
          fill: '#334155',
        }),
      );
      axis.append(new SmithLine(start, end, { stroke: '#64748b', strokeWidth: '0.6' }));
      scale.values.forEach((value, tickIndex) => {
        const position = this.scaler.point([left + scale.position(value) * 0.92, y]);
        axis.append(
          new SmithLine(position, [position[0], position[1] + 4], {
            stroke: '#64748b',
            strokeWidth: '0.6',
          }),
        );
        axis.append(
          new SmithText([position[0], position[1] + 13], value === Infinity ? '∞' : String(value), {
            fontSize: '7',
            fontFamily: 'system-ui, sans-serif',
            fill: '#334155',
            textAnchor:
              tickIndex === 0 ? 'start' : tickIndex === scale.values.length - 1 ? 'end' : 'middle',
          }),
        );
      });
      group.append(axis);
    });
    return group;
  }
}
