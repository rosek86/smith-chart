/** Shared lifecycle and style validation for chart layer adapters. */
export abstract class LayerControl {
  protected constructor(protected readonly assertAlive: () => void) {}

  protected validateLengths<T>(style: T, keys: readonly (keyof T)[]): void {
    for (const key of keys) {
      const value = style[key];
      if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      ) {
        throw new RangeError(`${String(key)} must be a positive finite number.`);
      }
    }
  }
}
