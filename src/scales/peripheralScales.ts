import type { Complex } from '../complex/Complex.js';

export interface PeripheralScale {
  id: string;
  title: string;
  unit: '°' | 'λ';
  ticks: number[];
  major: (value: number) => boolean;
  angle: (value: number) => number;
  read: (gamma: Complex) => number | null;
}

function phase(gamma: Pick<Complex, 're' | 'im'>): number | null {
  return gamma.re === 0 && gamma.im === 0 ? null : (Math.atan2(gamma.im, gamma.re) * 180) / Math.PI;
}

/** A full reflection-coefficient rotation represents half a wavelength along the line. */
export function peripheralScales(): PeripheralScale[] {
  const wavelengths = (gamma: Complex, direction: number): number | null => {
    const degrees = phase(gamma);
    return degrees === null ? null : (0.25 + (direction * degrees) / 720 + 0.5) % 0.5;
  };
  return [
    {
      id: 'transmission-phase',
      title: 'Transmission phase · °',
      unit: '°',
      ticks: Array.from({ length: 35 }, (_, i) => -85 + i * 5),
      major: (v) => v % 15 === 0,
      // Project from Γ = −1 to the perimeter, not from the chart center.
      angle: (v) => 2 * v,
      read: (gamma) => phase({ re: 1 + gamma.re, im: gamma.im }),
    },
    {
      id: 'reflection-phase',
      title: 'Reflection phase · °',
      unit: '°',
      ticks: Array.from({ length: 36 }, (_, i) => -170 + i * 10),
      major: (v) => v % 30 === 0,
      angle: (v) => v,
      read: phase,
    },
    {
      id: 'wavelengths-generator',
      title: 'Wavelengths → generator',
      unit: 'λ',
      ticks: Array.from({ length: 50 }, (_, i) => i / 100),
      major: (v) => Math.round(v * 100) % 5 === 0,
      angle: (v) => 180 - 720 * v,
      read: (gamma) => wavelengths(gamma, -1),
    },
    {
      id: 'wavelengths-load',
      title: 'Wavelengths → load',
      unit: 'λ',
      ticks: Array.from({ length: 50 }, (_, i) => i / 100),
      major: (v) => Math.round(v * 100) % 5 === 0,
      angle: (v) => 720 * v - 180,
      read: (gamma) => wavelengths(gamma, 1),
    },
  ];
}
