import type { ConstCircles } from './ConstCircles.js';
import type { ConstQCircles } from './ConstQCircles.js';
import type { ConstSwrCircles } from './ConstSwrCircles.js';
import type { GridLayer, GridStyle, CircleLayer } from '../layers.js';

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
