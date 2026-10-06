import type { Complex } from './math/Complex.js';

export interface GridStyle {
  stroke: string;
  /** Non-scaling stroke width in CSS pixels. */
  majorWidth: number;
  /** Non-scaling stroke width in CSS pixels. */
  minorWidth: number;
  textColor: string;
  textFontFamily: string;
  /** Font size in SVG chart units; labels scale with chart geometry. */
  textFontSize: number;
}
export interface CircleStyle {
  stroke: string;
  /** Non-scaling stroke width in CSS pixels. */
  strokeWidth: number;
}

/** Grid styling uses SVG user units, except non-scaling stroke widths in screen pixels. */
export interface GridLayer {
  setVisible(visible: boolean): void;
  setMinorVisible(visible: boolean): void;
  setStyle(style: Partial<GridStyle>): void;
}

export interface CircleLayer {
  setVisible(visible: boolean): void;
  setStyle(style: Partial<CircleStyle>): void;
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
