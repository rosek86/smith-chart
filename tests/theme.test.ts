import { describe, expect, it } from 'vitest';
import { Theme } from '../src/appearance/Theme';
import type { SmithAppearance } from '../src';

describe('appearance resolution', () => {
  it('merges partial overrides without mutating the input or sharing presets', () => {
    const colors = ['#123456', 'red'];
    const appearance: SmithAppearance = {
      theme: 'dark',
      overrides: { traceColors: colors, grid: { majorWidth: 2 }, fontFamily: 'Arial' },
    };
    const theme = Theme.resolve(appearance);
    expect(theme.background).toBe('#0f172a');
    expect(theme.grid.majorWidth).toBe(2);
    expect(theme.grid.minorWidth).toBe(0.6);
    expect(theme.fontFamily).toBe('Arial');
    colors[0] = 'blue';
    theme.grid.stroke = 'pink';
    expect(theme.traceColors[0]).toBe('#123456');
    expect(Theme.resolve({ theme: 'dark' }).grid.stroke).toBe('#94a3b8');
    expect(appearance.overrides!.grid).toEqual({ majorWidth: 2 });
    expect(Theme.resolve().background).toBe('transparent');
  });

  it.each([
    null,
    { theme: 'unknown' },
    { theme: null },
    { overrides: null },
    { overrides: { grid: null } },
    { overrides: { grid: { majorWidth: 0 } } },
    { overrides: { scales: { fontSize: NaN } } },
    { overrides: { cursor: { lineWidth: Infinity } } },
    { overrides: { marker: { textColor: 'url(https://example.com)' } } },
    { overrides: { background: 'var(--external)' } },
    { overrides: { traceColors: [] } },
    { overrides: { traceColors: ['red', 'invalid'] } },
    { overrides: { fontFamily: '' } },
    { overrides: { grid: { missing: 'red' } } },
  ])('rejects invalid configuration: %j', (appearance) => {
    expect(() => Theme.resolve(appearance as unknown as SmithAppearance)).toThrow();
  });
});
