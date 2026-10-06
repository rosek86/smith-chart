import type { TraceSamples } from '../samples.js';
import { Complex } from '../math/Complex.js';
import { SmithConstantCircle } from './SmithConstantCircle.js';

/** Physical quantities derived from a voltage reflection coefficient Γ. */
export interface SmithReading {
  readonly reflectionCoefficient: Complex;
  readonly impedanceOhms: Complex | undefined;
  readonly admittanceSiemens: Complex | undefined;
  readonly phaseDegrees: number | undefined;
  readonly vswr: number | undefined;
  readonly standingWaveRatioDb: number | undefined;
  readonly returnLossDb: number;
  readonly reflectionLossDb: number | undefined;
  readonly attenuationDb: number | undefined;
  readonly q: number | undefined;
  readonly powerReflectionCoefficient: number;
  readonly voltageReflectionCoefficientMagnitude: number;
  readonly powerTransmissionCoefficient: number | undefined;
  readonly voltageTransmissionCoefficientMagnitude: number;
  readonly currentTransmissionCoefficientMagnitude: number;
  readonly standingWavePeak: number | undefined;
  readonly standingWaveLossCoefficient: number | undefined;
}

/** An ideal series component equivalent to a reactance at one frequency. */
export type ReactiveComponent =
  | { readonly kind: 'inductor'; readonly inductanceHenries: number }
  | { readonly kind: 'capacitor'; readonly capacitanceFarads: number };

export class RfCalculations {
  private constructor() {}

  private static readonly calcs = new SmithConstantCircle();

  private static validateReference(referenceImpedanceOhms: number): void {
    if (!Number.isFinite(referenceImpedanceOhms) || referenceImpedanceOhms <= 0) {
      throw new RangeError('Reference impedance must be positive and finite.');
    }
  }

  private static validateComplex(value: Complex): void {
    if (!Number.isFinite(value.re) || !Number.isFinite(value.im)) {
      throw new RangeError('Complex components must be finite.');
    }
  }

  private static finite(value: Complex | undefined): Complex | undefined {
    return value && Number.isFinite(value.re) && Number.isFinite(value.im) ? value : undefined;
  }

  /** Convert Γ to physical impedance in ohms; undefined at the open circuit Γ = 1. */
  public static reflectionToImpedance(
    gamma: Complex,
    referenceImpedanceOhms = 50,
  ): Complex | undefined {
    RfCalculations.validateReference(referenceImpedanceOhms);
    RfCalculations.validateComplex(gamma);
    return RfCalculations.finite(
      RfCalculations.calcs.rflCoeffToImpedance(gamma)?.mul(referenceImpedanceOhms),
    );
  }

  /** Convert physical impedance in ohms to Γ. Undefined for a singular result. */
  public static impedanceToReflection(
    impedanceOhms: Complex,
    referenceImpedanceOhms = 50,
  ): Complex | undefined {
    RfCalculations.validateReference(referenceImpedanceOhms);
    RfCalculations.validateComplex(impedanceOhms);
    return RfCalculations.finite(
      RfCalculations.calcs.impedanceToRflCoeff(impedanceOhms.div(referenceImpedanceOhms)),
    );
  }

  /** Convert Γ to physical admittance in siemens; undefined at the short circuit Γ = −1. */
  public static reflectionToAdmittance(
    gamma: Complex,
    referenceImpedanceOhms = 50,
  ): Complex | undefined {
    RfCalculations.validateReference(referenceImpedanceOhms);
    RfCalculations.validateComplex(gamma);
    return RfCalculations.finite(
      RfCalculations.calcs.rflCoeffToAdmittance(gamma)?.div(referenceImpedanceOhms),
    );
  }

  /** Convert physical admittance in siemens to Γ. Undefined for a singular result. */
  public static admittanceToReflection(
    admittanceSiemens: Complex,
    referenceImpedanceOhms = 50,
  ): Complex | undefined {
    RfCalculations.validateReference(referenceImpedanceOhms);
    RfCalculations.validateComplex(admittanceSiemens);
    return RfCalculations.finite(
      RfCalculations.calcs.admittanceToRflCoeff(admittanceSiemens.mul(referenceImpedanceOhms)),
    );
  }

