import { TraceBuffer } from './TraceBuffer.js';

interface LineLevel {
  error: number;
  indices: Uint32Array;
}

/** Nested radial-distance levels with a conservative accumulated error in Γ units. */
export class TraceLineDetail {
  private readonly levels: LineLevel[] = [];

  public constructor(data: TraceBuffer) {
    if (data.length < 3) {
      return;
    }
    // Reuse one scratch buffer; retained levels must shrink by at least 20%.
    // This bounds cached index storage by a geometric series instead of levels × samples.
    const scratch = new Uint32Array(data.length);
    let previous: Uint32Array | undefined;
    let previousError = 0;
    for (let exponent = -20; exponent <= 0; exponent++) {
      const error = 2 ** exponent;
      const allowance = error - previousError;
      const squared = allowance * allowance;
      const length = previous?.length ?? data.length;
      let count = 1;
      let last = 0;
      scratch[0] = 0;
      for (let position = 1; position < length - 1; position++) {
        const index = previous ? previous[position] : position;
        const dx = data.real(index) - data.real(last);
        const dy = data.imaginary(index) - data.imaginary(last);
        if (dx * dx + dy * dy > squared) {
          scratch[count++] = index;
          last = index;
        }
      }
      scratch[count++] = data.length - 1;
      if (count <= length * 0.8) {
        previous = scratch.slice(0, count);
        previousError = error;
        this.levels.push({ error, indices: previous });
      }
      if (count === 2) {
        break;
      }
    }
  }

  /** Undefined means use every sample. No data scan or allocation during view selection. */
  public select(tolerance: number): Uint32Array | undefined {
    let indices: Uint32Array | undefined;
    for (const level of this.levels) {
      if (level.error > tolerance) {
        break;
      }
      indices = level.indices;
    }
    return indices;
  }
}
