import { Theme } from './appearance/Theme.js';
import type { SmithOptions } from './options.js';
import type { CircleStyle, GridDetail, GridStyle } from './layers.js';

/** Shared validation for initial configuration, patches, and individual controls. */
export class OptionsValidation {
  private constructor() {}

  public static object(value: unknown, name: string, keys?: readonly string[]): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`${name} must be an object.`);
    }
    if (keys) {
      for (const key of Object.keys(value)) {
        if (!keys.includes(key)) {
          throw new TypeError(`Unknown ${name} option: ${key}.`);
        }
      }
    }
  }

  public static boolean(value: boolean, name: string): void {
    if (typeof value !== 'boolean') {
      throw new TypeError(`${name} must be a boolean.`);
    }
  }

  public static detail(value: GridDetail): void {
    if (!['basic', 'standard', 'detailed'].includes(value)) {
      throw new RangeError('Grid detail must be basic, standard, or detailed.');
    }
  }

  private static lengths<T>(style: T, keys: readonly (keyof T)[]): void {
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

  private static strings<T>(style: T, keys: readonly (keyof T)[]): void {
    for (const key of keys) {
      if (style[key] !== undefined && typeof style[key] !== 'string') {
        throw new TypeError(`${String(key)} must be a CSS string.`);
      }
    }
  }

  public static gridStyle(style: Partial<GridStyle>): void {
    OptionsValidation.object(style, 'Grid style', [
      'stroke',
      'majorWidth',
      'minorWidth',
      'textColor',
      'textFontFamily',
      'textFontSize',
    ]);
    OptionsValidation.lengths(style, ['majorWidth', 'minorWidth', 'textFontSize']);
    OptionsValidation.strings(style, ['stroke', 'textColor', 'textFontFamily']);
  }

  public static circleStyle(style: Partial<CircleStyle>): void {
    OptionsValidation.object(style, 'Circle style', ['stroke', 'strokeWidth']);
    OptionsValidation.lengths(style, ['strokeWidth']);
    OptionsValidation.strings(style, ['stroke']);
  }

  public static circleValue(value: number, minimum: number): void {
    if (!Number.isFinite(value) || value < minimum || value <= 0) {
      throw new RangeError(`Circle value must be finite, positive, and at least ${minimum}.`);
    }
  }

  public static circleValues(values: readonly number[], minimum: number): void {
    if (!Array.isArray(values)) {
      throw new TypeError('Circle values must be an array.');
    }
    for (const value of values) {
      OptionsValidation.circleValue(value, minimum);
    }
  }

  public static chart(options: SmithOptions): void {
    OptionsValidation.object(options, 'Smith options', [
      'referenceImpedanceOhms',
      'appearance',
      'interaction',
      'grid',
      'circles',
      'peripheralScales',
    ]);
    if (
      options.referenceImpedanceOhms !== undefined &&
      (!Number.isFinite(options.referenceImpedanceOhms) || options.referenceImpedanceOhms <= 0)
    ) {
      throw new RangeError('Reference impedance must be positive and finite.');
    }
    if (options.appearance !== undefined) {
      Theme.resolve(options.appearance);
    }
    if (options.interaction !== undefined) {
      OptionsValidation.object(options.interaction, 'Interaction', ['zoom', 'cursor']);
      for (const name of ['zoom', 'cursor'] as const) {
        const value = options.interaction[name];
        if (value !== undefined) {
          OptionsValidation.boolean(value, name);
        }
      }
    }
    if (options.peripheralScales !== undefined) {
      OptionsValidation.object(options.peripheralScales, 'Peripheral scales', ['visible']);
      if (options.peripheralScales.visible !== undefined) {
        OptionsValidation.boolean(options.peripheralScales.visible, 'Peripheral scale visibility');
      }
    }
    if (options.grid !== undefined) {
      OptionsValidation.object(options.grid, 'Grid', [
        'detail',
        'labelsVisible',
        'style',
        'layers',
      ]);
      if (options.grid.layers !== undefined) {
        OptionsValidation.object(options.grid.layers, 'Grid layers', [
          'resistance',
          'reactance',
          'conductance',
          'susceptance',
        ]);
      }
      for (const name of ['resistance', 'reactance', 'conductance', 'susceptance'] as const) {
        const layer = options.grid.layers?.[name];
        if (layer !== undefined) {
          OptionsValidation.object(layer, 'Grid layer', [
            'detail',
            'labelsVisible',
            'style',
            'visible',
          ]);
          if (layer.visible !== undefined) {
            OptionsValidation.boolean(layer.visible, 'Grid visibility');
          }
        }
      }
      for (const grid of [options.grid, ...Object.values(options.grid.layers ?? {})]) {
        if (grid === undefined) {
          continue;
        }
        if (grid.detail !== undefined) {
          OptionsValidation.detail(grid.detail);
        }
        if (grid.labelsVisible !== undefined) {
          OptionsValidation.boolean(grid.labelsVisible, 'Grid labels visibility');
        }
        if (grid.style !== undefined) {
          OptionsValidation.gridStyle(grid.style);
        }
      }
    }
    if (options.circles !== undefined) {
      OptionsValidation.object(options.circles, 'Circles', ['q', 'vswr']);
      for (const name of ['q', 'vswr'] as const) {
        const circle = options.circles[name];
        if (circle === undefined) {
          continue;
        }
        OptionsValidation.object(circle, 'Circle', ['visible', 'values', 'style']);
        if (circle.visible !== undefined) {
          OptionsValidation.boolean(circle.visible, 'Circle visibility');
        }
        if (circle.style !== undefined) {
          OptionsValidation.circleStyle(circle.style);
        }
        if (circle.values !== undefined) {
          OptionsValidation.circleValues(circle.values, name === 'vswr' ? 1 : 0);
        }
      }
    }
  }
}
