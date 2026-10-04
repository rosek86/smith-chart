/** One S11 sample. The reflection coefficient is [real, imaginary]. */
export interface TraceSample {
  frequencyHz: number;
  reflectionCoefficient: [number, number];
}

export type TraceSamples = readonly TraceSample[];
