import { Complex } from './complex/Complex.js';
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

const calcs = new SmithConstantCircle();

function validateReference(referenceImpedanceOhms: number): void {
  if (!Number.isFinite(referenceImpedanceOhms) || referenceImpedanceOhms <= 0) {
    throw new RangeError('Reference impedance must be positive and finite.');
  }
}

function validateComplex(value: Complex): void {
  if (!Number.isFinite(value.re) || !Number.isFinite(value.im)) {
    throw new RangeError('Complex components must be finite.');
  }
}

function finite(value: Complex | undefined): Complex | undefined {
  return value && Number.isFinite(value.re) && Number.isFinite(value.im) ? value : undefined;
}

/** Convert Γ to physical impedance in ohms; undefined at the open circuit Γ = 1. */
export function reflectionToImpedance(
  gamma: Complex,
  referenceImpedanceOhms = 50,
): Complex | undefined {
  validateReference(referenceImpedanceOhms);
  validateComplex(gamma);
  return finite(calcs.rflCoeffToImpedance(gamma)?.mul(referenceImpedanceOhms));
}

/** Convert physical impedance in ohms to Γ. Undefined for a singular result. */
export function impedanceToReflection(
  impedanceOhms: Complex,
  referenceImpedanceOhms = 50,
): Complex | undefined {
  validateReference(referenceImpedanceOhms);
  validateComplex(impedanceOhms);
  return finite(calcs.impedanceToRflCoeff(impedanceOhms.div(referenceImpedanceOhms)));
}

/** Convert Γ to physical admittance in siemens; undefined at the short circuit Γ = −1. */
export function reflectionToAdmittance(
  gamma: Complex,
  referenceImpedanceOhms = 50,
): Complex | undefined {
  validateReference(referenceImpedanceOhms);
  validateComplex(gamma);
  return finite(calcs.rflCoeffToAdmittance(gamma)?.div(referenceImpedanceOhms));
}

/** Convert physical admittance in siemens to Γ. Undefined for a singular result. */
export function admittanceToReflection(
  admittanceSiemens: Complex,
  referenceImpedanceOhms = 50,
): Complex | undefined {
  validateReference(referenceImpedanceOhms);
  validateComplex(admittanceSiemens);
  return finite(calcs.admittanceToRflCoeff(admittanceSiemens.mul(referenceImpedanceOhms)));
}

/**
 * Read Γ without a chart or DOM. Undefined means a singular or inapplicable quantity.
 * Passive-load quantities are undefined outside |Γ| ≤ 1; exact infinite limits are retained.
 * Attenuation assumes a fully reflecting termination and is half the return loss.
 */
export function readReflection(gamma: Complex, referenceImpedanceOhms = 50): SmithReading {
  const impedanceOhms = reflectionToImpedance(gamma, referenceImpedanceOhms);
  const admittanceSiemens = reflectionToAdmittance(gamma, referenceImpedanceOhms);
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
    standingWaveLossCoefficient: passive ? (1 + magnitude ** 2) / (1 - magnitude ** 2) : undefined,
  };
}
