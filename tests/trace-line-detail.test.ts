import { describe, expect, it } from 'vitest';
import { TraceBuffer } from '../src/traces/TraceBuffer.js';
import { TraceLineDetail } from '../src/traces/TraceLineDetail.js';

describe('trace line detail', () => {
  it.each(['spiral', 'spike', 'duplicates', 'loop'] as const)(
    'bounds deviation and preserves ordered endpoints for %s',
    (shape) => {
      const count = 4000;
      const input = new Float64Array(count * 3);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        input[i * 3] = i;
        input[i * 3 + 1] =
          shape === 'duplicates' ? 0 : shape === 'spike' ? t : Math.cos(t * 12) * t;
        input[i * 3 + 2] =
          shape === 'spike'
            ? i === 2000
              ? 1
              : 0
            : shape === 'duplicates'
              ? 0
              : Math.sin(t * 12) * t;
      }
      if (shape === 'loop') {
        input[input.length - 2] = 0;
        input[input.length - 1] = 0;
      }
      const data = TraceBuffer.from(input);
      const detail = new TraceLineDetail(data);
      expect(detail.select(0)).toBeUndefined();
      let previousCount = count;
      for (const tolerance of [0.001, 0.01, 0.1, 0.5, 1]) {
        const indices =
          detail.select(tolerance) ?? Uint32Array.from({ length: count }, (_, i) => i);
        expect(indices.length).toBeLessThanOrEqual(previousCount);
        previousCount = indices.length;
        expect(indices[0]).toBe(0);
        expect(indices.at(-1)).toBe(count - 1);
        for (let j = 1; j < indices.length; j++) {
          const a = indices[j - 1];
          const b = indices[j];
          expect(b).toBeGreaterThan(a);
          const dx = data.real(b) - data.real(a);
          const dy = data.imaginary(b) - data.imaginary(a);
          for (let i = a; i <= b; i++) {
            const x = data.real(i) - data.real(a);
            const y = data.imaginary(i) - data.imaginary(a);
            const t = Math.max(0, Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy) || 0));
            expect(Math.hypot(x - t * dx, y - t * dy)).toBeLessThanOrEqual(tolerance + 1e-12);
          }
        }
      }
    },
  );

  it('leaves short and widely separated data intact', () => {
    for (const values of [
      [[0, 0, 0]],
      [
        [0, 0, 0],
        [1, 1, 1],
      ],
      [
        [0, -1e300, 0],
        [1, 1e300, 0],
        [2, 0, 1e300],
      ],
    ] as const) {
      expect(new TraceLineDetail(TraceBuffer.from(values)).select(1)).toBeUndefined();
    }
  });
});
