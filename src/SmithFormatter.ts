import { format } from 'd3';
import type { Complex } from './math/Complex.js';

export class SmithFormatter {
  private constructor() {}

  /** Format with three significant digits and an SI prefix; includes spacing before the unit. */
  public static number(value: number): string {
    const formatted = format('.3~s')(value);
    return Number.isFinite(value) && /[a-zA-Zµ]$/.test(formatted)
      ? formatted.replace(/([a-zA-Zµ])$/, ' $1')
      : formatted + ' ';
  }

  /** Format Cartesian components to decimalPlaces fractional digits. */
  public static complex(value: Complex, unit = '', decimalPlaces = 3): string {
    return `${value.toString(decimalPlaces)} ${unit === '' ? '' : `[${unit}]`}`;
  }

  /** Format magnitude and phase in degrees to decimalPlaces fractional digits. */
  public static polar(value: Complex, unit = '', decimalPlaces = 3): string {
    return `${value.abs().toFixed(decimalPlaces)} ${unit} ∠${((value.arg() * 180) / Math.PI).toFixed(decimalPlaces)}°`;
  }
}
