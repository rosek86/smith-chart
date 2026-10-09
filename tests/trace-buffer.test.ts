import { describe, expect, it } from 'vitest';
import { TraceBuffer } from '../src/traces/TraceBuffer';
import { TraceModel } from '../src/traces/TraceModel';
import type { TraceInput } from '../src/samples';

const objects = [
  { frequencyHz: 10, reflectionCoefficient: [0.1, -0.2] as const },
  { frequencyHz: 20, reflectionCoefficient: [0.3, 0.4] as const },
];
const tuples = [
  [10, 0.1, -0.2],
  [20, 0.3, 0.4],
] as const;
const packed = new Float64Array(tuples.flat());

describe('packed trace storage', () => {
  it.each([objects, tuples, packed].map((input) => ({ input })))(
    'reads equivalent input without exposing stored samples: $input',
    ({ input }) => {
      const buffer = TraceBuffer.from(input);
      expect(buffer.length).toBe(2);
      expect(buffer.sample(0)).toEqual(objects[0]);
      expect(buffer.sample(1)).toEqual(objects[1]);
      const sample = buffer.sample(0);
      (sample.reflectionCoefficient as unknown as number[])[0] = 99;
      expect(buffer.sample(0)).toEqual(objects[0]);
    },
  );

  it('copies only a typed array view and isolates later writes in both directions', () => {
    const source = new Float64Array([999, ...packed, 888]);
    const model = new TraceModel(source.subarray(1, 7));
    source.fill(0);
    expect(model.Samples.sample(1)).toEqual(objects[1]);
    const update = new Float64Array([30, -0.5, 0.2]);
    const marker = model.addMarker(1);
    model.update(update, 'sample-index');
    update.fill(0);
    expect(model.Samples.sample(marker.sampleIndex)).toEqual({
      frequencyHz: 30,
      reflectionCoefficient: [-0.5, 0.2],
    });
  });

  it.each(
    [
      [],
      new Float64Array(),
      new Float64Array([1, 2]),
      new Float64Array([1, 2, 3, 4]),
      [[1, 2]],
      [[1, 2, 3, 4]],
      [[1, 2, NaN]],
      [[-1, 0, 0]],
      [[Infinity, 0, 0]],
      [tuples[0], objects[1]],
      [objects[0], tuples[1]],
      [null],
      [5],
      new Array(2),
      [{ frequencyHz: 1, reflectionCoefficient: [0] }],
      new Float64Array([1, Infinity, 0]),
    ].map((input) => ({ input })),
  )('rejects malformed data atomically: $input', ({ input }) => {
    const model = new TraceModel(packed);
    const marker = model.addMarker(1);
    const previous = model.Samples;
    expect(() => model.update(input as TraceInput, 'frequency')).toThrow(RangeError);
    expect(model.Samples).toBe(previous);
    expect(marker.sampleIndex).toBe(1);
  });

  it.each([
    [0, 0],
    [10, 0],
    [15, 0],
    [20, 2],
    [25, 2],
    [30, 4],
    [100, 4],
  ])('keeps the first input sample for sorted frequency ties at %s', (frequency, expected) => {
    const buffer = TraceBuffer.from([
      [10, 0, 0],
      [10, 1, 0],
      [20, 0, 1],
      [20, 1, 1],
      [30, 0, -1],
    ]);
    expect(buffer.nearestFrequency(frequency)).toBe(expected);
  });

  it('keeps first-sample frequency ties caused by floating-point rounding', () => {
    const buffer = TraceBuffer.from([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ]);
    expect(buffer.nearestFrequency(1e300)).toBe(0);
  });

  it('supports descending and unsorted frequencies without reordering samples', () => {
    for (const frequencies of [
      [30, 20, 20, 10],
      [20, 10, 30, 20],
    ]) {
      const buffer = TraceBuffer.from(frequencies.map((f) => [f, 0, 0] as const));
      for (const target of [0, 10, 15, 20, 25, 30, 40]) {
        const distances = frequencies.map((f) => Math.abs(f - target));
        expect(buffer.nearestFrequency(target)).toBe(distances.indexOf(Math.min(...distances)));
      }
    }
  });

  it('selects exact samples and keeps first reflection ties, including extreme finite values', () => {
    for (const magnitude of [Number.MIN_VALUE, 0.5, 1e300]) {
      const buffer = TraceBuffer.from([
        [1, magnitude, 0],
        [2, -magnitude, 0],
        [3, 0, magnitude],
      ]);
      expect(buffer.nearestPoint([0, 0])).toBe(0);
      expect(buffer.nearestPoint([-magnitude, 0])).toBe(1);
      expect(buffer.nearestPoint([0, magnitude])).toBe(2);
    }
  });

  it('retains selection semantics across all formats', () => {
    const model = new TraceModel(objects);
    const marker = model.addMarker(1);
    model.update(
      [
        [21, -0.5, 0],
        [11, 0.29, 0.4],
      ],
      'frequency',
    );
    expect(marker.sampleIndex).toBe(0);
    model.update(new Float64Array([11, 0.1, 0.1, 21, -0.5, 0]), 'reflection');
    expect(marker.sampleIndex).toBe(1);
    model.update(objects, 'sample-index');
    expect(marker.sampleIndex).toBe(1);
    expect(model.Samples.sample(1)).toEqual(objects[1]);
  });

  it('renormalizes into independent packed storage and rejects singular results', () => {
    const buffer = TraceBuffer.from(new Float64Array([10, 0, 0, 20, 0.5, 0]));
    const converted = buffer.renormalize(50, 75);
    expect(converted.frequency(1)).toBe(20);
    expect(converted.real(0)).toBeCloseTo(-0.2);
    expect(converted.real(1)).toBeCloseTo(1 / 3);
    expect(buffer.real(0)).toBe(0);
    expect(() => TraceBuffer.from([[1, 5, 0]]).renormalize(50, 75)).toThrow(RangeError);
  });
});
