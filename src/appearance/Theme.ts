import { color } from 'd3';
import type { SmithAppearance, SmithTheme } from './types.js';

/** Resolve and validate a detached theme before touching any chart state or DOM. */
export class Theme {
  private constructor() {}

  public static resolve(appearance: SmithAppearance = {}): SmithTheme {
    if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
      throw new TypeError('Appearance must be an object.');
    }
    const name = appearance.theme === undefined ? 'light' : appearance.theme;
    if (name !== 'light' && name !== 'dark') {
      throw new TypeError('Theme must be light or dark.');
    }
    const dark = name === 'dark';
    const theme: SmithTheme = {
      background: dark ? '#0f172a' : 'transparent',
      fontFamily: 'Verdana, sans-serif',
      grid: {
        stroke: dark ? '#94a3b8' : '#64748b',
        textColor: dark ? '#e2e8f0' : '#111827',
        majorWidth: 1,
        minorWidth: 0.6,
        fontSize: 7,
      },
      boundary: { stroke: dark ? '#cbd5e1' : '#334155', width: 1 },
      circles: { q: dark ? '#93c5fd' : 'blue', vswr: dark ? '#fbbf24' : 'orange', width: 1 },
      scales: {
        stroke: dark ? '#94a3b8' : '#64748b',
        boundaryColor: dark ? '#cbd5e1' : '#334155',
        textColor: dark ? '#e2e8f0' : '#334155',
        valueColor: dark ? '#fca5a5' : '#b42318',
        indicatorColor: dark ? '#f87171' : '#dc2626',
        indicatorOutline: dark ? '#0f172a' : 'white',
        fontSize: 10,
        titleFontSize: 12,
        valueFontSize: 11,
        peripheralFontSize: 10.5,
      },
      cursor: {
        pointColor: dark ? '#fca5a5' : 'red',
        impedanceColor: dark ? '#fca5a5' : 'red',
        admittanceColor: dark ? '#86efac' : 'green',
        pointSize: 5,
        lineWidth: 1,
      },
      marker: {
        outlineColor: dark ? '#e2e8f0' : 'gray',
        textColor: 'white',
        focusColor: dark ? '#93c5fd' : '#1d4ed8',
        focusHaloColor: dark ? '#0f172a' : 'white',
      },
      traceColors: dark
        ? [
            '#fb923c',
            '#4ade80',
            '#f87171',
            '#c084fc',
            '#d6a681',
            '#f472b6',
            '#cbd5e1',
            '#d4d45c',
            '#22d3ee',
            '#60a5fa',
          ]
        : [
            '#ff7f0e',
            '#2ca02c',
            '#d62728',
            '#9467bd',
            '#8c564b',
            '#e377c2',
            '#7f7f7f',
            '#bcbd22',
            '#17becf',
            '#1f77b4',
          ],
    };
    if (appearance.overrides !== undefined) {
      Theme.merge(theme as unknown as Record<string, unknown>, appearance.overrides);
    }
    return theme;
  }

  private static merge(
    target: Record<string, unknown>,
    source: unknown,
    path = 'appearance',
  ): void {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw new TypeError(`${path} overrides must be an object.`);
    }
    for (const [key, value] of Object.entries(source)) {
      if (!Object.hasOwn(target, key)) {
        throw new TypeError(`Unknown appearance setting: ${path}.${key}.`);
      }
      if (value === undefined) {
        continue;
      }
      const previous = target[key];
      if (Array.isArray(previous)) {
        if (!Array.isArray(value) || value.length === 0 || !value.every(Theme.isColor)) {
          throw new TypeError('Trace colors must be a non-empty array of solid CSS colors.');
        }
        target[key] = [...value];
      } else if (typeof previous === 'object') {
        Theme.merge(previous as Record<string, unknown>, value, `${path}.${key}`);
      } else if (typeof previous === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          throw new RangeError(`${path}.${key} must be positive and finite.`);
        }
        target[key] = value;
      } else {
        if (
          key === 'fontFamily' ? typeof value !== 'string' || !value.trim() : !Theme.isColor(value)
        ) {
          throw new TypeError(
            `${path}.${key} must be ${key === 'fontFamily' ? 'a non-empty font family' : 'a solid CSS color'}.`,
          );
        }
        target[key] = value;
      }
    }
  }

  private static isColor(value: unknown): value is string {
    return typeof value === 'string' && color(value) !== null;
  }
}
