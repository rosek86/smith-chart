/** One reflection sample. The reflection coefficient is [real, imaginary]. */
export interface TraceSample {
  readonly frequencyHz: number;
  readonly reflectionCoefficient: readonly [number, number];
}

export type TraceSamples = readonly TraceSample[];

/** One reflection sample: frequency in Hz, followed by the real and imaginary parts of Γ. */
export type TraceTuple = readonly [frequencyHz: number, re: number, im: number];

/** Homogeneous object samples, tuples, or packed f/re/im triples. Inputs are copied. */
export type TraceInput = TraceSamples | readonly TraceTuple[] | Float64Array;
