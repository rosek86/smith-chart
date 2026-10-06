import { Complex } from './math/Complex.js';
import type { MarkerSnapshot, MarkerComparison } from './measurements.js';

export class MarkerMeasurements {
  private constructor() {}

  /** Compare B against A without a chart or browser. Frequencies must be finite and non-negative. */
  public static compare(
    a: Pick<MarkerSnapshot, 'frequencyHz' | 'impedanceOhms' | 'reflectionCoefficient'>,
    b: Pick<MarkerSnapshot, 'frequencyHz' | 'impedanceOhms' | 'reflectionCoefficient'>,
  ): MarkerComparison {
    if (
      ![a.frequencyHz, b.frequencyHz].every(
        (frequencyHz) => Number.isFinite(frequencyHz) && frequencyHz >= 0,
      )
    ) {
      throw new RangeError('Marker frequencies must be finite and non-negative.');
    }
    const isFinite = (value: Complex) => Number.isFinite(value.re) && Number.isFinite(value.im);
    const hasPhase = (gamma: Complex) => isFinite(gamma) && (gamma.re !== 0 || gamma.im !== 0);
    const phaseDelta =
      hasPhase(a.reflectionCoefficient) && hasPhase(b.reflectionCoefficient)
        ? ((b.reflectionCoefficient.arg() - a.reflectionCoefficient.arg()) * 180) / Math.PI
        : undefined;
    const impedanceDelta =
      a.impedanceOhms && b.impedanceOhms && isFinite(a.impedanceOhms) && isFinite(b.impedanceOhms)
        ? b.impedanceOhms.sub(a.impedanceOhms)
        : undefined;
    return {
      frequencyDeltaHz: b.frequencyHz - a.frequencyHz,
      impedanceDeltaOhms: impedanceDelta && isFinite(impedanceDelta) ? impedanceDelta : undefined,
      phaseDeltaDegrees: phaseDelta === undefined ? undefined : ((phaseDelta + 540) % 360) - 180,
    };
  }
}
