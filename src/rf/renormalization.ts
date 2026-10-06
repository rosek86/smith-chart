import { Complex } from '../math/Complex.js';
import type { TraceSamples } from '../samples.js';

function validateReference(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('Reference impedance must be positive and finite.');
  }
}

/**
 * Change the positive real reference impedance of a voltage reflection coefficient.
 * Preserves physical impedance, including exact open/short limits. A singular or
 * unrepresentable result is undefined; non-finite inputs throw RangeError.
 */
export function renormalizeReflection(
  gamma: Complex,
  fromOhms: number,
  toOhms: number,
): Complex | undefined {
  validateReference(fromOhms);
  validateReference(toOhms);
  if (!Number.isFinite(gamma.re) || !Number.isFinite(gamma.im)) {
    throw new RangeError('Reflection coefficient components must be finite.');
  }
  if (fromOhms === toOhms || (gamma.im === 0 && Math.abs(gamma.re) === 1)) {
    return gamma;
  }
  // Γnew = (Γold + k) / (1 + k Γold). Scale references before summing.
  const referenceScale = Math.max(fromOhms, toOhms);
  const from = fromOhms / referenceScale;
  const to = toOhms / referenceScale;
  const k = (fromOhms - toOhms) / referenceScale / (from + to);
  const scale = Math.max(1, Math.abs(gamma.re), Math.abs(gamma.im));
  const x = gamma.re / scale;
  const y = gamma.im / scale;
  const inverseScale = 1 / scale;
  const nr = x + k * inverseScale;
  const dr = inverseScale + k * x;
  const di = k * y;
  const denominatorScale = Math.max(Math.abs(dr), Math.abs(di));
  if (denominatorScale === 0) {
    return;
  }
  const real = dr / denominatorScale;
  const imaginary = di / denominatorScale;
  const denominator = real ** 2 + imaginary ** 2;
  const re = ((nr / denominatorScale) * real + (y / denominatorScale) * imaginary) / denominator;
  // Analytic imaginary numerator avoids cancellation for very large finite Γ.
  const im =
    (((1 - k) * (1 + k) * (y / denominatorScale)) / denominator) *
    (inverseScale / denominatorScale);
  return Number.isFinite(re) && Number.isFinite(im) ? Complex.from(re, im) : undefined;
}

/** Copy and renormalize every sample; reject invalid/singular data without modifying the input. */
export function renormalizeSamples(
  samples: TraceSamples,
  fromOhms: number,
  toOhms: number,
): TraceSamples {
  validateReference(fromOhms);
  validateReference(toOhms);
  return samples.map((sample, index) => {
    if (
      !Number.isFinite(sample.frequencyHz) ||
      sample.frequencyHz < 0 ||
      sample.reflectionCoefficient.length !== 2
    ) {
      throw new RangeError(`Invalid sample at index ${index}.`);
    }
    const gamma = renormalizeReflection(
      Complex.from(...sample.reflectionCoefficient),
      fromOhms,
      toOhms,
    );
    if (!gamma) {
      throw new RangeError(
        `Renormalization is singular or outside the numeric range at sample ${index}.`,
      );
    }
    return { frequencyHz: sample.frequencyHz, reflectionCoefficient: gamma.toVector() };
  });
}
