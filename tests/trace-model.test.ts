import { describe, expect, it } from 'vitest';
import { TraceModel } from '../src/traces/TraceModel';
import type { TraceSamples } from '../src/samples';

const samples: TraceSamples = [
  { frequencyHz: 30, reflectionCoefficient: [0.8, 0] },
  { frequencyHz: 10, reflectionCoefficient: [-0.8, 0] },
  { frequencyHz: 20, reflectionCoefficient: [0, 0.8] },
];

describe('trace sample and marker state', () => {
  it('copies input samples and their coordinates on construction and update', () => {
    const input = [{ frequencyHz: 10, reflectionCoefficient: [0.1, 0.2] as [number, number] }];
    const model = new TraceModel(input);
    input[0].frequencyHz = 20;
    input[0].reflectionCoefficient[0] = 0.3;
    expect(model.Samples).toEqual([{ frequencyHz: 10, reflectionCoefficient: [0.1, 0.2] }]);
    model.update(input, 'frequency');
    input[0].reflectionCoefficient[1] = 0.5;
    input.push({ frequencyHz: 30, reflectionCoefficient: [0, 0] });
    expect(model.Samples).toEqual([{ frequencyHz: 20, reflectionCoefficient: [0.3, 0.2] }]);
  });

  it.each<{ input: TraceSamples }>([
    { input: [] },
    { input: [{ frequencyHz: -1, reflectionCoefficient: [0, 0] }] },
    { input: [{ frequencyHz: Infinity, reflectionCoefficient: [0, 0] }] },
    { input: [{ frequencyHz: 1, reflectionCoefficient: [NaN, 0] }] },
  ])('rejects invalid input without changing existing selections: $input', ({ input }) => {
    const model = new TraceModel(samples);
    const marker = model.addMarker(1);
    const before = model.Samples;
    expect(() => model.update(input, 'frequency')).toThrow(RangeError);
    expect(model.Samples).toBe(before);
    expect(marker.selectedPoint).toBe(before[1]);
    expect(() => new TraceModel(input)).toThrow(RangeError);
  });

  it('uses the first sample for frequency and reflection ties, regardless of sorting', () => {
    const model = new TraceModel(samples);
    const marker = model.addMarker(2);
    model.setMarkerFrequency(0, 25);
    expect(model.markerSampleIndex(0)).toBe(0);
    expect(model.selectNearestPoint(marker, [0, 0])).toBe(false);
    expect(model.selectNearestPoint(marker, [-0.75, 0])).toBe(true);
    expect(model.markerSampleIndex(0)).toBe(1);
  });

  const replacement: TraceSamples = [
    { frequencyHz: 21, reflectionCoefficient: [-0.75, 0] },
    { frequencyHz: 11, reflectionCoefficient: [0.7, 0] },
  ];
  it.each([
    ['frequency', 1],
    ['reflection', 0],
    ['sample-index', 1],
  ] as const)('preserves selection by %s and retains marker identity', (strategy, expected) => {
    const model = new TraceModel(samples);
    const marker = model.addMarker(1);
    model.update(replacement, strategy);
    expect(model.getMarker(0)).toBe(marker);
    expect(model.markerSampleIndex(0)).toBe(expected);
    expect(marker.selectedPoint).toBe(model.Samples[expected]);
  });

  it('clamps sample selection when a replacement trace is shorter', () => {
    const model = new TraceModel(samples);
    model.addMarker(2);
    model.update(replacement, 'sample-index');
    expect(model.markerSampleIndex(0)).toBe(1);
  });

  it('retains surviving marker identities and never reuses their display numbers', () => {
    const model = new TraceModel(samples);
    const first = model.addMarker(0);
    const second = model.addMarker(1);
    expect(model.removeMarker(0)).toBe(first);
    expect(model.markerIndex(second)).toBe(0);
    expect(model.markerIndex(first)).toBe(-1);
    expect(model.selectNearestPoint(first, [0, 0])).toBe(false);
    expect(model.addMarker(2).number).toBe(3);
    expect(model.Markers.map((entry) => entry.number)).toEqual([2, 3]);
    model.clear();
    expect(model.Samples).toEqual([]);
    expect(model.Markers).toEqual([]);
  });

  it('rejects invalid selections without changing the marker or consuming its number', () => {
    const model = new TraceModel(samples);
    for (const index of [-1, 0.5, 3, NaN]) {
      expect(() => model.addMarker(index)).toThrow(RangeError);
    }
    const marker = model.addMarker(0);
    expect(marker.number).toBe(1);
    expect(() => model.setMarkerSample(0, 3)).toThrow(RangeError);
    expect(() => model.setMarkerFrequency(0, -1)).toThrow(RangeError);
    expect(model.markerSampleIndex(0)).toBe(0);
    expect(model.setMarkerSample(5, 3)).toBeUndefined();
    expect(model.setMarkerFrequency(5, NaN)).toBeUndefined();
  });
});
