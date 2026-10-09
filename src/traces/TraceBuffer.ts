import type { TraceInput, TraceSample } from '../samples.js';
import type { Point } from '../math/geometry.js';
import { Complex } from '../math/Complex.js';
import { RfCalculations } from '../rf/RfCalculations.js';

/** Owned, packed f/re/im storage. Never exposes the mutable backing buffer. */
export class TraceBuffer {
  private constructor(
    private readonly values: Float64Array,
    private readonly sorted: boolean,
  ) {}

  public static from(input: TraceInput): TraceBuffer {
    const packed = input instanceof Float64Array;
    if ((!packed && !Array.isArray(input)) || !input.length || (packed && input.length % 3 !== 0)) {
      throw new RangeError(
        'A trace requires complete samples with frequency, real, and imaginary values.',
      );
    }
    const count = packed ? input.length / 3 : input.length;
    const values = new Float64Array(count * 3);
    const tuples = !packed && Array.isArray(input[0]);
    let sorted = true;
    for (let i = 0; i < count; i++) {
      let f: number;
      let re: number;
      let im: number;
      if (packed) {
        f = input[i * 3];
        re = input[i * 3 + 1];
        im = input[i * 3 + 2];
      } else {
        const sample = input[i];
        if (tuples) {
          if (!Array.isArray(sample) || sample.length !== 3) {
            throw new RangeError(`Invalid tuple at sample ${i}; expected [frequencyHz, re, im].`);
          }
          [f, re, im] = sample;
        } else {
          if (
            !sample ||
            typeof sample !== 'object' ||
            Array.isArray(sample) ||
            !('reflectionCoefficient' in sample) ||
            !Array.isArray(sample.reflectionCoefficient) ||
            sample.reflectionCoefficient.length !== 2
          ) {
            throw new RangeError(
              `Invalid object at sample ${i}; expected frequencyHz and reflectionCoefficient.`,
            );
          }
          f = sample.frequencyHz;
          [re, im] = sample.reflectionCoefficient;
        }
      }
      if (!Number.isFinite(f) || f < 0 || !Number.isFinite(re) || !Number.isFinite(im)) {
        throw new RangeError(
          `Invalid sample at index ${i}; frequency must be non-negative and all values finite.`,
        );
      }
      values[i * 3] = f;
      values[i * 3 + 1] = re;
      values[i * 3 + 2] = im;
      if (i > 0 && f < values[(i - 1) * 3]) {
        sorted = false;
      }
    }
    return new TraceBuffer(values, sorted);
  }

  public static empty(): TraceBuffer {
    return new TraceBuffer(new Float64Array(), true);
  }

  public get length(): number {
    return this.values.length / 3;
  }

  public frequency(index: number): number {
    return this.values[index * 3];
  }

  public real(index: number): number {
    return this.values[index * 3 + 1];
  }

  public imaginary(index: number): number {
    return this.values[index * 3 + 2];
  }

  public sample(index: number): TraceSample {
    return {
      frequencyHz: this.frequency(index),
      reflectionCoefficient: [this.real(index), this.imaginary(index)],
    };
  }

  public nearestFrequency(frequencyHz: number): number {
    if (this.sorted) {
      const right = this.lowerBound(frequencyHz);
      if (right === 0) {
        return 0;
      }
      const distance = frequencyHz - this.frequency(right - 1);
      if (right < this.length && this.frequency(right) - frequencyHz < distance) {
        return right;
      }
      // Find the earliest equally close sample, including floating-point rounding
      // ties between distinct frequencies far below the requested frequency.
      let low = 0;
      let high = right - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (frequencyHz - this.frequency(mid) > distance) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return low;
    }
    let closest = 0;
    let distance = Math.abs(this.frequency(0) - frequencyHz);
    for (let i = 1; i < this.length; i++) {
      const next = Math.abs(this.frequency(i) - frequencyHz);
      if (next < distance) {
        closest = i;
        distance = next;
      }
    }
    return closest;
  }

  private lowerBound(frequencyHz: number): number {
    let low = 0;
    let high = this.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.frequency(mid) < frequencyHz) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  public nearestPoint(point: Readonly<Point>): number {
    let closest = 0;
    let distance = Infinity;
    for (let i = 0; i < this.length; i++) {
      const next = Math.hypot(point[0] - this.real(i), point[1] - this.imaginary(i));
      if (next < distance) {
        closest = i;
        distance = next;
      }
    }
    return closest;
  }

  public renormalize(fromOhms: number, toOhms: number): TraceBuffer {
    RfCalculations.renormalizeSamples([], fromOhms, toOhms);
    const values = new Float64Array(this.values.length);
    for (let i = 0; i < this.length; i++) {
      const gamma = RfCalculations.renormalizeReflection(
        Complex.from(this.real(i), this.imaginary(i)),
        fromOhms,
        toOhms,
      );
      if (!gamma) {
        throw new RangeError(
          `Renormalization is singular or outside the numeric range at sample ${i}.`,
        );
      }
      values[i * 3] = this.frequency(i);
      const [re, im] = gamma.toVector();
      values[i * 3 + 1] = re;
      values[i * 3 + 2] = im;
    }
    return new TraceBuffer(values, this.sorted);
  }
}
