/** Shared lifecycle guard for chart layer adapters. */
export abstract class LayerControl {
  protected constructor(protected readonly assertAlive: () => void) {}
}