  /**
   * Read Γ without a chart or DOM. Undefined means a singular or inapplicable quantity.
   * Passive-load quantities are undefined outside |Γ| ≤ 1; exact infinite limits are retained.
   * Attenuation assumes a fully reflecting termination and is half the return loss.
   */
  public static readReflection(gamma: Complex, referenceImpedanceOhms = 50): SmithReading {
    const impedanceOhms = RfCalculations.reflectionToImpedance(gamma, referenceImpedanceOhms);
    const admittanceSiemens = RfCalculations.reflectionToAdmittance(gamma, referenceImpedanceOhms);
    const magnitude = gamma.abs();
    const passive = magnitude <= 1;
    const returnLossDb = -20 * Math.log10(magnitude);
    const vswr = passive ? (1 + magnitude) / (1 - magnitude) : undefined;
    return {
      reflectionCoefficient: gamma,
      impedanceOhms,
      admittanceSiemens,
      phaseDegrees: magnitude === 0 ? undefined : (gamma.arg() * 180) / Math.PI,
      vswr,
      standingWaveRatioDb: vswr === undefined ? undefined : 20 * Math.log10(vswr),
      returnLossDb,
      reflectionLossDb: passive ? (-10 / Math.LN10) * Math.log1p(-(magnitude ** 2)) : undefined,
      attenuationDb: passive ? returnLossDb / 2 : undefined,
      q:
        impedanceOhms && (impedanceOhms.re !== 0 || impedanceOhms.im !== 0)
          ? Math.abs(impedanceOhms.im / impedanceOhms.re)
          : undefined,
      powerReflectionCoefficient: magnitude ** 2,
      voltageReflectionCoefficientMagnitude: magnitude,
      powerTransmissionCoefficient: passive ? 1 - magnitude ** 2 : undefined,
      voltageTransmissionCoefficientMagnitude: gamma.add(1).abs(),
      currentTransmissionCoefficientMagnitude: Complex.one().sub(gamma).abs(),
      standingWavePeak: vswr === undefined ? undefined : Math.sqrt(vswr),
      standingWaveLossCoefficient: passive
        ? (1 + magnitude ** 2) / (1 - magnitude ** 2)
        : undefined,
    };
  }

  /**
   * Change the positive real reference impedance of a voltage reflection coefficient.
   * Preserves physical impedance, including exact open/short limits. A singular or
   * unrepresentable result is undefined; non-finite inputs throw RangeError.
   */
  public static renormalizeReflection(
    gamma: Complex,
    fromOhms: number,
    toOhms: number,
  ): Complex | undefined {
    RfCalculations.validateReference(fromOhms);
    RfCalculations.validateReference(toOhms);
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
  public static renormalizeSamples(
    samples: TraceSamples,
    fromOhms: number,
    toOhms: number,
  ): TraceSamples {
    RfCalculations.validateReference(fromOhms);
    RfCalculations.validateReference(toOhms);
    return samples.map((sample, index) => {
      if (
        !Number.isFinite(sample.frequencyHz) ||
        sample.frequencyHz < 0 ||
        sample.reflectionCoefficient.length !== 2
      ) {
        throw new RangeError(`Invalid sample at index ${index}.`);
      }
      const gamma = RfCalculations.renormalizeReflection(
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

  /**
   * Convert reactance in ohms at a frequency in Hz to an ideal series L or C.
   * Zero frequency, zero reactance, or an unrepresentable component returns undefined.
   * Non-finite reactance and negative/non-finite frequency throw RangeError.
   */
  public static reactanceToComponent(
    reactanceOhms: number,
    frequencyHz: number,
  ): ReactiveComponent | undefined {
    if (!Number.isFinite(reactanceOhms)) {
      throw new RangeError('Reactance must be finite.');
    }
    if (!Number.isFinite(frequencyHz) || frequencyHz < 0) {
      throw new RangeError('Frequency must be finite and non-negative.');
    }
    if (frequencyHz === 0 || reactanceOhms === 0) {
      return;
    }
    // Compute in log space so intermediate products/quotients cannot overflow.
    const logReactance = Math.log(Math.abs(reactanceOhms));
    const logAngularFrequency = Math.log(2 * Math.PI) + Math.log(frequencyHz);
    const value = Math.exp(
      (reactanceOhms > 0 ? logReactance : -logReactance) - logAngularFrequency,
    );
    if (!Number.isFinite(value) || value === 0) {
      return;
    }
    return reactanceOhms > 0
      ? { kind: 'inductor', inductanceHenries: value }
      : { kind: 'capacitor', capacitanceFarads: value };
  }
}
