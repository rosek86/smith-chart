import type { Complex } from './math/Complex.js';

export interface GridStyle {
  stroke: string;
  /** Non-scaling stroke width in CSS pixels. */
  majorWidth: number;
  /** Non-scaling stroke width in CSS pixels. */
  minorWidth: number;
  textColor: string;
  textFontFamily: string;
  /** Base font size in chart units; adaptive layout enforces a 9 CSS px minimum in the default view. */
  textFontSize: number;
}
export interface CircleStyle {
  stroke: string;
  /** Non-scaling stroke width in CSS pixels. */
  strokeWidth: number;
}

export type GridDetail = 'basic' | 'standard' | 'detailed';

/** Grid styling uses SVG user units, except non-scaling stroke widths in screen pixels. */
export interface GridLayer {
  setVisible(visible: boolean): void;
  /** Show or hide labels independently of grid lines. Default: true. */
  setLabelsVisible(visible: boolean): void;
  /** Default: detailed. Basic shows only the principal normalized values. */
  setDetail(detail: GridDetail): void;
  setStyle(style: Partial<GridStyle>): void;
}

export interface CircleLayer {
  setVisible(visible: boolean): void;
  setStyle(style: Partial<CircleStyle>): void;
  /** Replace the complete set after validation; duplicates are ignored and empty clears it. */
  setValues(values: readonly number[]): void;
  addValue(value: number): void;
  removeValue(value: number): void;
}

export interface ChartLayers {
  readonly resistance: GridLayer;
  readonly reactance: GridLayer;
  readonly conductance: GridLayer;
  readonly susceptance: GridLayer;
  readonly q: CircleLayer;
  readonly vswr: CircleLayer;
}

export interface PeripheralScales {
  setVisible(visible: boolean): void;
  /** Pass null to clear the indicators. */
  update(reflectionCoefficient: Complex | null): void;
}
