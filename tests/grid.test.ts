import { describe, expect, it } from 'vitest';
import { GridDefinitions } from '../src/grid/GridDefinitions';
import { GridGeometry, type GridKind } from '../src/grid/GridGeometry';
import { GridLabels } from '../src/grid/GridLabels';

const kinds: GridKind[] = ['resistance', 'reactance', 'conductance', 'susceptance'];

describe('normalized grid geometry', () => {
  it.each(kinds)('%s has finite endpoints inside the unit circle and positive radii', (kind) => {
    const grid = GridDefinitions.create();
    const real = kind === 'resistance' || kind === 'conductance';
    for (const definitions of Object.values(grid[real ? 'resistance' : 'reactance'])) {
      const geometry = GridGeometry.shapes(kind, definitions);
      expect(geometry.arcs.length).toBeGreaterThan(0);
      for (const [a, b, radius] of geometry.arcs) {
        expect(radius).toBeGreaterThan(0);
        for (const p of [a, b]) {
          expect(p.every(Number.isFinite)).toBe(true);
          expect(Math.hypot(...p)).toBeLessThanOrEqual(1 + 1e-8);
        }
      }
    }
  });
  it('mirrors impedance geometry through the origin for admittance', () => {
    const grid = GridDefinitions.create();
    const z = GridGeometry.shapes('resistance', grid.resistance.major);
    const y = GridGeometry.shapes('conductance', grid.resistance.major);
    z.arcs.forEach((arc, i) => {
      for (const endpoint of [0, 1] as const) {
        for (const axis of [0, 1]) {
          expect(y.arcs[i][endpoint][axis]).toBeCloseTo(-arc[endpoint][axis], 8);
        }
      }
    });
  });
  it.each(kinds)('%s has finite labels and preserves signed reactive values', (kind) => {
    const real = kind === 'resistance' || kind === 'conductance';
    const labels = (real ? GridLabels.resistance() : GridLabels.reactance()).map((tick) =>
      GridGeometry.label(kind, tick.definition),
    );
    for (const label of labels) {
      expect([...label.point, label.rotate, label.dx, label.dy].every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...label.point)).toBeLessThanOrEqual(1 + 1e-10);
    }
    if (!real) {
      expect(labels.some((label) => label.text === '-50')).toBe(true);
      expect(labels.some((label) => label.text === '50')).toBe(true);
    }
  });
});
