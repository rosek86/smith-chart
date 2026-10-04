import { SmithConstantCircle } from '../SmithConstantCircle.js';
import type { Complex } from '../complex/Complex.js';

export interface RadialScale {
  id: string;
  title: string;
  read: (gamma: Complex) => number;
  values: number[];
  position: (value: number) => number;
}

/** Normalized positions along each scale, from zero to one. */
export function radialScales(): RadialScale[] {
  const calcs = new SmithConstantCircle();
  return [
    {
      id: 'vswr',
      read: (gamma) => calcs.rflCoeffToSwr(gamma),
      title: 'VSWR',
      values: [1, 1.5, 2, 3, 5, 10, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swrToRflCoeffEOrI(v)),
    },
    {
      id: 'vswr-db',
      read: (gamma) => calcs.rflCoeffToDBS(gamma),
      title: 'Standing-wave ratio · dB',
      values: [0, 3, 6, 10, 15, 20, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.dBSToAbsRflCoeff(v)),
    },
    {
      id: 'return-loss',
      read: (gamma) => calcs.rflCoeffToReturnLoss(gamma),
      title: 'Return loss · dB',
      values: [Infinity, 20, 14, 10, 6, 3, 0],
      position: (v) => calcs.returnLossToRflCoeffEOrI(v),
    },
    {
      id: 'mismatch-loss',
      read: (gamma) => calcs.rflCoeffToMismatchLoss(gamma),
      title: 'Mismatch loss · dB',
      values: [0, 0.1, 0.5, 1, 2, 4, Infinity],
      position: (v) => calcs.mismatchLossToRflCoeffEOrI(v),
    },
    {
      id: 'reflected-power',
      read: (gamma) => calcs.rflCoeffP(gamma),
      title: 'Reflected power · |Γ|²',
      values: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1],
      position: (v) => calcs.rflCoeffPToEOrI(v),
    },
    {
      id: 'transmitted-power',
      read: (gamma) => calcs.rflCoeffToTransmCoeffP(gamma),
      title: 'Transmitted power · 1 − |Γ|²',
      values: [1, 0.99, 0.9, 0.75, 0.5, 0.25, 0],
      position: (v) => calcs.transmCoeffPToRflCoeffEOrI(v),
    },
    {
      id: 'standing-wave-loss',
      read: (gamma) => calcs.rflCoeffToSwLossCoeff(gamma),
      title: 'Standing-wave loss coefficient',
      values: [1, 1.1, 1.5, 2, 3, 5, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swLossCoeffToRflCoeffEOrI(v)),
    },
    {
      id: 'standing-wave-peak',
      read: (gamma) => calcs.rflCoeffToSwPeakConstP(gamma),
      title: 'Standing-wave peak · constant power',
      values: [1, 1.2, 1.5, 2, 3, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swPeakConstPToRflCoeffEOrI(v)),
    },
    {
      id: 'reflection-coefficient',
      read: (gamma) => calcs.rflCoeffEOrI(gamma),
      title: 'Reflection coefficient · |Γ|',
      values: [0, 0.2, 0.4, 0.6, 0.8, 1],
      position: (v) => v,
    },
    {
      id: 'voltage-transmission',
      read: (gamma) => calcs.rflCoeffToTransmCoeffEOrI(gamma),
      title: 'Voltage transmission · |1 + Γ|',
      values: [0, 0.4, 0.8, 1.2, 1.6, 2],
      position: (v) => v / 2,
    },
  ];
}
