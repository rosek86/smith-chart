import { describe, expect, it } from 'vitest';
import type { Point } from '../src/math/geometry';
import type { TraceTuple } from '../src/samples';
import { TraceBuffer } from '../src/traces/TraceBuffer';

// The previous full scan is the compatibility oracle, including rounded norm ties.
function fullScan(samples: readonly TraceTuple[], point: Readonly<Point>): number {
  let closest = 0;
  let distance = Infinity;
  samples.forEach((sample, index) => {
    const next = Math.hypot(point[0] - sample[1], point[1] - sample[2]);
    if (next < distance) {
      closest = index;
      distance = next;
    }
  });
  return closest;
}

describe('nearest reflection sample', () => {
  it('keeps input order for duplicates and equal distances on either coordinate boundary', () => {
    for (const points of [
      [
        [0, 0],
        [0, -0],
        [-0, 0],
      ],
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ],
      [
        [0, -1],
        [1, 0],
        [0, 1],
      ],
      [
        [3, 4],
        [-3, -4],
        [4, 3],
      ],
    ]) {
      const samples = points.map(([re, im], i): TraceTuple => [i, re, im]);
      expect(TraceBuffer.from(samples).nearestPoint([0, 0])).toBe(0);
    }
  });

  it('preserves rounded norm ties even when a later point is mathematically nearer', () => {
    const points: TraceTuple[] = [
      [0, 1, 2 ** -27],
      [1, 1, 0],
      [2, -1, 0],
    ];
    expect(Math.hypot(points[0][1], points[0][2])).toBe(1);
    expect(TraceBuffer.from(points).nearestPoint([0, 0])).toBe(0);
  });

  it('preserves norm ordering when squared sums round in a different order', () => {
    const points: TraceTuple[] = [
      [0, 0.6996243018585157, 0.022931119662685902],
      [1, 0.6935925464238472, 0.09449539430725315],
    ];
    // A rounded squared-distance comparison picks the second sample; V8's
    // Math.hypot scan picks the first. Follow the norm semantics of the engine.
    expect(TraceBuffer.from(points).nearestPoint([0, 0])).toBe(fullScan(points, [0, 0]));
  });

  it('finds a closer diagonal point and ignores candidates inside the square but outside the circle', () => {
    const points: TraceTuple[] = [
      [0, 0, 10],
      [1, 8, 8],
      [2, 0.3, -0.4],
      [3, 0.4, 0.4],
    ];
    expect(TraceBuffer.from(points).nearestPoint([0, 0])).toBe(2);
  });

  it.each([Number.MIN_VALUE, 1e-300, 1e-155, 1, 1e155, 1e300, Number.MAX_VALUE])(
    'retains full-scan behavior at magnitude %s',
    (magnitude) => {
      const points: TraceTuple[] = [
        [0, magnitude, magnitude],
        [1, magnitude, 0],
        [2, -magnitude, 0],
        [3, 0, magnitude],
        [4, 0, -magnitude],
      ];
      for (const point of [
        [0, 0],
        [magnitude, magnitude],
        [-magnitude, -magnitude],
        [magnitude / 2, -magnitude / 2],
      ] as Point[]) {
        expect(TraceBuffer.from(points).nearestPoint(point)).toBe(fullScan(points, point));
      }
    },
  );

  it('matches the full scan across deterministic random, near-tied and extreme finite datasets', () => {
    let state = 0x51a17;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
    for (let run = 0; run < 300; run++) {
      const scale = run % 3 ? 1 : 2 ** (Math.floor(random() * 2098) - 1074);
      const points: TraceTuple[] = Array.from({ length: 200 }, (_, index) => {
        const angle = random() * Math.PI * 2;
        const radius = (run % 3 === 1 ? 1 + random() * Number.EPSILON * 4 : random()) * scale;
        return [index, radius * Math.cos(angle), radius * Math.sin(angle)];
      });
      const buffer = TraceBuffer.from(points);
      for (const point of [
        [0, 0],
        [random() * scale, random() * scale],
        [points[7][1], points[7][2]],
      ] as Point[]) {
        expect(buffer.nearestPoint(point)).toBe(fullScan(points, point));
      }
    }
  });
});
