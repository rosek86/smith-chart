/** One S11 sample. The reflection coefficient is [real, imaginary]. */
export interface TraceSample {
  readonly frequencyHz: number;
  readonly reflectionCoefficient: readonly [number, number];
}

export type TraceSamples = readonly TraceSample[];
