/** An ideal series component equivalent to a reactance at one frequency. */
export type ReactiveComponent =
  | { readonly kind: 'inductor'; readonly inductanceHenries: number }
  | { readonly kind: 'capacitor'; readonly capacitanceFarads: number };

/**
 * Convert reactance in ohms at a frequency in Hz to an ideal series L or C.
 * Zero frequency, zero reactance, or an unrepresentable component returns undefined.
 * Non-finite reactance and negative/non-finite frequency throw RangeError.
 */
export function reactanceToComponent(
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
  const value = Math.exp((reactanceOhms > 0 ? logReactance : -logReactance) - logAngularFrequency);
  if (!Number.isFinite(value) || value === 0) {
    return;
  }
  return reactanceOhms > 0
    ? { kind: 'inductor', inductanceHenries: value }
    : { kind: 'capacitor', capacitanceFarads: value };
}
