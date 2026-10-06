import { format } from 'd3';
import type { Complex } from './complex/Complex.js';

/** Format with three significant digits and an SI prefix; includes spacing before the unit. */
export function formatNumber(value: number): string {
  const formatted = format('.3~s')(value);
  return Number.isFinite(value) && /[a-zA-Zµ]$/.test(formatted)
    ? formatted.replace(/([a-zA-Zµ])$/, ' $1')
    : formatted + ' ';
}

/** Format Cartesian components to decimalPlaces fractional digits. */
export function formatComplex(value: Complex, unit = '', decimalPlaces = 3): string {
  return `${value.toString(decimalPlaces)} ${unit === '' ? '' : `[${unit}]`}`;
}

/** Format magnitude and phase in degrees to decimalPlaces fractional digits. */
export function formatComplexPolar(value: Complex, unit = '', decimalPlaces = 3): string {
  return `${value.abs().toFixed(decimalPlaces)} ${unit} ∠${((value.arg() * 180) / Math.PI).toFixed(decimalPlaces)}°`;
}
