import type { ConstCircles } from './draw/ConstCircles.js';
import type { ConstQCircles } from './draw/ConstQCircles.js';
import type { ConstSwrCircles } from './draw/ConstSwrCircles.js';
import type { Complex } from './complex/Complex.js';

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

/** Keep renderer instances out of the public chart API. */
export function gridLayer(layer: ConstCircles, assertAlive: () => void): GridLayer {
  return {
    setVisible(visible) {
      assertAlive();
      layer.visibility(visible);
    },
    setMinorVisible(visible) {
      assertAlive();
      layer.displayMinor(visible);
    },
    setStyle(style) {
      assertAlive();
      validateLengths(style, ['majorWidth', 'minorWidth', 'textFontSize']);
      const properties = {
        stroke: 'Stroke',
        majorWidth: 'MajorWidth',
        minorWidth: 'MinorWidth',
        textColor: 'TextColor',
        textFontFamily: 'TextFontFamily',
        textFontSize: 'TextFontSize',
      } as const;
      for (const key of Object.keys(properties) as (keyof GridStyle)[]) {
        const value = style[key];
        if (value !== undefined) {
          layer[properties[key]] = String(value);
        }
      }
    },
  };
}

export function circleLayer(
  layer: ConstQCircles | ConstSwrCircles,
  minimum: number,
  assertAlive: () => void,
): CircleLayer {
  const validate = (value: number) => {
    if (!Number.isFinite(value) || value < minimum || value <= 0) {
      throw new RangeError(`Circle value must be finite, positive, and at least ${minimum}.`);
    }
  };
  return {
    setVisible(visible) {
      assertAlive();
      layer.visibility(visible);
    },
    setStyle(style) {
      assertAlive();
      validateLengths(style, ['strokeWidth']);
      if (style.stroke !== undefined) {
        layer.Stroke = style.stroke;
      }
      if (style.strokeWidth !== undefined) {
        layer.StrokeWidth = String(style.strokeWidth);
      }
    },
    addValue(value) {
      assertAlive();
      validate(value);
      layer.append(value);
    },
    removeValue(value) {
      assertAlive();
      validate(value);
      layer.remove(value);
    },
  };
}

function validateLengths<T>(style: T, keys: readonly (keyof T)[]): void {
  for (const key of keys) {
    const value = style[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    ) {
      throw new RangeError(`${String(key)} must be a positive finite number.`);
    }
  }
}
