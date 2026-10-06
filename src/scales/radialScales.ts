import { SmithConstantCircle } from '../rf/SmithConstantCircle.js';
import type { Complex } from '../math/Complex.js';

export interface RadialScale {
  id: string;
  title: string;
  description?: string;
  unit: 'dB' | 'ratio';
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
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffToSwr(gamma),
      title: 'VSWR',
      values: [1, 1.5, 2, 3, 5, 10, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swrToRflCoeffEOrI(v)),
    },
    {
      id: 'vswr-db',
      unit: 'dB',
      read: (gamma) => calcs.rflCoeffToDBS(gamma),
      title: 'Standing-wave ratio · dB',
      values: [0, 3, 6, 10, 15, 20, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.dBSToAbsRflCoeff(v)),
    },
    {
      id: 'return-loss',
      unit: 'dB',
      read: (gamma) => calcs.rflCoeffToReturnLoss(gamma),
      title: 'Return loss · dB',
      values: [Infinity, 20, 14, 10, 6, 3, 0],
      position: (v) => calcs.returnLossToRflCoeffEOrI(v),
    },
    {
      id: 'mismatch-loss',
      unit: 'dB',
      read: (gamma) => calcs.rflCoeffToMismatchLoss(gamma),
      title: 'Reflection loss · dB',
      description: 'Reflection loss (mismatch loss): −10 log10(1 − |Γ|²), in dB.',
      values: [0, 0.1, 0.5, 1, 2, 4, Infinity],
      position: (v) => calcs.mismatchLossToRflCoeffEOrI(v),
    },
    {
      id: 'reflected-power',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffP(gamma),
      title: 'Power reflection coefficient',
      description: 'Reflected power divided by incident power: |Γ|² (dimensionless).',
      values: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1],
      position: (v) => calcs.rflCoeffPToEOrI(v),
    },
    {
      id: 'transmitted-power',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffToTransmCoeffP(gamma),
      title: 'Power transmission coefficient',
      description:
        'Net power delivered to the load divided by incident power: 1 − |Γ|² (dimensionless).',
      values: [1, 0.99, 0.9, 0.75, 0.5, 0.25, 0],
      position: (v) => calcs.transmCoeffPToRflCoeffEOrI(v),
    },
    {
      id: 'standing-wave-loss',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffToSwLossCoeff(gamma),
      title: 'Standing-wave loss coefficient',
      values: [1, 1.1, 1.5, 2, 3, 5, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swLossCoeffToRflCoeffEOrI(v)),
    },
    {
      id: 'standing-wave-peak',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffToSwPeakConstP(gamma),
      title: 'Standing-wave peak · constant power',
      values: [1, 1.2, 1.5, 2, 3, Infinity],
      position: (v) => (v === Infinity ? 1 : calcs.swPeakConstPToRflCoeffEOrI(v)),
    },
    {
      id: 'reflection-coefficient',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffEOrI(gamma),
      title: 'Reflection coefficient · |Γ|',
      values: [0, 0.2, 0.4, 0.6, 0.8, 1],
      position: (v) => v,
    },
    {
      id: 'attenuation',
      unit: 'dB',
      read: (gamma) => calcs.rflCoeffToAttenuation(gamma),
      title: 'Attenuation · dB',
      description:
        'One-way attenuation of a matched line or attenuator terminated in an open or short circuit. Not insertion loss of an arbitrary load.',
      values: [Infinity, 10, 7, 5, 3, 1, 0],
      position: (v) => calcs.attenuationToRflCoeff(v),
    },
    {
      id: 'voltage-transmission',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffToTransmCoeffEOrI(gamma),
      title: 'Voltage transmission coefficient',
      description: 'Voltage transmission magnitude: |1 + Γ| (dimensionless).',
      values: [0, 0.4, 0.8, 1.2, 1.6, 2],
      position: (v) => v / 2,
    },
    {
      id: 'current-transmission',
      unit: 'ratio',
      read: (gamma) => calcs.rflCoeffToCurrentTransmission(gamma),
      title: 'Current transmission coefficient',
      description:
        'Current transmission magnitude: |1 − Γ|, using the voltage reflection coefficient Γ (dimensionless).',
      values: [0, 0.4, 0.8, 1.2, 1.6, 2],
      position: (v) => v / 2,
    },
  ];
}
