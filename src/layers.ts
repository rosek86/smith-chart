import type { ConstCircles, ConstCirclesDrawOptions } from './draw/ConstCircles.js';
import type { ConstQCircles } from './draw/ConstQCircles.js';
import type { ConstSwrCircles } from './draw/ConstSwrCircles.js';
import type { Complex } from './complex/Complex.js';

export type GridStyle = ConstCirclesDrawOptions;
export interface CircleStyle {
  stroke: string;
  strokeWidth: string;
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
          layer[properties[key]] = value;
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
      if (style.stroke !== undefined) {
        layer.Stroke = style.stroke;
      }
      if (style.strokeWidth !== undefined) {
        layer.StrokeWidth = style.strokeWidth;
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
